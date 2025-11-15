// Main WebRTC Call Engine with Enterprise-Grade Features
import { VIDEO_QUALITY_PRESETS, RECONNECT_MAX_ATTEMPTS, RECONNECT_BASE_DELAY, RECONNECT_MAX_DELAY, BITRATE_ADAPTATION_INTERVAL, PACKET_LOSS_THRESHOLD, RTT_THRESHOLD, BANDWIDTH_SAFETY_MARGIN, MAX_PEERS_PER_ROOM } from './constants';
import { validateMediaConstraints, cleanupMediaStream, cleanupPeerConnection, exponentialBackoff, validateSignalMessage, generateSecureId } from './utils';
import { SignalingClient } from './SignalingClient';
import { TurnSelector } from './TurnSelector';
import { AudioDucker } from './AudioDucker';
import { StatsMonitor } from './StatsMonitor';
export class CallEngine {
    constructor(options) {
        this.peerConnections = new Map();
        this.iceCandidateQueues = new Map();
        this.localStream = null;
        this.screenStream = null;
        this.audioDucker = null;
        this.statsMonitors = new Map();
        this.eventHandlers = new Map();
        this.reconnectAttempts = new Map();
        this.bitrateAdaptationIntervals = new Map();
        this.lastBitrateAdjustment = new Map();
        this.isInitialized = false;
        this.cleanupTasks = [];
        this.negotiationStates = new Map();
        this.startTime = 0;
        this.errorCount = 0;
        this.MAX_ERROR_COUNT = 10;
        this.validateOptions(options);
        this.options = {
            videoQuality: 'medium',
            enableSVC: true,
            enableSimulcast: false,
            enableDTX: true,
            maxBandwidth: 5000,
            ...options,
        };
        this.callId = generateSecureId();
        // Initialize components with dependency injection
        this.signaling = new SignalingClient(options.supabaseUrl, options.supabaseKey, options.roomId, options.userId);
        this.turnSelector = new TurnSelector(options.turnServers);
        this.setupErrorHandling();
    }
    validateOptions(options) {
        if (!options) {
            throw new Error('CallEngineOptions is required');
        }
        const required = ['userId', 'roomId', 'supabaseUrl', 'supabaseKey', 'turnServers'];
        for (const field of required) {
            if (!options[field]) {
                throw new Error(`Missing required option: ${field}`);
            }
        }
        if (options.turnServers.length === 0) {
            throw new Error('At least one TURN server is required');
        }
        if (options.maxBandwidth && (options.maxBandwidth < 100 || options.maxBandwidth > 10000)) {
            throw new Error('maxBandwidth must be between 100 and 10000 kbps');
        }
    }
    setupErrorHandling() {
        // Global error handler for uncaught errors
        window.addEventListener('error', (event) => {
            if (this.isInitialized) {
                this.handleGlobalError(event.error);
            }
        });
        window.addEventListener('unhandledrejection', (event) => {
            if (this.isInitialized) {
                this.handleGlobalError(event.reason);
            }
        });
    }
    handleGlobalError(error) {
        this.errorCount++;
        if (this.errorCount > this.MAX_ERROR_COUNT) {
            console.error('Too many errors, stopping call engine');
            this.emit('error', {
                error: new Error('Maximum error count exceeded'),
                context: 'globalErrorLimit'
            });
            this.endCall().catch(console.error);
            return;
        }
        this.emit('error', {
            error: error instanceof Error ? error : new Error(String(error)),
            context: 'global'
        });
    }
    async init() {
        if (this.isInitialized) {
            console.warn('CallEngine already initialized');
            return;
        }
        try {
            await this.signaling.connect();
            const unsubSignal = this.signaling.onSignal(this.handleSignal.bind(this));
            const unsubPresence = this.signaling.onPresence(this.handlePresence.bind(this));
            this.cleanupTasks.push(unsubSignal, unsubPresence);
            this.isInitialized = true;
            this.startTime = Date.now();
            this.emit('engine:ready');
            console.log(`CallEngine initialized successfully for call ${this.callId}`);
        }
        catch (error) {
            const initError = error instanceof Error ? error : new Error('Initialization failed');
            this.emit('error', { error: initError, context: 'initialization' });
            throw initError;
        }
    }
    async startLocalMedia(constraints) {
        if (!this.isInitialized) {
            throw new Error('CallEngine not initialized');
        }
        try {
            if (!validateMediaConstraints(constraints)) {
                throw new Error('Invalid media constraints');
            }
            const preset = VIDEO_QUALITY_PRESETS[this.options.videoQuality];
            if (constraints.video && typeof constraints.video === 'object') {
                constraints.video = {
                    ...constraints.video,
                    width: { ideal: preset.width },
                    height: { ideal: preset.height },
                    frameRate: { ideal: preset.frameRate },
                };
            }
            // Enable DTX for audio
            if (constraints.audio && typeof constraints.audio === 'object' && this.options.enableDTX) {
                constraints.audio = {
                    ...constraints.audio,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                };
            }
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            // Add tracks to existing peer connections with proper encoding
            this.peerConnections.forEach((pc, peerId) => {
                this.localStream.getTracks().forEach((track) => {
                    const sender = pc.addTrack(track, this.localStream);
                    this.configureTrackEncoding(sender, track.kind);
                });
            });
            // Initialize audio ducker if we have both audio tracks
            if (this.localStream.getAudioTracks().length > 0) {
                this.audioDucker = new AudioDucker();
            }
            return this.localStream;
        }
        catch (error) {
            const mediaError = error instanceof Error ? error : new Error('Failed to get user media');
            this.emit('error', { error: mediaError, context: 'getUserMedia' });
            throw mediaError;
        }
    }
    configureTrackEncoding(sender, kind) {
        try {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
                params.encodings = [{}];
            }
            if (kind === 'video') {
                const preset = VIDEO_QUALITY_PRESETS[this.options.videoQuality];
                if (this.options.enableSimulcast && params.encodings.length < 3) {
                    // Configure simulcast layers for adaptive streaming
                    params.encodings = [
                        {
                            rid: 'h',
                            maxBitrate: preset.maxBitrate,
                            scaleResolutionDownBy: 1.0
                        },
                        {
                            rid: 'm',
                            maxBitrate: Math.floor(preset.maxBitrate * 0.5),
                            scaleResolutionDownBy: 2.0
                        },
                        {
                            rid: 'l',
                            maxBitrate: Math.floor(preset.maxBitrate * 0.2),
                            scaleResolutionDownBy: 4.0
                        },
                    ];
                }
                else if (this.options.enableSVC) {
                    // SVC (Scalable Video Coding) for VP9/AV1
                    params.encodings[0] = {
                        maxBitrate: preset.maxBitrate,
                    };
                }
                else {
                    // Single layer with adaptive bitrate
                    params.encodings[0] = {
                        maxBitrate: preset.maxBitrate,
                    };
                }
            }
            else if (kind === 'audio') {
                // Enable DTX (Discontinuous Transmission) for audio
                if (this.options.enableDTX) {
                    params.encodings[0] = {
                        ...params.encodings[0],
                        maxBitrate: 64000, // 64 kbps max for audio
                    };
                }
            }
            sender.setParameters(params).catch(error => {
                console.error('Failed to configure encoding:', error);
            });
        }
        catch (error) {
            console.error('Error configuring track encoding:', error);
        }
    }
    async startScreenShare(options) {
        if (!this.isInitialized) {
            throw new Error('CallEngine not initialized');
        }
        try {
            const constraints = {
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 },
                    ...(options?.video || {}),
                },
                audio: options?.audio || false,
                ...(options || {}),
            };
            this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
            // Handle screen share stop
            const screenTrack = this.screenStream.getVideoTracks()[0];
            if (screenTrack && screenTrack.addEventListener) {
                screenTrack.addEventListener('ended', () => {
                    this.stopScreenShare();
                });
            }
            // Add screen tracks to peer connections
            this.peerConnections.forEach(async (pc, peerId) => {
                this.screenStream.getTracks().forEach((track) => {
                    const sender = pc.addTrack(track, this.screenStream);
                    // Screen share always gets max quality
                    if (track.kind === 'video') {
                        this.configureScreenShareEncoding(sender);
                    }
                });
                // Trigger renegotiation
                await this.triggerNegotiation(peerId);
            });
            // Duck local mic audio when screen sharing with audio
            if (options?.audio && this.audioDucker) {
                this.audioDucker.manualDuck(0.3);
            }
            return this.screenStream;
        }
        catch (error) {
            const screenError = error instanceof Error ? error : new Error('Failed to get display media');
            this.emit('error', { error: screenError, context: 'getDisplayMedia' });
            throw screenError;
        }
    }
    configureScreenShareEncoding(sender) {
        try {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
                params.encodings = [{}];
            }
            // Screen share always gets max quality
            params.encodings[0].maxBitrate = 3000000; // 3 Mbps for screen
            sender.setParameters(params);
        }
        catch (error) {
            console.error('Error configuring screen share encoding:', error);
        }
    }
    stopScreenShare() {
        if (!this.screenStream) {
            return;
        }
        try {
            // Stop all tracks in the screen stream
            this.screenStream.getTracks().forEach(track => {
                try {
                    track.stop?.();
                }
                catch { }
            });
            // Remove screen tracks from peer connections
            this.peerConnections.forEach((pc) => {
                const senders = pc.getSenders();
                senders.forEach((sender) => {
                    if (this.screenStream?.getTracks().includes(sender.track)) {
                        pc.removeTrack(sender);
                    }
                });
            });
            cleanupMediaStream(this.screenStream);
            this.screenStream = null;
            // Restore audio
            if (this.audioDucker) {
                this.audioDucker.restore();
            }
        }
        catch (error) {
            console.error('Error stopping screen share:', error);
        }
    }
    async toggleMute(kind, mute) {
        if (!this.localStream) {
            return;
        }
        try {
            const tracks = kind === 'audio' ?
                this.localStream.getAudioTracks() :
                this.localStream.getVideoTracks();
            tracks.forEach((track) => {
                track.enabled = !mute;
            });
        }
        catch (error) {
            console.error('Error toggling mute:', error);
        }
    }
    async endCall() {
        try {
            const peerIds = Array.from(this.peerConnections.keys());
            // Send bye signals to all peers
            await Promise.all(peerIds.map((peerId) => this.signaling.sendSignal(peerId, 'bye', {}).catch((error) => {
                console.error(`Failed to send bye to ${peerId}:`, error);
            })));
            await this.cleanup();
            this.emit('engine:disconnected');
            console.log(`Call ${this.callId} ended successfully`);
        }
        catch (error) {
            console.error('Error ending call:', error);
            throw error;
        }
    }
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
        return () => {
            this.eventHandlers.get(event)?.delete(handler);
        };
    }
    emit(event, data) {
        this.eventHandlers.get(event)?.forEach((handler) => {
            try {
                handler(data);
            }
            catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
    async handleSignal(signal) {
        if (!validateSignalMessage(signal)) {
            console.warn('Invalid signal message received');
            return;
        }
        try {
            switch (signal.type) {
                case 'offer':
                    await this.handleOffer(signal);
                    break;
                case 'answer':
                    await this.handleAnswer(signal);
                    break;
                case 'ice-candidate':
                    await this.handleIceCandidate(signal);
                    break;
                case 'renegotiate':
                    await this.handleOffer(signal);
                    break;
                case 'bye':
                    await this.handleBye(signal);
                    break;
                default:
                    console.warn(`Unknown signal type: ${signal.type}`);
            }
        }
        catch (error) {
            const signalError = error instanceof Error ? error : new Error('Signal handling failed');
            this.emit('error', { error: signalError, context: `handleSignal:${signal.type}` });
        }
    }
    async handlePresence(event) {
        try {
            if (event.status === 'joined') {
                this.emit('peer:joined', { userId: event.userId });
                await this.createPeerConnection(event.userId, true);
            }
            else if (event.status === 'left') {
                this.emit('peer:left', { userId: event.userId });
                await this.closePeerConnection(event.userId);
            }
        }
        catch (error) {
            const presenceError = error instanceof Error ? error : new Error('Presence handling failed');
            this.emit('error', { error: presenceError, context: 'handlePresence' });
        }
    }
    async createPeerConnection(peerId, polite) {
        if (this.peerConnections.has(peerId)) {
            return this.peerConnections.get(peerId);
        }
        if (this.peerConnections.size >= MAX_PEERS_PER_ROOM) {
            throw new Error(`Maximum peers per room (${MAX_PEERS_PER_ROOM}) exceeded`);
        }
        try {
            const turnServer = await this.turnSelector.selectOptimalServer();
            const config = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    {
                        urls: turnServer.urls,
                        username: turnServer.username,
                        credential: turnServer.credential,
                    },
                ],
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require',
            };
            const pc = new RTCPeerConnection(config);
            this.peerConnections.set(peerId, pc);
            this.iceCandidateQueues.set(peerId, []);
            this.negotiationStates.set(peerId, { makingOffer: false, ignoreOffer: false });
            // Add local tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach((track) => {
                    const sender = pc.addTrack(track, this.localStream);
                    this.configureTrackEncoding(sender, track.kind);
                });
            }
            // Add screen share tracks if active
            if (this.screenStream) {
                this.screenStream.getTracks().forEach((track) => {
                    const sender = pc.addTrack(track, this.screenStream);
                    if (track.kind === 'video') {
                        this.configureScreenShareEncoding(sender);
                    }
                });
            }
            this.setupPeerConnectionHandlers(pc, peerId, polite);
            // Start stats monitor
            const monitor = new StatsMonitor(pc, (stats) => {
                this.emit('stats:update', stats);
                this.adaptiveBitrateControl(pc, peerId, stats);
            });
            monitor.start();
            this.statsMonitors.set(peerId, monitor);
            // Start adaptive bitrate control
            this.startBitrateAdaptation(peerId);
            return pc;
        }
        catch (error) {
            const pcError = error instanceof Error ? error : new Error('Failed to create peer connection');
            this.emit('error', { error: pcError, context: 'createPeerConnection' });
            throw pcError;
        }
    }
    setupPeerConnectionHandlers(pc, peerId, polite) {
        const state = this.negotiationStates.get(peerId);
        // ICE candidate handler
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                this.signaling.sendSignal(peerId, 'ice-candidate', candidate.toJSON()).catch((error) => {
                    this.emit('error', { error, context: 'sendIceCandidate' });
                });
            }
        };
        // Track handler
        pc.ontrack = ({ track, streams }) => {
            this.emit('track:added', { track, stream: streams[0], userId: peerId });
            track.onended = () => {
                this.emit('track:removed', { trackId: track.id, userId: peerId });
            };
        };
        // Perfect negotiation pattern
        pc.onnegotiationneeded = async () => {
            try {
                state.makingOffer = true;
                await pc.setLocalDescription();
                await this.signaling.sendSignal(peerId, 'offer', pc.localDescription);
            }
            catch (error) {
                const negotiationError = error instanceof Error ? error : new Error('Negotiation failed');
                this.emit('error', { error: negotiationError, context: 'negotiation' });
            }
            finally {
                state.makingOffer = false;
            }
        };
        // Connection state handler
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') {
                this.handleConnectionFailure(peerId);
            }
            else if (pc.connectionState === 'disconnected') {
                this.scheduleReconnect(peerId);
            }
            else if (pc.connectionState === 'connected') {
                this.reconnectAttempts.delete(peerId);
            }
        };
        // ICE connection state handler
        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed') {
                this.handleIceFailure(peerId);
            }
        };
    }
    async handleOffer(signal) {
        const peerId = signal.from;
        let pc = this.peerConnections.get(peerId);
        if (!pc) {
            pc = await this.createPeerConnection(peerId, false);
        }
        const state = this.negotiationStates.get(peerId);
        const offerCollision = (signal.type === 'offer') &&
            (state.makingOffer || pc.signalingState !== 'stable');
        state.ignoreOffer = !this.isPolite(peerId) && offerCollision;
        if (state.ignoreOffer) {
            return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
        // Process queued ICE candidates
        const queue = this.iceCandidateQueues.get(peerId) || [];
        while (queue.length > 0) {
            const candidate = queue.shift();
            try {
                await pc.addIceCandidate(candidate);
            }
            catch (error) {
                console.error('Failed to add queued ICE candidate:', error);
            }
        }
        if (signal.type === 'offer') {
            await pc.setLocalDescription();
            await this.signaling.sendSignal(peerId, 'answer', pc.localDescription);
        }
    }
    async handleAnswer(signal) {
        const pc = this.peerConnections.get(signal.from);
        if (!pc) {
            console.warn('Received answer for unknown peer:', signal.from);
            return;
        }
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
            // Process queued ICE candidates
            const queue = this.iceCandidateQueues.get(signal.from) || [];
            while (queue.length > 0) {
                const candidate = queue.shift();
                await pc.addIceCandidate(candidate);
            }
        }
        catch (error) {
            const answerError = error instanceof Error ? error : new Error('Failed to handle answer');
            this.emit('error', { error: answerError, context: 'handleAnswer' });
        }
    }
    async handleIceCandidate(signal) {
        const pc = this.peerConnections.get(signal.from);
        if (!pc) {
            console.warn('Received ICE candidate for unknown peer:', signal.from);
            return;
        }
        try {
            // Queue candidates if remote description not set
            if (!pc.remoteDescription || !pc.remoteDescription.type) {
                this.iceCandidateQueues.get(signal.from)?.push(signal.data);
                return;
            }
            await pc.addIceCandidate(new RTCIceCandidate(signal.data));
        }
        catch (error) {
            if (pc.remoteDescription) {
                const iceError = error instanceof Error ? error : new Error('Failed to add ICE candidate');
                this.emit('error', { error: iceError, context: 'addIceCandidate' });
            }
        }
    }
    async handleBye(signal) {
        await this.closePeerConnection(signal.from);
        this.emit('peer:left', { userId: signal.from });
    }
    async triggerNegotiation(peerId) {
        const pc = this.peerConnections.get(peerId);
        if (!pc) {
            return;
        }
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await this.signaling.sendSignal(peerId, 'offer', pc.localDescription);
        }
        catch (error) {
            const negotiationError = error instanceof Error ? error : new Error('Failed to trigger negotiation');
            this.emit('error', { error: negotiationError, context: 'triggerNegotiation' });
        }
    }
    isPolite(peerId) {
        // Determine politeness based on user ID comparison
        return this.options.userId < peerId;
    }
    startBitrateAdaptation(peerId) {
        // Clear any existing interval
        const existingInterval = this.bitrateAdaptationIntervals.get(peerId);
        if (existingInterval) {
            clearInterval(existingInterval);
        }
        const interval = window.setInterval(() => {
            const pc = this.peerConnections.get(peerId);
            if (!pc || pc.connectionState !== 'connected') {
                this.stopBitrateAdaptation(peerId);
                return;
            }
        }, BITRATE_ADAPTATION_INTERVAL);
        this.bitrateAdaptationIntervals.set(peerId, interval);
    }
    stopBitrateAdaptation(peerId) {
        const interval = this.bitrateAdaptationIntervals.get(peerId);
        if (interval) {
            clearInterval(interval);
            this.bitrateAdaptationIntervals.delete(peerId);
        }
        this.lastBitrateAdjustment.delete(peerId);
    }
    adaptiveBitrateControl(pc, peerId, stats) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (!sender || !sender.track) {
            return;
        }
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
            return;
        }
        const preset = VIDEO_QUALITY_PRESETS[this.options.videoQuality];
        const now = Date.now();
        const lastAdjustment = this.lastBitrateAdjustment.get(peerId) || 0;
        // Rate limit adjustments (every 2 seconds minimum)
        if (now - lastAdjustment < BITRATE_ADAPTATION_INTERVAL) {
            return;
        }
        const currentBitrate = stats.bitrate.video.send;
        const availableBandwidth = stats.bandwidth.available * BANDWIDTH_SAFETY_MARGIN;
        const packetLossRate = stats.packetLoss / (stats.packetLoss + 100); // Approximate
        const rtt = stats.rtt;
        let targetBitrate = currentBitrate;
        // Critical conditions - reduce aggressively
        if (packetLossRate > PACKET_LOSS_THRESHOLD) {
            targetBitrate = Math.floor(currentBitrate * 0.7);
            this.emit('bandwidth:warning', {
                available: availableBandwidth,
                required: currentBitrate
            });
        }
        // High RTT - reduce moderately
        else if (rtt > RTT_THRESHOLD) {
            targetBitrate = Math.floor(currentBitrate * 0.85);
        }
        // Good conditions - increase gradually
        else if (packetLossRate < 0.01 && rtt < 150 && availableBandwidth > currentBitrate * 1.5) {
            targetBitrate = Math.min(Math.floor(currentBitrate * 1.1), preset.maxBitrate);
        }
        // Bandwidth constrained - match available
        else if (availableBandwidth < currentBitrate) {
            targetBitrate = Math.floor(availableBandwidth * 0.85);
        }
        // Clamp to preset bounds
        targetBitrate = Math.max(preset.minBitrate, Math.min(targetBitrate, preset.maxBitrate));
        // Apply with hysteresis (only if change > 10%)
        const changeRatio = Math.abs(targetBitrate - currentBitrate) / currentBitrate;
        if (changeRatio > 0.1) {
            params.encodings.forEach(encoding => {
                encoding.maxBitrate = targetBitrate;
            });
            sender.setParameters(params).catch((error) => {
                console.error('Failed to adapt bitrate:', error);
            });
            this.lastBitrateAdjustment.set(peerId, now);
        }
    }
    handleConnectionFailure(peerId) {
        this.emit('error', {
            error: new Error(`Connection failed for peer ${peerId}`),
            context: 'connectionState',
        });
        this.scheduleReconnect(peerId);
    }
    handleIceFailure(peerId) {
        this.emit('error', {
            error: new Error(`ICE connection failed for peer ${peerId}`),
            context: 'iceConnectionState',
        });
        const pc = this.peerConnections.get(peerId);
        if (pc) {
            const currentConfig = pc.getConfiguration();
            const currentTurn = currentConfig.iceServers?.find((s) => s.urls.toString().includes('turn'));
            if (currentTurn) {
                const nextTurn = this.turnSelector.getNextFallback(currentTurn);
                if (nextTurn) {
                    this.restartIceWithNewTurn(peerId, nextTurn);
                    return;
                }
            }
        }
        this.scheduleReconnect(peerId);
    }
    scheduleReconnect(peerId) {
        const attempts = this.reconnectAttempts.get(peerId) || 0;
        if (attempts >= RECONNECT_MAX_ATTEMPTS) {
            this.emit('reconnect:failed');
            this.closePeerConnection(peerId);
            return;
        }
        this.reconnectAttempts.set(peerId, attempts + 1);
        this.emit('reconnect:attempt', { attempt: attempts + 1 });
        const delay = exponentialBackoff(attempts, RECONNECT_BASE_DELAY, RECONNECT_MAX_DELAY);
        setTimeout(async () => {
            const pc = this.peerConnections.get(peerId);
            if (pc && pc.connectionState !== 'connected') {
                await this.restartIce(peerId);
            }
        }, delay);
    }
    async restartIce(peerId) {
        const pc = this.peerConnections.get(peerId);
        if (!pc) {
            return;
        }
        try {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            await this.signaling.sendSignal(peerId, 'offer', offer);
        }
        catch (error) {
            const restartError = error instanceof Error ? error : new Error('ICE restart failed');
            this.emit('error', { error: restartError, context: 'iceRestart' });
        }
    }
    async restartIceWithNewTurn(peerId, turnServer) {
        const pc = this.peerConnections.get(peerId);
        if (!pc) {
            return;
        }
        try {
            const config = pc.getConfiguration();
            config.iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                    urls: turnServer.urls,
                    username: turnServer.username,
                    credential: turnServer.credential,
                },
            ];
            pc.setConfiguration(config);
            await this.restartIce(peerId);
        }
        catch (error) {
            const restartError = error instanceof Error ? error : new Error('TURN restart failed');
            this.emit('error', { error: restartError, context: 'turnRestart' });
        }
    }
    async closePeerConnection(peerId) {
        // Stop stats monitor first
        const monitor = this.statsMonitors.get(peerId);
        if (monitor) {
            monitor.stop();
            this.statsMonitors.delete(peerId);
        }
        // Stop bitrate adaptation
        this.stopBitrateAdaptation(peerId);
        // Clear ICE candidate queue
        this.iceCandidateQueues.delete(peerId);
        // Clear negotiation state
        this.negotiationStates.delete(peerId);
        // Cleanup peer connection
        const pc = this.peerConnections.get(peerId);
        if (pc) {
            cleanupPeerConnection(pc);
            this.peerConnections.delete(peerId);
        }
        this.reconnectAttempts.delete(peerId);
    }
    async cleanup() {
        // Stop all bitrate adaptation intervals
        this.bitrateAdaptationIntervals.forEach((interval) => {
            clearInterval(interval);
        });
        this.bitrateAdaptationIntervals.clear();
        // Stop all stats monitors
        this.statsMonitors.forEach((monitor) => monitor.stop());
        this.statsMonitors.clear();
        // Close all peer connections
        const peerIds = Array.from(this.peerConnections.keys());
        await Promise.all(peerIds.map((peerId) => this.closePeerConnection(peerId)));
        // Cleanup local media
        if (this.localStream) {
            cleanupMediaStream(this.localStream);
            // Use Object.defineProperty to bypass TypeScript restrictions
            Object.defineProperty(this, 'localStream', {
                value: null,
                writable: true,
                configurable: true
            });
        }
        // Cleanup screen share
        if (this.screenStream) {
            cleanupMediaStream(this.screenStream);
            // Use Object.defineProperty to bypass TypeScript restrictions
            Object.defineProperty(this, 'screenStream', {
                value: null,
                writable: true,
                configurable: true
            });
        }
        // Cleanup audio ducker
        if (this.audioDucker) {
            this.audioDucker.cleanup();
            this.audioDucker = null;
        }
        // Disconnect signaling
        if (this.signaling && typeof this.signaling.disconnect === 'function') {
            await this.signaling.disconnect();
        }
        // Execute cleanup tasks
        this.cleanupTasks.forEach((task) => {
            try {
                task();
            }
            catch (error) {
                console.error('Cleanup task failed:', error);
            }
        });
        this.cleanupTasks = [];
        // Clear all state
        this.eventHandlers.clear();
        this.reconnectAttempts.clear();
        this.iceCandidateQueues.clear();
        this.negotiationStates.clear();
        this.lastBitrateAdjustment.clear();
        this.isInitialized = false;
        console.log(`CallEngine cleanup completed for call ${this.callId}`);
    }
    // Public API methods
    getCallId() {
        return this.callId;
    }
    getCallDuration() {
        return this.startTime ? Date.now() - this.startTime : 0;
    }
    getPeerCount() {
        return this.peerConnections.size;
    }
    getConnectionStates() {
        const states = {};
        this.peerConnections.forEach((pc, peerId) => {
            states[peerId] = pc.connectionState;
        });
        return states;
    }
    getStats() {
        return {
            callId: this.callId,
            startTime: this.startTime,
            duration: this.getCallDuration(),
            peerCount: this.getPeerCount(),
            errorCount: this.errorCount,
            connectionStates: this.getConnectionStates(),
            localStream: this.localStream ? {
                audioTracks: this.localStream.getAudioTracks().length,
                videoTracks: this.localStream.getVideoTracks().length
            } : null,
            screenStream: this.screenStream ? {
                videoTracks: this.screenStream.getVideoTracks().length
            } : null
        };
    }
}
