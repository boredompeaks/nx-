import { deriveChatKey, encryptMessage, decryptMessage, validatePayloadInvariants } from '../src/crypto/e2ee';

describe('E2EE positive-path', () => {
  const chatId = '00000000-0000-0000-0000-000000000001';
  const passphrase = 'correct horse battery staple';
  const senderId = 'user-123';

  it('encrypts and decrypts text preserving metadata (critical path)', () => {
    const key = deriveChatKey(passphrase, chatId);
    const metadata = { replyToId: null, flags: { oneTimeView: false } };
    const payload = encryptMessage(key, 'hello world', senderId, 'text', metadata);

    validatePayloadInvariants(payload, { maxCiphertextBytes: 4096, requireIvLength: 16 });
    const decrypted = decryptMessage(key, payload);

    expect(decrypted).toBe('hello world');
    expect(payload.senderId).toBe(senderId);
    expect(payload.contentType).toBe('text');
    expect(payload.metadata).toEqual(metadata);
    expect(typeof payload.timestamp).toBe('number');
  });

  it('validates payload size constraint', () => {
    const key = deriveChatKey(passphrase, chatId);
    const longText = 'x'.repeat(1024);
    const payload = encryptMessage(key, longText, senderId, 'text');
    expect(() => validatePayloadInvariants(payload, { maxCiphertextBytes: 4096 })).not.toThrow();
  });

  it('validates invariants with default config (no cfg provided)', () => {
    const key = deriveChatKey(passphrase, chatId);
    const payload = encryptMessage(key, 'hello', senderId);
    expect(() => validatePayloadInvariants(payload)).not.toThrow();
  });

  it('benchmarks encrypt/decrypt performance', () => {
    const key = deriveChatKey(passphrase, chatId);
    const sample = 'a'.repeat(2048);

    const t0 = Date.now();
    const p = encryptMessage(key, sample, senderId, 'text');
    const t1 = Date.now();
    const d = decryptMessage(key, p);
    const t2 = Date.now();

    expect(d).toBe(sample);
    const encryptMs = t1 - t0;
    const decryptMs = t2 - t1;

    // Basic sanity performance checks (informational thresholds)
    expect(encryptMs).toBeLessThan(50);
    expect(decryptMs).toBeLessThan(50);

    // Expose metrics in console for report collection
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ encryptMs, decryptMs }));
  });

  it('payload invariant: throws when ciphertext exceeds size', () => {
    const key = deriveChatKey(passphrase, chatId);
    const payload = encryptMessage(key, 'hello', senderId, 'text');
    expect(() => validatePayloadInvariants(payload, { maxCiphertextBytes: 1 })).toThrow();
  });

  it('payload invariant: throws on invalid IV length', () => {
    const key = deriveChatKey(passphrase, chatId);
    const payload = encryptMessage(key, 'hello', senderId, 'text');
    // Tamper IV to 8 bytes
    const badIv = Buffer.alloc(8, 0).toString('base64');
    const tampered = { ...payload, iv: badIv };
    expect(() => validatePayloadInvariants(tampered, { requireIvLength: 16 })).toThrow();
  });

  it('payload invariant: throws on missing senderId', () => {
    const key = deriveChatKey(passphrase, chatId);
    const payload = encryptMessage(key, 'hello', senderId, 'text');
    const tampered = { ...payload, senderId: '' } as any;
    expect(() => validatePayloadInvariants(tampered)).toThrow();
  });

  it('payload invariant: throws on missing timestamp', () => {
    const key = deriveChatKey(passphrase, chatId);
    const payload = encryptMessage(key, 'hello', senderId, 'text');
    const tampered = { ...payload, timestamp: undefined as any } as any;
    expect(() => validatePayloadInvariants(tampered)).toThrow();
  });

  it('key derivation: throws on short passphrase (validation)', () => {
    expect(() => deriveChatKey('short', chatId)).toThrow();
  });
});
