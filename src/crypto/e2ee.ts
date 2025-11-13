import crypto from 'node:crypto';

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  senderId: string;
  timestamp: number;
  contentType?: string;
  metadata?: Record<string, unknown>;
};

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function deriveChatKey(passphrase: string, chatId: string, iterations = 150_000): Buffer {
  if (passphrase.length < 8) throw new Error('Password must be at least 8 characters');
  const saltHex = sha256Hex(chatId);
  const salt = Buffer.from(saltHex, 'hex');
  return crypto.pbkdf2Sync(passphrase, salt, iterations, 32, 'sha256');
}

export function encryptMessage(
  key: Buffer,
  plaintext: string,
  senderId: string,
  contentType: string = 'text',
  metadata?: Record<string, unknown>
): EncryptedPayload {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const ciphertextBuf = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
  return {
    ciphertext: ciphertextBuf.toString('base64'),
    iv: iv.toString('base64'),
    senderId,
    timestamp: Date.now(),
    contentType,
    metadata,
  };
}

export function decryptMessage(key: Buffer, payload: EncryptedPayload): string {
  const iv = Buffer.from(payload.iv, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const cipherBuf = Buffer.from(payload.ciphertext, 'base64');
  const plainBuf = Buffer.concat([decipher.update(cipherBuf), decipher.final()]);
  return plainBuf.toString('utf8');
}

export type PayloadInvariantConfig = {
  maxCiphertextBytes?: number;
  requireIvLength?: number;
};

export function validatePayloadInvariants(payload: EncryptedPayload, cfg: PayloadInvariantConfig = {}): void {
  const { maxCiphertextBytes, requireIvLength = 16 } = cfg;
  const ivBytes = Buffer.from(payload.iv, 'base64');
  if (ivBytes.length !== requireIvLength) throw new Error('Invalid IV length');
  const cipherBytes = Buffer.from(payload.ciphertext, 'base64');
  if (maxCiphertextBytes !== undefined && cipherBytes.length > maxCiphertextBytes) {
    throw new Error('Ciphertext exceeds allowed size');
  }
  if (!payload.senderId || typeof payload.senderId !== 'string') throw new Error('Missing senderId');
  if (!payload.timestamp || typeof payload.timestamp !== 'number') throw new Error('Missing timestamp');
}
