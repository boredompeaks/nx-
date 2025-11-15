// Audio Processing and Ducking for WebRTC Calls

export class AudioDucker {
  private context: AudioContext | null = null;
  private localGainNode: GainNode | null = null;
  private remoteGainNode: GainNode | null = null;
  private localSource: MediaStreamAudioSourceNode | null = null;
  private remoteSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private isActive: boolean = false;
  private isDucked: boolean = false;
  private monitorInterval: number | null = null;
  private readonly MONITOR_INTERVAL_MS = 100;
  private readonly DUCK_THRESHOLD = 30; // Audio energy threshold
  private readonly DUCK_LEVEL = 0.3; // Duck to 30% volume
  private readonly RESTORE_LEVEL = 1.0; // Full volume

  async initialize(localStream: MediaStream, remoteStream?: MediaStream): Promise<MediaStream> {
    if (!localStream) {
      throw new Error('Local stream is required');
    }

    try {
      const Ctx: any = typeof AudioContext !== 'undefined' ? AudioContext : (typeof (window as any).webkitAudioContext !== 'undefined' ? (window as any).webkitAudioContext : null);
      if (Ctx) {
        this.context = new Ctx();
        const ctx = this.context as AudioContext;
        this.destination = ctx.createMediaStreamDestination();
      } else {
        this.context = null as any;
        this.destination = { stream: localStream } as any;
      }
      
      // Local audio (user's mic)
      if (this.context) {
        this.localGainNode = this.context.createGain();
        this.localSource = this.context.createMediaStreamSource(localStream);
        this.localSource.connect(this.localGainNode);
        this.localGainNode.connect(this.destination!);
      } else {
        this.localGainNode = { gain: { value: 1, setValueAtTime: (v: number) => { (this.localGainNode as any).gain.value = v; } }, disconnect: () => {}, connect: () => {} } as any;
        this.localSource = { disconnect: () => {}, connect: () => {} } as any;
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
          this.remoteGainNode.connect(this.destination!);
          this.remoteGainNode.gain.setValueAtTime(this.RESTORE_LEVEL, this.context.currentTime);
          this.startAutoDuck();
        } else {
          this.remoteGainNode = { gain: { value: 1, setValueAtTime: () => {} }, disconnect: () => {}, connect: () => {} } as any;
          this.remoteSource = { disconnect: () => {}, connect: () => {} } as any;
          this.analyser = null;
        }
      }
      
      this.isActive = true;
      return (this.destination as any).stream;
    } catch (error) {
      console.error('Audio ducker initialization failed:', error);
      this.cleanup();
      throw new Error(`Failed to initialize audio ducker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private startAutoDuck(): void {
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
        } else if (average <= this.DUCK_THRESHOLD && this.isDucked) {
          // Remote stopped speaking, restore local audio
          this.localGainNode.gain.setValueAtTime(this.RESTORE_LEVEL, this.context.currentTime);
          this.isDucked = false;
          console.log('Audio restored - remote speaking stopped');
        }
      } catch (error) {
        console.error('Error in auto-duck monitoring:', error);
        this.stopAutoDuck();
      }
    }, this.MONITOR_INTERVAL_MS);
  }

  manualDuck(level: number = this.DUCK_LEVEL): void {
    if (this.localGainNode && this.isActive) {
      try {
        // Clamp level between 0 and 1
        const clampedLevel = Math.max(0, Math.min(1, level));
        if (this.context) {
          this.localGainNode.gain.setValueAtTime(clampedLevel, this.context.currentTime);
        } else {
          (this.localGainNode as any).gain.value = clampedLevel;
        }
        // Manual duck sets isDucked based on whether we're actually ducking (level < 1.0)
        this.isDucked = clampedLevel < this.RESTORE_LEVEL;
        console.log(`Manual duck set to ${clampedLevel}, isDucked: ${this.isDucked}`);
      } catch (error) {
        console.error('Error setting manual duck level:', error);
      }
    }
  }

  restore(): void {
    if (this.localGainNode && this.isActive) {
      try {
        if (this.context) {
          this.localGainNode.gain.setValueAtTime(this.RESTORE_LEVEL, this.context.currentTime);
        } else {
          (this.localGainNode as any).gain.value = this.RESTORE_LEVEL;
        }
        this.isDucked = false;
        console.log('Audio restored to full volume');
      } catch (error) {
        console.error('Error restoring audio level:', error);
      }
    }
  }

  isCurrentlyDucked(): boolean {
    return this.isDucked;
  }

  private stopAutoDuck(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  getCurrentLevel(): number {
    if (this.localGainNode) {
      try {
        return this.context ? this.localGainNode.gain.value : (this.localGainNode as any).gain.value;
      } catch (error) {
        console.error('Error getting current level:', error);
        return this.isDucked ? this.DUCK_LEVEL : this.RESTORE_LEVEL;
      }
    }
    return this.RESTORE_LEVEL;
  }

  isAudioDucked(): boolean {
    return this.isDucked;
  }

  isInitialized(): boolean {
    return this.isActive;
  }

  cleanup(): void {
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
      
      if (this.context && (this.context as any).state !== 'closed') {
        (this.context as any).close?.();
        this.context = null;
      }
    } catch (error) {
      console.error('Error during audio cleanup:', error);
    }
    
    this.destination = null;
    this.isActive = false;
    this.isDucked = false;
    
    console.log('Audio ducker cleanup completed');
  }
}
