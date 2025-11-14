export class VoiceCallService {
  private activeCalls: Map<string, any> = new Map();

  async initializeCall(callId: string, participants: string[]): Promise<any> {
    if (this.activeCalls.has(callId)) {
      throw new Error('Call already exists');
    }

    const callState = {
      id: callId,
      participants: new Map(),
      isActive: false,
      qualityProfile: 'high'
    };

    this.activeCalls.set(callId, callState);
    return callState;
  }

  getActiveCalls(): any[] {
    return Array.from(this.activeCalls.values()).filter(call => call.isActive);
  }
}