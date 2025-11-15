## Codebase Analysis
- Duplicate implementations under `src/engine` and `src/webrtc`:
  - `AudioDucker.ts`, `CallEngine.ts`, `SignalingClient.ts`, `StatsMonitor.ts`, `TurnSelector.ts`, `constants.ts`, `index.ts`, `types.ts`, `utils.ts`.
  - Both trees are referenced by tests: `tests/engine.test.ts` targets `src/engine/*`, `tests/webrtc.test.ts` and `tests/webrtc.integration.test.ts` target `src/webrtc/*`.
- Supabase client duplication:
  - `src/config/supabase.js` and `src/supabase.js` coexist with overlapping responsibilities.
- Compiled duplicates in `dist/src/*` mirror the dual structure (JS outputs) and increase cognitive load.
- Profiles/auth/messages/voice directories appear once (no duplicates) and compose API/domain features.

## Usage and Dependencies
- Tests exercise both implementations; integration tests import from `../src/webrtc` (`tests/webrtc.integration.test.ts:4`).
- Web app originally imported `../src/supabase.js`; the new React app uses its own client and avoids server coupling.
- Shared concepts (errors, constants, utils) exist in both `engine` and `webrtc` implementations, causing parallel evolution.

## Evaluation Criteria
- Code quality and maintainability:
  - `src/engine` uses structured error types and consistent validation (e.g., `WebRTCError`, constraint validators) and provides robust cleanup and reconnection patterns.
  - `src/webrtc` is simpler, with pragmatic checks and more inline logging; validation is looser, and jitter/backoff differs.
- Functional completeness:
  - `src/engine/CallEngine.ts` implements adaptive bitrate control, perfect negotiation state, reconnection/backoff, and screen share cleanup. Example: adaptive bitrate hysteresis and safety margins (`src/engine/CallEngine.ts:743–806`).
  - `src/webrtc/CallEngine.ts` includes bitrate setup and negotiation but is less comprehensive in state tracking.
- Performance characteristics:
  - Engine’s adaptive bitrate uses thresholds and hysteresis to minimize oscillations and reduce CPU/network churn (`src/engine/CallEngine.ts:750–806`).
  - Engine utilities validate constraints thoroughly to prevent unnecessary renegotiations (`src/engine/utils.ts:24–111`).
- Dependency management:
  - Engine relies on typed internal utilities and emits contextual errors; signaling includes heartbeat and presence handling (`src/engine/SignalingClient.ts:257–285`).
  - WebRTC client adds rate-limiting and message queueing (`src/webrtc/SignalingClient.ts:142–181`) but lacks typed error discipline.
- Testing coverage:
  - Both are covered (199/199 tests passing). Engine suite is more focused on error-context assertions; webrtc suite covers integration flow and message signaling.
- Documentation quality:
  - Engine files include enterprise-grade headers and clear doc comments; webrtc files have succinct headers and inline logs.

## Optimal Selection
- Select `src/engine` as the canonical implementation.
  - Rationale: stronger typed errors, thorough validation, robust reconnection, adaptive bitrate control with hysteresis, and comprehensive cleanup.
  - Concrete examples:
    - Adaptive bitrate hysteresis and safety margin prevent oscillations (`src/engine/CallEngine.ts:750–806`).
    - Perfect negotiation state tracking via `negotiationStates` map (`src/engine/CallEngine.ts:560–606`).
    - Screen share stop cleanup sequence, track stop and media cleanup (`src/engine/CallEngine.ts:344–368`).
    - Heartbeat and presence updates to keep state consistent (`src/engine/SignalingClient.ts:257–285`).
    - Strict media constraint validation guarding runtime errors (`src/engine/utils.ts:24–111`).

## Restructuring Plan
### Phase 1: Discovery and Freeze
- Freeze changes to `src/webrtc/*` and `src/config/supabase.js` to prevent drift.
- Tag code references in tests to inform migration: update import paths progressively.

### Phase 2: Consolidation into Single `src`
- Merge `src/webrtc/*` deltas into `src/engine/*` where beneficial (e.g., signal rate-limiting and queueing from `src/webrtc/SignalingClient.ts:142–181`).
- Remove duplicate trees and keep a single module namespace under `src/rtc/*` (rename `engine` → `rtc` to reflect neutral naming if desired).
- Consolidate Supabase client into one module (`src/lib/supabase.ts`) with shared error-handling and subscription manager.
- Unify types/constants into `src/rtc/types.ts` and `src/rtc/constants.ts` to eliminate drift.

### Phase 3: Module Boundaries and Naming Conventions
- Establish directory layout:
  - `src/rtc/` (call engine, signaling, audio, stats, utils, types, constants)
  - `src/lib/` (supabase client, helpers: storage, auth)
  - `src/features/` (profiles, messages, crypto/e2ee, voice)
  - `src/app/` (React app: routes, pages, components, hooks, store)
- Naming rules:
  - No duplicate filenames across sibling modules (ESLint custom rule and CI check).
  - Public APIs only in `index.ts` per module; internal files are private.

### Phase 4: Automated Verification
- Add ESLint rule to forbid identical basenames across subdirectories for public modules.
- Add script to scan tree for duplicates and fail CI on conflict.
- Type-only boundaries: expose types from `src/rtc/types.ts`; forbid runtime imports across layers.

### Phase 5: Remove Express.js and Align with Requirements
- Exclude Express.js from final build; rely on:
  - Vite dev server for local development.
  - Supabase (Auth, Realtime, Storage) for backend needs.
  - Static hosting for production bundles.
- Migrate any server-only helper logic to client modules or Supabase functions if necessary.

## Implementation Requirements (React + Vite + TypeScript)
- React app located at `web/src`, built with Vite and TypeScript.
- Type safety enforced via strict `tsconfig`, shared types in `src/rtc/types.ts` and feature modules.
- Production bundling optimized via Vite build; code-splitting per route; cache-friendly asset names.
- Supabase client in `web/src/context/AuthContext.tsx` and `src/lib/supabase.ts` for shared use.

## Migration Roadmap
1. Canonicalize RTC implementation:
   - Move `src/engine/*` to `src/rtc/*`; port rate-limit/queueing from webrtc client.
   - Update tests to reference `src/rtc/*` and remove duplicates.
2. Supabase Client Unification:
   - Create `src/lib/supabase.ts`; remove `src/config/supabase.js` and `src/supabase.js` duplication.
3. Frontend Wiring:
   - React pages/components for chats, conversation, settings.
   - Real-time presence, typing, messages via Supabase channels.
   - E2EE UX: password modal, session caching, decrypt-on-demand.
   - Media upload: Supabase Storage integration with message insertion.
   - Message status UI: ticks updated in real-time.
4. Tooling and CI:
   - ESLint config for naming/structure.
   - Duplicate filename scan script.
   - Strict TS and path alias enforcement.

## Implementation Timeline
- Week 1:
  - Consolidate `engine` → `rtc`, merge signaling features, unify supabase client.
  - Update and stabilize tests (keep 100% pass).
- Week 2:
  - Real-time integrations (presence, typing, messages, status).
  - E2EE UX and Storage uploads.
- Week 3:
  - Wire call buttons to RTC engine for voice/video; refine settings/profile.
  - Performance profiling and bundle optimization.
- Week 4:
  - CI/QA hardening: ESLint rules, duplicate scan, regression/perf tests.
  - Documentation and developer guides.

## Quality Assurance Plan
- Testing:
  - Maintain unit/integration suites; migrate imports to `src/rtc` with no regressions.
  - Add E2EE and storage upload integration tests; mock Supabase where needed.
- Performance:
  - Validate adaptive bitrate behavior under simulated network conditions.
  - Confirm realtime updates under load (presence/typing/message flood control).
- Security:
  - Ensure passphrases only stored in `sessionStorage` and cleared on logout/inactivity.
  - Review CORS and client-only architecture for data flow correctness.
- Structure Integrity:
  - CI checks for duplicate filenames, module export discipline, and strict TS build.

## Selection Justification (Summary)
- `src/engine` provides superior robustness and maintainability with typed errors, validation, adaptive bitrate, reconnection strategies, and comprehensive cleanup.
- Its patterns reduce risk of race conditions and oscillations (e.g., hysteresis in bitrate), improving user experience and CPU/network efficiency.

Please confirm this plan. Once approved, I will proceed with the phased consolidation and migration, implement the realtime/E2EE/media features, and deliver the full React+Vite+TypeScript application excluding Express.