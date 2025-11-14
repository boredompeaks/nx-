import { VoiceCallService } from '../src/voice/voiceCallService';
describe('VoiceCallService', () => {
    let service;
    beforeEach(() => {
        service = new VoiceCallService();
    });
    afterEach(() => {
        // Cleanup
    });
    describe('Call Initialization', () => {
        test('should initialize a new call', async () => {
            const callId = 'test-call-1';
            const participants = ['user1', 'user2'];
            const result = await service.initializeCall(callId, participants);
            expect(result).toBeDefined();
            expect(result.id).toBe(callId);
            expect(result.isActive).toBe(false);
            expect(result.participants).toBeInstanceOf(Map);
        });
        test('should not initialize duplicate calls', async () => {
            const callId = 'test-call-1';
            const participants = ['user1'];
            await service.initializeCall(callId, participants);
            await expect(service.initializeCall(callId, participants))
                .rejects.toThrow('Call already exists');
        });
    });
    describe('Call Management', () => {
        test('should get empty active calls list initially', () => {
            const activeCalls = service.getActiveCalls();
            expect(activeCalls).toEqual([]);
        });
        test('should handle call state correctly', async () => {
            const callId = 'test-call-1';
            const participants = ['user1'];
            const call = await service.initializeCall(callId, participants);
            expect(call.isActive).toBe(false);
        });
    });
});
