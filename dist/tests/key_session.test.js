import { ChatSessionPasswords, validatePassword } from '../src/key/session';
describe('Key management session adapter', () => {
    it('validates password length', () => {
        expect(validatePassword('short')).toBe(false);
        expect(validatePassword('longenough')).toBe(true);
    });
    it('set/get/clear per chatId', () => {
        const ks = new ChatSessionPasswords();
        ks.set('chat-1', 'password123');
        expect(ks.get('chat-1')).toBe('password123');
        ks.clear('chat-1');
        expect(ks.get('chat-1')).toBeUndefined();
    });
    it('clearAll removes all entries', () => {
        const ks = new ChatSessionPasswords();
        ks.set('chat-1', 'password123');
        ks.set('chat-2', 'password456');
        ks.clearAll();
        expect(ks.get('chat-1')).toBeUndefined();
        expect(ks.get('chat-2')).toBeUndefined();
    });
    it('rejects invalid passwords on set', () => {
        const ks = new ChatSessionPasswords();
        expect(() => ks.set('chat-1', 'short')).toThrow();
    });
});
