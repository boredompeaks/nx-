export class VoiceCallService {
    constructor() {
        this.activeCalls = new Map();
    }
    async initializeCall(callId, participants) {
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
    getActiveCalls() {
        return Array.from(this.activeCalls.values()).filter(call => call.isActive);
    }
}
