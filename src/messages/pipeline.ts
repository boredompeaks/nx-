import { deriveChatKey, encryptMessage, validatePayloadInvariants, EncryptedPayload } from '../crypto/e2ee';

export type MessageRecord = {
  id?: string;
  chat_id: string;
  sender_id: string;
  content: string;
  content_type: string;
  is_encrypted: boolean;
  created_at?: number;
  metadata?: Record<string, unknown>;
};

export function buildEncryptedMessageRecord(
  passphrase: string,
  chatId: string,
  senderId: string,
  content: string,
  contentType: string = 'text',
  metadata?: Record<string, unknown>,
  invariantCfg?: { maxCiphertextBytes?: number; requireIvLength?: number }
): { record: MessageRecord; payload: EncryptedPayload } {
  const key = deriveChatKey(passphrase, chatId);
  const payload = encryptMessage(key, content, senderId, contentType, metadata);
  validatePayloadInvariants(payload, invariantCfg);
  const record: MessageRecord = {
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

