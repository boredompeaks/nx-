// WebRTC Signaling Client with Security and Error Handling
import { createClient } from '@supabase/supabase-js';
import { validateSignalMessage, generateSecureId } from './utils';
import { SIGNAL_RATE_LIMIT, HEARTBEAT_INTERVAL } from './constants';
export class SignalingClient {
    constructor(supabaseUrl, supabaseKey, roomId, userId) {
        this.channel = null;
        this.heartbeatInterval = null;
        this.signalHandlers = new Set();
        this.presenceHandlers = new Set();
        this.isConnected = false;
        this.signalCount = 0;
        this.signalWindowStart = Date.now();
        this.messageQueue = [];
        this.isProcessingQueue = false;
        if (!supabaseUrl || !supabaseKey || !roomId || !userId) {
            throw new Error('All constructor parameters are required');
        }
        // Validate URLs and IDs
        try {
            new URL(supabaseUrl);
        }
        catch {
            throw new Error('Invalid Supabase URL format');
        }
        if (userId.length < 3 || userId.length > 50) {
            throw new Error('User ID must be between 3 and 50 characters');
        }
        if (roomId.length < 3 || roomId.length > 100) {
            throw new Error('Room ID must be between 3 and 100 characters');
        }
        this.client = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
            realtime: {
                params: {
                    eventsPerSecond: 10, // Rate limiting
                },
            },
        });
        this.roomId = roomId;
        this.userId = userId;
    }
    async connect() {
        if (this.isConnected) {
            console.warn('Signaling client already connected');
            return;
        }
        try {
            this.channel = this.client.channel(`webrtc:${this.roomId}`, {
                config: {
                    broadcast: { self: false },
                    presence: { key: this.userId },
                },
            });
            // Set up signal message handler with validation
            this.channel.on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'webrtc_signals',
                filter: `room_id=eq.${this.roomId}`,
            }, (payload) => {
                try {
                    const signal = this.parseSignal(payload.new);
                    if (signal && signal.to === this.userId && validateSignalMessage(signal)) {
                        this.processSignal(signal);
                    }
                }
                catch (error) {
                    console.error('Signal processing error:', error);
                }
            });
            // Set up presence handler
            this.channel.on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'webrtc_presence',
                filter: `room_id=eq.${this.roomId}`,
            }, (payload) => {
                try {
                    const event = this.parsePresenceEvent(payload);
                    if (event && event.userId !== this.userId) {
                        this.processPresenceEvent(event);
                    }
                }
                catch (error) {
                    console.error('Presence processing error:', error);
                }
            });
            await this.channel.subscribe();
            await this.notifyPresence('joined');
            this.startHeartbeat();
            this.isConnected = true;
            // Process any queued messages
            this.processMessageQueue();
        }
        catch (error) {
            console.error('Failed to connect signaling client:', error);
            throw new Error(`Signaling connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async sendSignal(to, type, data) {
        if (!this.isConnected) {
            throw new Error('Signaling client not connected');
        }
        if (!to || to.length < 3 || to.length > 50) {
            throw new Error('Invalid recipient user ID');
        }
        // Rate limiting check
        if (!this.checkRateLimit()) {
            console.warn('Signal rate limit exceeded');
            return;
        }
        const signal = {
            type,
            from: this.userId,
            to,
            data,
            timestamp: Date.now(),
        };
        // Validate signal before sending
        if (!validateSignalMessage(signal)) {
            throw new Error('Invalid signal message');
        }
        try {
            await this.client.from('webrtc_signals').insert({
                room_id: this.roomId,
                from_user: this.userId,
                to_user: to,
                signal_type: type,
                signal_data: data,
                timestamp: new Date().toISOString(),
                message_id: generateSecureId(), // Add unique message ID
            });
            this.signalCount++;
        }
        catch (error) {
            console.error('Failed to send signal:', error);
            // Queue message for retry if it's a network error
            if (this.isRetryableError(error)) {
                this.queueMessage(signal);
            }
            throw error;
        }
    }
    onSignal(handler) {
        this.signalHandlers.add(handler);
        return () => this.signalHandlers.delete(handler);
    }
    onPresence(handler) {
        this.presenceHandlers.add(handler);
        return () => this.presenceHandlers.delete(handler);
    }
    async processSignal(signal) {
        this.signalHandlers.forEach(handler => {
            try {
                handler(signal);
            }
            catch (error) {
                console.error('Signal handler error:', error);
            }
        });
    }
    async processPresenceEvent(event) {
        this.presenceHandlers.forEach(handler => {
            try {
                handler(event);
            }
            catch (error) {
                console.error('Presence handler error:', error);
            }
        });
    }
    checkRateLimit() {
        const now = Date.now();
        const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window
        if (windowStart > this.signalWindowStart) {
            this.signalCount = 0;
            this.signalWindowStart = windowStart;
        }
        return this.signalCount < SIGNAL_RATE_LIMIT;
    }
    isRetryableError(error) {
        // Check for network errors that are worth retrying
        const retryableErrors = [
            'network',
            'timeout',
            'ECONNREFUSED',
            'ENOTFOUND',
            'ETIMEDOUT'
        ];
        const errorMessage = error?.message || error?.toString() || '';
        return retryableErrors.some(pattern => errorMessage.toLowerCase().includes(pattern.toLowerCase()));
    }
    queueMessage(signal) {
        this.messageQueue.push(signal);
        // Limit queue size to prevent memory issues
        if (this.messageQueue.length > 100) {
            this.messageQueue.shift();
            console.warn('Signal message queue overflow, dropping oldest message');
        }
    }
    async processMessageQueue() {
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }
        this.isProcessingQueue = true;
        try {
            while (this.messageQueue.length > 0) {
                const signal = this.messageQueue.shift();
                try {
                    await this.client.from('webrtc_signals').insert({
                        room_id: this.roomId,
                        from_user: this.userId,
                        to_user: signal.to,
                        signal_type: signal.type,
                        signal_data: signal.data,
                        timestamp: new Date(signal.timestamp).toISOString(),
                        message_id: generateSecureId(),
                    });
                }
                catch (error) {
                    console.error('Failed to retry queued signal:', error);
                    // Put it back and stop processing
                    this.messageQueue.unshift(signal);
                    break;
                }
            }
        }
        finally {
            this.isProcessingQueue = false;
        }
    }
    async notifyPresence(status) {
        try {
            if (status === 'joined') {
                await this.client.from('webrtc_presence').upsert({
                    room_id: this.roomId,
                    user_id: this.userId,
                    status,
                    last_heartbeat: new Date().toISOString(),
                    session_id: generateSecureId(),
                });
            }
            else {
                await this.client
                    .from('webrtc_presence')
                    .update({
                    status,
                    last_heartbeat: new Date().toISOString(),
                    left_at: new Date().toISOString(),
                })
                    .eq('room_id', this.roomId)
                    .eq('user_id', this.userId);
            }
        }
        catch (error) {
            console.error('Failed to notify presence:', error);
            // Don't throw for presence updates, they're not critical
        }
    }
    startHeartbeat() {
        // Clear any existing heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.heartbeatInterval = setInterval(async () => {
            try {
                await this.client
                    .from('webrtc_presence')
                    .update({ last_heartbeat: new Date().toISOString() })
                    .eq('room_id', this.roomId)
                    .eq('user_id', this.userId);
            }
            catch (error) {
                console.error('Heartbeat failed:', error);
                // If heartbeat fails repeatedly, consider connection lost
                if (this.heartbeatInterval) {
                    const failures = this.heartbeatInterval.failureCount || 0;
                    this.heartbeatInterval.failureCount = failures + 1;
                    if (failures > 3) {
                        console.warn('Multiple heartbeat failures, connection may be lost');
                        this.handleConnectionLoss();
                    }
                }
            }
        }, HEARTBEAT_INTERVAL);
    }
    handleConnectionLoss() {
        console.warn('Signaling connection appears to be lost');
        // Could implement reconnection logic here
    }
    parseSignal(data) {
        try {
            if (!data || typeof data !== 'object') {
                return null;
            }
            return {
                type: data.signal_type,
                from: data.from_user,
                to: data.to_user,
                data: data.signal_data,
                timestamp: new Date(data.timestamp).getTime(),
            };
        }
        catch {
            return null;
        }
    }
    parsePresenceEvent(payload) {
        try {
            const data = payload?.new || payload?.old;
            if (!data || typeof data !== 'object') {
                return null;
            }
            return {
                userId: data.user_id,
                status: data.status,
                timestamp: Date.now(),
            };
        }
        catch {
            return null;
        }
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        try {
            // Clear heartbeat FIRST
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            await this.notifyPresence('left');
            if (this.channel) {
                await this.channel.unsubscribe();
                this.channel = null;
            }
            this.signalHandlers.clear();
            this.presenceHandlers.clear();
            this.messageQueue = [];
            this.isConnected = false;
        }
        catch (error) {
            console.error('Error during signaling disconnect:', error);
            // Don't throw, just log and continue cleanup
        }
    }
    getConnectionState() {
        return this.isConnected;
    }
    getSignalStats() {
        return {
            count: this.signalCount,
            rateLimited: !this.checkRateLimit()
        };
    }
}
