# Technical Decisions — Milestone 1

- Database schema adheres to the provided `profiles` specification and trigger behavior.
- E2EE uses AES-256-CBC with per-message IV; keys derived via PBKDF2-SHA256 (150k iterations) with salt = SHA256(chatId).
- Passphrase validation requires 8+ chars; session-only persistence is deferred to app layer.
- Positive-path testing only, per requirements; invariants validate payload size, IV length, and metadata persistence.
- Coverage thresholds enforce 100% on critical paths in `src/crypto/e2ee.ts`.
- Performance benchmarks measured in Jest using `performance.now()` fallbacks.

