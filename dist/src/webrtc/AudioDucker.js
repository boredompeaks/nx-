// Audio Processing and Ducking for WebRTC Calls
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
        this.MONITOR_INTERVAL_MS = 100;
        this.DUCK_THRESHOLD = 30; // Audio energy threshold
        this.DUCK_LEVEL = 0.3; // Duck to 30% volume
        this.RESTORE_LEVEL = 1.0; // Full volume
    }
    async initialize(localStream, remoteStream) {
        if (!localStream) {
            throw new Error('Local stream is required');
        }
        try {
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
            // Set initial local volume
            if (this.context && this.localGainNode) {
                this.localGainNode.gain.setValueAtTime(this.RESTORE_LEVEL, this.context.currentTime);
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
                    this.remoteGainNode.gain.setValueAtTime(this.RESTORE_LEVEL, this.context.currentTime);
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
            console.error('Audio ducker initialization failed:', error);
            this.cleanup();
            throw new Error(`Failed to initialize audio ducker: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    startAutoDuck() {
        if (!this.analyser || !this.localGainNode || !this.context) {
            console.warn('Cannot start auto-duck: missing required components');
            return;
        }
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.monitorInterval = window.setInterval(() => {
            if (!this.analyser || !this.localGainNode || !this.context) {
                this.stopAutoDuck();
                return;
            }
            try {
                this.analyser.getByteFrequencyData(dataArray);
                // Calculate average audio energy
                let sum = 0;
                let count = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    if (dataArray[i] > 0) {
                        sum += dataArray[i];
                        count++;
                    }
                }
                const average = count > 0 ? sum / count : 0;
                if (average > this.DUCK_THRESHOLD && !this.isDucked) {
                    // Remote is speaking, duck local audio
                    this.localGainNode.gain.setValueAtTime(this.DUCK_LEVEL, this.context.currentTime);
                    this.isDucked = true;
                    console.log('Audio ducked - remote speaking detected');
                }
                else if (average <= this.DUCK_THRESHOLD && this.isDucked) {
                    // Remote stopped speaking, restore local audio
                    this.localGainNode.gain.setValueAtTime(this.RESTORE_LEVEL, this.context.currentTime);
                    this.isDucked = false;
                    console.log('Audio restored - remote speaking stopped');
                }
            }
            catch (error) {
                console.error('Error in auto-duck monitoring:', error);
                this.stopAutoDuck();
            }
        }, this.MONITOR_INTERVAL_MS);
    }
    manualDuck(level = this.DUCK_LEVEL) {
        if (this.localGainNode && this.isActive) {
            try {
                // Clamp level between 0 and 1
                const clampedLevel = Math.max(0, Math.min(1, level));
                if (this.context) {
                    this.localGainNode.gain.setValueAtTime(clampedLevel, this.context.currentTime);
                }
                else {
                    this.localGainNode.gain.value = clampedLevel;
                }
                // Manual duck sets isDucked based on whether we're actually ducking (level < 1.0)
                this.isDucked = clampedLevel < this.RESTORE_LEVEL;
                console.log(`Manual duck set to ${clampedLevel}, isDucked: ${this.isDucked}`);
            }
            catch (error) {
                console.error('Error setting manual duck level:', error);
            }
        }
    }
    restore() {
        if (this.localGainNode && this.isActive) {
            try {
                if (this.context) {
                    this.localGainNode.gain.setValueAtTime(this.RESTORE_LEVEL, this.context.currentTime);
                }
                else {
                    this.localGainNode.gain.value = this.RESTORE_LEVEL;
                }
                this.isDucked = false;
                console.log('Audio restored to full volume');
            }
            catch (error) {
                console.error('Error restoring audio level:', error);
            }
        }
    }
    isCurrentlyDucked() {
        return this.isDucked;
    }
    stopAutoDuck() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }
    getCurrentLevel() {
        if (this.localGainNode) {
            try {
                return this.context ? this.localGainNode.gain.value : this.localGainNode.gain.value;
            }
            catch (error) {
                console.error('Error getting current level:', error);
                return this.isDucked ? this.DUCK_LEVEL : this.RESTORE_LEVEL;
            }
        }
        return this.RESTORE_LEVEL;
    }
    isAudioDucked() {
        return this.isDucked;
    }
    isInitialized() {
        return this.isActive;
    }
    cleanup() {
        console.log('Cleaning up audio ducker');
        // Stop monitoring first
        this.stopAutoDuck();
        // Disconnect and cleanup nodes in reverse order
        try {
            if (this.localSource) {
                this.localSource.disconnect();
                this.localSource = null;
            }
            if (this.remoteSource) {
                this.remoteSource.disconnect();
                this.remoteSource = null;
            }
            if (this.localGainNode) {
                this.localGainNode.disconnect();
                this.localGainNode = null;
            }
            if (this.remoteGainNode) {
                this.remoteGainNode.disconnect();
                this.remoteGainNode = null;
            }
            if (this.analyser) {
                this.analyser.disconnect();
                this.analyser = null;
            }
            if (this.context && this.context.state !== 'closed') {
                this.context.close?.();
                this.context = null;
            }
        }
        catch (error) {
            console.error('Error during audio cleanup:', error);
        }
        this.destination = null;
        this.isActive = false;
        this.isDucked = false;
        console.log('Audio ducker cleanup completed');
    }
}
