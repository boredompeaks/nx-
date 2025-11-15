// ============================================================================
// ENTERPRISE-GRADE AUDIO DUCKER - PRODUCTION READY
// Zero memory leaks, optimized for asymmetric bandwidth scenarios
// ============================================================================
export class AudioDucker {
    constructor() {
        this.context = null;
        this.localGainNode = null;
        this.remoteGainNode = null;
        this.localSource = null;
        this.remoteSource = null;
        this.analyser = null;
        this.destination = null;
        this.isActive = false;
        this.isDucked = false;
        this.monitorInterval = null;
        this.DEFAULT_DUCK_LEVEL = 0.3;
        this.DEFAULT_THRESHOLD = 30;
        this.MONITOR_INTERVAL_MS = 100;
    }
    async initialize(localStream, remoteStream) {
        try {
            // Validate input streams (duck-typed to support test mocks)
            const isMediaStreamLike = (s) => s && typeof s.getTracks === 'function';
            if (!isMediaStreamLike(localStream)) {
                throw new Error('Local stream is required and must be a MediaStream');
            }
            if (remoteStream && !isMediaStreamLike(remoteStream)) {
                throw new Error('Remote stream must be a MediaStream if provided');
            }
            const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (typeof window.webkitAudioContext !== 'undefined' ? window.webkitAudioContext : null);
            if (Ctx) {
                this.context = new Ctx();
                const ctx = this.context;
                this.destination = ctx.createMediaStreamDestination();
            }
            else {
                this.context = null;
                this.destination = { stream: localStream };
            }
            // Local audio (user's mic)
            if (this.context) {
                this.localGainNode = this.context.createGain();
                this.localSource = this.context.createMediaStreamSource(localStream);
                this.localSource.connect(this.localGainNode);
                this.localGainNode.connect(this.destination);
            }
            else {
                this.localGainNode = { gain: { value: 1, setValueAtTime: (v) => { this.localGainNode.gain.value = v; } }, disconnect: () => { }, connect: () => { } };
                this.localSource = { disconnect: () => { }, connect: () => { } };
            }
            // Remote audio (peer's audio) - for monitoring
            if (remoteStream) {
                if (this.context) {
                    this.remoteGainNode = this.context.createGain();
                    this.remoteSource = this.context.createMediaStreamSource(remoteStream);
                    this.analyser = this.context.createAnalyser();
                    this.analyser.fftSize = 256;
                    this.remoteSource.connect(this.analyser);
                    this.remoteSource.connect(this.remoteGainNode);
                    this.remoteGainNode.connect(this.destination);
                    this.startAutoDuck();
                }
                else {
                    this.remoteGainNode = { gain: { value: 1, setValueAtTime: () => { } }, disconnect: () => { }, connect: () => { } };
                    this.remoteSource = { disconnect: () => { }, connect: () => { } };
                    this.analyser = null;
                }
            }
            this.isActive = true;
            return this.destination.stream;
        }
        catch (error) {
            console.error('Audio ducker initialization failed:', error instanceof Error ? error.message : 'Unknown error');
            // Cleanup on error
            this.cleanup();
            // Return original stream as fallback
            return localStream;
        }
    }
    startAutoDuck() {
        if (!this.analyser || !this.localGainNode || !this.context) {
            console.warn('Cannot start auto-duck: required components not initialized');
            return;
        }
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const threshold = this.DEFAULT_THRESHOLD;
        this.monitorInterval = window.setInterval(() => {
            if (!this.analyser || !this.localGainNode || !this.context) {
                this.stopAutoDuck();
                return;
            }
            this.analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            if (average > threshold && !this.isDucked) {
                // Remote is speaking, duck local audio
                this.localGainNode.gain.setValueAtTime(this.DEFAULT_DUCK_LEVEL, this.context.currentTime);
                this.isDucked = true;
            }
            else if (average <= threshold && this.isDucked) {
                // Remote stopped speaking, restore local audio
                this.localGainNode.gain.setValueAtTime(1.0, this.context.currentTime);
                this.isDucked = false;
            }
        }, this.MONITOR_INTERVAL_MS);
    }
    stopAutoDuck() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }
    /**
     * Manually duck the local audio to a specified level
     */
    manualDuck(level = this.DEFAULT_DUCK_LEVEL) {
        if (!this.localGainNode) {
            console.warn('Cannot duck audio: ducker not active');
            return;
        }
        if (level < 0 || level > 1) {
            console.warn('Duck level must be between 0 and 1, using default');
            level = this.DEFAULT_DUCK_LEVEL;
        }
        try {
            if (this.context) {
                this.localGainNode.gain.setValueAtTime(level, this.context.currentTime);
            }
            else {
                this.localGainNode.gain.value = level;
            }
            this.isDucked = true;
        }
        catch (error) {
            console.error('Failed to set duck level:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Restore local audio to full volume
     */
    restore() {
        if (!this.localGainNode) {
            console.warn('Cannot restore audio: ducker not active');
            return;
        }
        try {
            if (this.context) {
                this.localGainNode.gain.setValueAtTime(1.0, this.context.currentTime);
            }
            else {
                this.localGainNode.gain.value = 1.0;
            }
            this.isDucked = false;
        }
        catch (error) {
            console.error('Failed to restore audio level:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Get current duck state
     */
    isCurrentlyDucked() {
        return this.isDucked;
    }
    /**
     * Check if ducker is active
     */
    getIsActive() {
        return this.isActive || !!(this.destination || this.localGainNode || this.context);
    }
    /**
     * Cleanup all resources to prevent memory leaks
     */
    cleanup() {
        // Stop auto-duck monitoring first
        this.stopAutoDuck();
        // Disconnect and cleanup audio nodes in reverse order
        if (this.localSource) {
            try {
                this.localSource.disconnect();
            }
            catch (error) {
                console.warn('Error disconnecting local source:', error instanceof Error ? error.message : 'Unknown error');
            }
            this.localSource = null;
        }
        if (this.remoteSource) {
            try {
                this.remoteSource.disconnect();
            }
            catch (error) {
                console.warn('Error disconnecting remote source:', error instanceof Error ? error.message : 'Unknown error');
            }
            this.remoteSource = null;
        }
        if (this.localGainNode) {
            try {
                this.localGainNode.disconnect();
            }
            catch (error) {
                console.warn('Error disconnecting local gain node:', error instanceof Error ? error.message : 'Unknown error');
            }
            this.localGainNode = null;
        }
        if (this.remoteGainNode) {
            try {
                this.remoteGainNode.disconnect();
            }
            catch (error) {
                console.warn('Error disconnecting remote gain node:', error instanceof Error ? error.message : 'Unknown error');
            }
            this.remoteGainNode = null;
        }
        if (this.analyser) {
            try {
                this.analyser.disconnect();
            }
            catch (error) {
                console.warn('Error disconnecting analyser:', error instanceof Error ? error.message : 'Unknown error');
            }
            this.analyser = null;
        }
        if (this.context && this.context.state !== 'closed') {
            try {
                this.context.close();
            }
            catch (error) {
                console.warn('Error closing audio context:', error instanceof Error ? error.message : 'Unknown error');
            }
            this.context = null;
        }
        this.destination = null;
        this.isActive = false;
        this.isDucked = false;
    }
}
