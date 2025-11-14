import { deriveChatKey, encryptMessage, validatePayloadInvariants } from '../crypto/e2ee';
export function buildEncryptedMessageRecord(passphrase, chatId, senderId, content, contentType = 'text', metadata, invariantCfg) {
    const key = deriveChatKey(passphrase, chatId);
    const payload = encryptMessage(key, content, senderId, contentType, metadata);
    validatePayloadInvariants(payload, invariantCfg);
    const record = {
        chat_id: chatId,
        sender_id: senderId,
        content: payload.ciphertext,
        content_type: contentType,
        is_encrypted: true,
        created_at: payload.timestamp,
        metadata,
    };
    return { record, payload };
}
