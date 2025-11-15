## Codebase Comparison Report
### Duplicate Areas
- Two parallel WebRTC stacks:
  - `src/engine/*`: AudioDucker, CallEngine, SignalingClient, StatsMonitor, TurnSelector, constants, types, utils.
  - `src/webrtc/*`: same filenames and roles.
- Supabase client duplicates:
  - `src/config/supabase.js` and `src/supabase.js`.

### Code Quality
- **Organization & Modularity**
  - `src/engine` shows stronger modular boundaries (typed errors, validation helpers, clear separation of negotiation/adaptation/cleanup). Example: negotiation state tracked in `CallEngine` via `negotiationStates` (`src/engine/CallEngine.ts:560–606`).
  - `src/webrtc` is simpler and pragmatic but with more inline logic and global error handlers.
- **Coding Style & Documentation**
  - `src/engine` includes enterprise-grade headers and consistent methods with JSDoc-style comments (e.g., `utils.ts:9–19`, `utils.ts:22–111`).
  - `src/webrtc` headers are concise; style is clean but with fewer explanatory comments.
- **Error Handling & Logging**
  - `src/engine` uses `WebRTCError` across flows and emits contextual errors (e.g., `CallEngine.init` rethrows `INITIALIZATION_FAILED` `src/engine/CallEngine.ts:110–119`).
  - `src/webrtc` logs and throws generic errors; includes rate limit and retry queue in `SignalingClient` (`src/webrtc/SignalingClient.ts:142–181`).

### Technical Implementation Quality
- **Functional Completeness (beyond WebRTC)**
  - Shared domain features (profiles, messages, auth, voice) are not duplicated and thus neutral to the comparison.
  - For RTC functionality, `src/engine` covers adaptive bitrate with hysteresis and bandwidth safety margins (`src/engine/CallEngine.ts:743–806`), perfect negotiation, reconnection/backoff, and clean screen-share lifecycle (`src/engine/CallEngine.ts:344–368`).
- **Performance Characteristics**
  - `src/engine` adaptive bitrate avoids oscillations; applies min intervals and hysteresis.
  - `src/webrtc` applies adaptation but with fewer guardrails.
- **Robust Error Handling**
  - `src/engine` validates media constraints thoroughly (`src/engine/utils.ts:24–111`) and wraps failures with `WebRTCError`.
  - `src/webrtc` uses boolean validation and basic checks (`src/webrtc/utils.ts:25–56`).
- **Dependencies**
  - Both use `@supabase/supabase-js`; `engine` config appears more guarded; `webrtc` adds channel configs and rate-limit features.

### Maintenance Factors
- **Modification Dates / Active History**: Not available in this environment; recommend Git history audit.
- **Test Coverage**: Both are covered; full suite passes (199/199). Engine tests emphasize typed error contexts and lifecycle; webrtc tests emphasize integration signaling.
- **Unresolved Issues**: None observed from test outputs; suggest static analysis and issue tracker sweep.

### Architectural Considerations
- **Scalability & Separation**
  - `src/engine` demonstrates clearer separation (validation/utilities/negotiation/adaptation) enabling extension.
  - `src/webrtc` has helpful rate-limit/message queue features, good candidates to port into the canonical stack.
- **Configuration Flexibility & API**
  - Engine’s `CallEngineOptions` validation and defaults present a cleaner API (`src/engine/CallEngine.ts:63–82`).

### Recommendation
- Choose `src/engine` as the reference implementation.
  - Superior patterns: adaptive bitrate with hysteresis (`src/engine/CallEngine.ts:750–806`), perfect negotiation state tracking (`src/engine/CallEngine.ts:560–606`), robust constraint validation (`src/engine/utils.ts:24–111`), and consistent typed errors across flows.
  - Port in `src/webrtc`’s advanced signaling features (rate-limiting and retry queue) from `src/webrtc/SignalingClient.ts:142–181`.

## Consolidation and Migration Plan
### Phase 1: Inventory & Freeze
- Freeze changes to `src/webrtc/*` and duplicated Supabase clients.
- Map all import paths in tests and app to plan edits.

### Phase 2: Canonicalization
- Create `src/rtc/` and move `src/engine/*` there; merge beneficial features from `src/webrtc/*` (e.g., signal rate-limit/queue).
- Consolidate Supabase client to `src/lib/supabase.ts`; remove duplicates.
- Unify `types.ts` and `constants.ts` under `src/rtc/` with stable public API.

### Phase 3: Update Consumers
- Update tests to import from `src/rtc/*`.
- Update any app modules to use `src/lib/supabase.ts` and `src/rtc` API.
- Remove `src/webrtc/*` once tests are green.

### Phase 4: Structure Governance
- Add ESLint rule and CI script to detect duplicate basenames across module boundaries.
- Enforce index-only public exports; internal files are private.
- Add path aliases and strict TS settings.

### Phase 5: React + Vite + TypeScript (No Express)
- Final build target excludes Express.
- Web app uses Vite dev server and static hosting.
- RTC and domain modules are pure TypeScript libraries under `src/`.

## Implementation Timeline
- Week 1: Move `engine` → `rtc`, port signaling features, unify supabase client; adjust tests.
- Week 2: Wire real-time presence/typing/messages/status to React store; E2EE UI; Storage uploads.
- Week 3: Wire call buttons to RTC engine; polish settings/profile and theme persistence.
- Week 4: CI/QA: ESLint structural rules, duplicate scan, perf/regression tests; docs.

## Quality Assurance Plan
- Maintain 100% test pass; expand tests for E2EE and uploads.
- Performance validation on adaptive bitrate and reconnection.
- Security review: session-only passphrase cache; clear on logout/inactivity.
- Structure integrity via CI checks on duplicates and module boundaries.

## Acceptance Criteria
- Single consolidated `src/` tree (`src/rtc`, `src/lib`, `src/features`, `src/app`), no duplicates.
- React+Vite+TS app, no Express in final distribution.
- Realtime presence/typing/messages/status; E2EE modal and decryption flows; media uploads; wired call buttons.
- Strict TS build and CI structure checks.

Please confirm this plan. After approval, I will start the consolidation and migration, implement the realtime/E2EE/media features, and deliver the reference implementation and React app aligned with all requirements.