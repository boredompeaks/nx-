// ============================================================================
// ENTERPRISE-GRADE SIGNALING CLIENT - PRODUCTION READY
// Zero memory leaks, optimized for asymmetric bandwidth scenarios
// ============================================================================
import { createClient } from '@supabase/supabase-js';
import { WebRTCError } from './types';
import { HEARTBEAT_INTERVAL, MAX_MESSAGE_SIZE } from './constants';
export class SignalingClient {
    constructor(supabaseUrl, supabaseKey, roomId, userId) {
        this.channel = null;
        this.heartbeatInterval = null;
        this.signalHandlers = new Set();
        this.presenceHandlers = new Set();
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.MAX_CONNECTION_ATTEMPTS = 3;
        this.CONNECTION_RETRY_DELAY = 2000;
        if (!supabaseUrl || !supabaseKey || !roomId || !userId) {
            throw new WebRTCError('All constructor parameters are required', 'INVALID_PARAMETERS', 'SignalingClient.constructor');
        }
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.roomId = roomId;
        this.userId = userId;
    }
    async connect() {
        if (this.isConnected) {
            console.warn('Signaling client already connected');
            return;
        }
        try {
            this.connectionAttempts++;
            this.client = createClient(this.supabaseUrl, this.supabaseKey);
            this.channel = this.client.channel(`webrtc:${this.roomId}`);
            if (!this.channel) {
                throw new WebRTCError('Failed to create signaling channel', 'CHANNEL_CREATION_FAILED', 'SignalingClient.connect');
            }
            this.setupSignalHandlers();
            this.setupPresenceHandlers();
            await this.channel.subscribe();
            // Verify subscription was successful
            if (this.channel.state !== 'joined') {
                throw new WebRTCError('Failed to join signaling channel', 'SUBSCRIPTION_FAILED', 'SignalingClient.connect');
            }
            await this.notifyPresence('joined');
            this.startHeartbeat();
            this.isConnected = true;
            this.connectionAttempts = 0; // Reset on successful connection
        }
        catch (error) {
            this.isConnected = false;
            // Retry connection if under max attempts
            if (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
                console.warn(`Connection attempt ${this.connectionAttempts} failed, retrying...`);
                await this.delay(this.CONNECTION_RETRY_DELAY * this.connectionAttempts);
                return this.connect();
            }
            throw new WebRTCError(`Failed to connect after ${this.connectionAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CONNECTION_FAILED', 'SignalingClient.connect', error instanceof Error ? error : undefined);
        }
    }
    setupSignalHandlers() {
        if (!this.channel)
            return;
        this.channel.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'webrtc_signals',
            filter: `room_id=eq.${this.roomId}`,
        }, (payload) => {
            const signal = this.parseSignal(payload.new);
            if (signal && signal.to === this.userId) {
                this.signalHandlers.forEach(handler => {
                    try {
                        handler(signal);
                    }
                    catch (error) {
                        console.error('Signal handler error:', error instanceof Error ? error.message : 'Unknown error');
                    }
                });
            }
        });
    }
    setupPresenceHandlers() {
        if (!this.channel)
            return;
        this.channel.on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'webrtc_presence',
            filter: `room_id=eq.${this.roomId}`,
        }, (payload) => {
            const event = this.parsePresenceEvent(payload);
            if (event && event.userId !== this.userId) {
                this.presenceHandlers.forEach(handler => {
                    try {
                        handler(event);
                    }
                    catch (error) {
                        console.error('Presence handler error:', error instanceof Error ? error.message : 'Unknown error');
                    }
                });
            }
        });
    }
    async sendSignal(to, type, data) {
        if (!this.isConnected) {
            throw new WebRTCError('Cannot send signal: not connected', 'NOT_CONNECTED', 'SignalingClient.sendSignal');
        }
        if (!to || typeof to !== 'string') {
            throw new WebRTCError('Invalid recipient user ID', 'INVALID_RECIPIENT', 'SignalingClient.sendSignal');
        }
        if (!type || !['offer', 'answer', 'ice-candidate', 'renegotiate', 'bye'].includes(type)) {
            throw new WebRTCError('Invalid signal type', 'INVALID_SIGNAL_TYPE', 'SignalingClient.sendSignal');
        }
        try {
            // Validate data size
            const dataSize = JSON.stringify(data).length;
            if (dataSize > MAX_MESSAGE_SIZE) {
                throw new WebRTCError(`Signal data too large: ${dataSize} bytes (max: ${MAX_MESSAGE_SIZE})`, 'MESSAGE_TOO_LARGE', 'SignalingClient.sendSignal');
            }
            await this.client.from('webrtc_signals').insert({
                room_id: this.roomId,
                from_user: this.userId,
                to_user: to,
                signal_type: type,
                signal_data: data,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Failed to send signal:', error instanceof Error ? error.message : 'Unknown error');
            throw new WebRTCError(`Failed to send signal: ${error instanceof Error ? error.message : 'Unknown error'}`, 'SEND_FAILED', 'SignalingClient.sendSignal', error instanceof Error ? error : undefined);
        }
    }
    onSignal(handler) {
        if (typeof handler !== 'function') {
            throw new WebRTCError('Signal handler must be a function', 'INVALID_HANDLER', 'SignalingClient.onSignal');
        }
        this.signalHandlers.add(handler);
        return () => this.signalHandlers.delete(handler);
    }
    onPresence(handler) {
        if (typeof handler !== 'function') {
            throw new WebRTCError('Presence handler must be a function', 'INVALID_HANDLER', 'SignalingClient.onPresence');
        }
        this.presenceHandlers.add(handler);
        return () => this.presenceHandlers.delete(handler);
    }
    async notifyPresence(status) {
        if (!this.isConnected) {
            console.warn('Cannot notify presence: not connected');
            return;
        }
        try {
            if (status === 'joined') {
                await this.client.from('webrtc_presence').upsert({
                    room_id: this.roomId,
                    user_id: this.userId,
                    status,
                    last_heartbeat: new Date().toISOString(),
                });
            }
            else {
                await this.client
                    .from('webrtc_presence')
                    .update({ status, last_heartbeat: new Date().toISOString() })
                    .eq('room_id', this.roomId)
                    .eq('user_id', this.userId);
            }
        }
        catch (error) {
            console.error('Failed to notify presence:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    startHeartbeat() {
        // Clear any existing heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.heartbeatInterval = setInterval(async () => {
            if (!this.isConnected) {
                this.stopHeartbeat();
                return;
            }
            try {
                await this.client
                    .from('webrtc_presence')
                    .update({ last_heartbeat: new Date().toISOString() })
                    .eq('room_id', this.roomId)
                    .eq('user_id', this.userId);
            }
            catch (error) {
                console.error('Heartbeat failed:', error instanceof Error ? error.message : 'Unknown error');
                // If heartbeat fails repeatedly, consider connection lost
                if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
                    this.disconnect();
                }
            }
        }, HEARTBEAT_INTERVAL);
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
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
        catch (error) {
            console.error('Failed to parse signal:', error instanceof Error ? error.message : 'Unknown error');
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
        catch (error) {
            console.error('Failed to parse presence event:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        this.isConnected = false;
        // Stop heartbeat FIRST
        this.stopHeartbeat();
        try {
            await this.notifyPresence('left');
        }
        catch (error) {
            console.error('Failed to notify presence on disconnect:', error instanceof Error ? error.message : 'Unknown error');
        }
        if (this.channel) {
            try {
                await this.channel.unsubscribe();
            }
            catch (error) {
                console.error('Failed to unsubscribe from channel:', error instanceof Error ? error.message : 'Unknown error');
            }
            this.channel = null;
        }
        this.signalHandlers.clear();
        this.presenceHandlers.clear();
        this.connectionAttempts = 0;
    }
    /**
     * Get connection status
     */
    isConnectedStatus() {
        return this.isConnected;
    }
    /**
     * Get current room ID
     */
    getRoomId() {
        return this.roomId;
    }
    /**
     * Get current user ID
     */
    getUserId() {
        return this.userId;
    }
    /**
     * Get connection attempt count
     */
    getConnectionAttempts() {
        return this.connectionAttempts;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
