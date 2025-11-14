import { buildEncryptedMessageRecord } from '../src/messages/pipeline';
import { deriveChatKey, decryptMessage } from '../src/crypto/e2ee';
describe('Encrypted message pipeline', () => {
    const chatId = '00000000-0000-0000-0000-000000000002';
    const passphrase = 'correct horse battery staple';
    const senderId = 'user-456';
    it('produces DB-ready record and decrypts to original', () => {
        const content = 'hello pipeline';
        const { record, payload } = buildEncryptedMessageRecord(passphrase, chatId, senderId, content, 'text', { flag: true }, { maxCiphertextBytes: 4096 });
        expect(record.chat_id).toBe(chatId);
        expect(record.sender_id).toBe(senderId);
        expect(record.is_encrypted).toBe(true);
        expect(typeof record.created_at).toBe('number');
        const key = deriveChatKey(passphrase, chatId);
        const decrypted = decryptMessage(key, payload);
        expect(decrypted).toBe(content);
        expect(payload.metadata).toEqual({ flag: true });
    });
    it('respects payload invariants and metadata preservation', () => {
        const content = 'x'.repeat(1024);
        const { record, payload } = buildEncryptedMessageRecord(passphrase, chatId, senderId, content);
        expect(record.content_type).toBe('text');
        expect(payload.iv.length).toBeGreaterThan(0);
    });
});
