# FROSTED CHAT — FDD + SLC IMPLEMENTATION PLAN

## Guiding Principles
- Feature-Driven Development: deliver in discrete, testable features with clear boundaries.
- Simple, Lovable, Complete (SLC): minimum scope that is usable, delightful, and complete for the feature’s core value.
- Sequential flow: strictly finish→verify→approve each feature before starting the next.
- Quality gates: 100% coverage on critical paths, zero high-priority defects, acceptance criteria documented.
- Traceability: consistent IDs linking features ↔ tests ↔ implementation ↔ docs.

## Feature Sequencing & Dependencies
- Order by business value and dependencies:
  1) `authentication_system`
  2) `user_profiles`
  3) `chat_management`
  4) `message_system_with_e2ee`
  5) `e2ee_key_management`
  6) `realtime_messaging`
  7) `read_receipts_system`
  8) `typing_indicators`
  9) `presence_tracking_system`
  10) `message_reactions`
  11) `optimistic_ui_updates`
  12) `message_pagination`
  13) `message_cache_system`
- Rule: do not start N+1 until N is approved with the test report and quality gates met.

## Per-Feature SLC Scope & Test Strategy
### Feature: authentication_system (FID-AUTH)
- Boundary: registration, login, logout, session management, auth guard.
- Simple: email/password sign-up and sign-in; session persistence; guarded routes.
- Lovable: clear errors, loading states, accessibility labels, remember-me UX.
- Complete: auto-profile creation hook confirmed; logout clears sensitive stores.
- Implementation Artifacts: `AuthContext`, auth screens, supabase client wrappers.
- Tests:
  - Unit: form validation, session state transitions, guard logic.
  - Integration: register→autocreate profile; login→protected screen; logout→redirect.
  - Coverage: 100% critical paths (register, login, guard, logout); 90% overall module.
- Performance: auth round-trip under 1s on dev; cold start session restore under 300ms.
- Acceptance Criteria: can register/login/logout; unauthenticated users redirected.
- Traceability: TIDs `T-AUTH-U-*` (unit), `T-AUTH-I-*` (integration); Docs `D-AUTH-*`.

### Feature: user_profiles (FID-PROF)
- Boundary: profile CRUD, uniqueness, realtime updates.
- Simple: view/edit display name, avatar, bio; unique username enforced.
- Lovable: graceful conflict resolution, avatar preview, last seen display.
- Complete: realtime subscription updates UI; RLS policies validated by queries.
- Implementation Artifacts: `profiles` repo/service, profile screen/components.
- Tests: unit (validators, repo), integration (create-on-register, update, realtime).
- Coverage: 100% critical (create/update/read, unique constraint handling).
- Performance: profile load under 200ms cached; update reflects < 500ms.
- Acceptance Criteria: unique usernames; edits persist; realtime reflects changes.
- Traceability: `T-PROF-U-*`, `T-PROF-I-*`, `D-PROF-*`.

### Feature: chat_management (FID-CHAT)
- Boundary: chat creation, participants, metadata, access control.
- Simple: create 1:1 chat, list chats for user.
- Lovable: duplicate prevention, clear statuses, creator attribution.
- Complete: RLS prevents non-participants; timestamps maintained.
- Tests: unit (repo methods), integration (create, join, list, RLS read constraints).
- Coverage: 100% critical (create/list/participant join, duplicate protections).
- Performance: list chats < 300ms with 20 items.
- Acceptance Criteria: can create/list chats; duplicates blocked.
- Traceability: `T-CHAT-U-*`, `T-CHAT-I-*`, `D-CHAT-*`.

### Feature: message_system_with_e2ee (FID-MSG)
- Boundary: encrypt on write, decrypt on read, attachments, ephemeral flags.
- Simple: text send/receive with AES-256-CBC; per-message IV; E2EE flag honored.
- Lovable: clear wrong-password error; retry; basic attachment URL rendering.
- Complete: reply threading; one-time view; disappear-after respected.
- Tests:
  - Unit: key derivation input, AES encrypt/decrypt, payload schema, error handling.
  - Integration: send→store encrypted; read→decrypt with passphrase; ephemeral behaviors.
- Coverage: 100% critical (encrypt, decrypt, store/read pipeline); 95% module.
- Performance: encrypt/decrypt < 10ms per message on dev hardware.
- Acceptance Criteria: only encrypted content stored; decrypt works with correct passphrase.
- Traceability: `T-MSG-U-*`, `T-MSG-I-*`, `D-MSG-*`.

### Feature: e2ee_key_management (FID-KEY)
- Boundary: passphrase entry, PBKDF2 derivation, session password cache lifecycle.
- Simple: set/get/clear passphrase per chat; min length validation.
- Lovable: UX for multiple chat passwords; visible state when missing.
- Complete: deterministic salt by chatId; logout clears cache.
- Tests: unit (derive, validate, cache ops), integration (decrypt flow through message read).
- Coverage: 100% critical (derive, cache lifecycle, validation failures).
- Acceptance Criteria: passphrase persisted for session only; decrypt succeeds/fails predictably.
- Traceability: `T-KEY-U-*`, `T-KEY-I-*`, `D-KEY-*`.

### Feature: realtime_messaging (FID-RTM)
- Boundary: subscriptions for messages/reactions/presence/typing; reconnection logic.
- Simple: subscribe on mount, unsubscribe on unmount; receive new messages.
- Lovable: optimistic merge with local state; graceful reconnection.
- Complete: handle INSERT/UPDATE/DELETE; multi-channel management.
- Tests: unit (subscription manager), integration (receive events and merge state).
- Coverage: 100% critical (subscribe/unsubscribe, reconnection, event dispatch).
- Acceptance Criteria: real-time delivery without refresh; reconnection works.
- Traceability: `T-RTM-U-*`, `T-RTM-I-*`, `D-RTM-*`.

### Feature: read_receipts_system (FID-READ)
- Boundary: per-message read tracking; bulk mark read; realtime updates.
- Simple: mark single message read; display ticks.
- Lovable: bulk mark read with optimistic UI and rollback.
- Complete: realtime sync across devices; uniqueness constraints enforced.
- Tests: unit (repo ops), integration (scroll→mark read; bulk ops; realtime reflect).
- Coverage: 100% critical (single/bulk updates; UI state reflect).
- Acceptance Criteria: read states are consistent; no dup receipts.
- Traceability: `T-READ-U-*`, `T-READ-I-*`, `D-READ-*`.

### Feature: typing_indicators (FID-TYPE)
- Boundary: per-conversation typing status, auto-clear, realtime.
- Simple: start/stop typing; show indicator.
- Lovable: auto-clear after inactivity; cleanup triggers.
- Complete: realtime subscriptions; header indicator.
- Tests: unit (state transitions), integration (indicator life cycle, realtime reflect).
- Coverage: 100% critical (set/clear/auto-clear).
- Acceptance Criteria: indicators correct and timely.
- Traceability: `T-TYPE-U-*`, `T-TYPE-I-*`, `D-TYPE-*`.

### Feature: presence_tracking_system (FID-PRES)
- Boundary: online/away/offline; heartbeat; device info; connection quality.
- Simple: online/offline toggle; last seen.
- Lovable: auto-away; connection quality shown; device info captured.
- Complete: Supabase Presence integration; profile triggers.
- Tests: unit (status transitions), integration (auto-away, presence channel updates).
- Coverage: 100% critical (status compute, trigger correctness).
- Acceptance Criteria: presence reflects activity; last seen updates.
- Traceability: `T-PRES-U-*`, `T-PRES-I-*`, `D-PRES-*`.

### Feature: message_reactions (FID-REACT)
- Boundary: emoji add/remove; aggregate counts; realtime.
- Simple: toggle reaction; prevent duplicates.
- Lovable: highlight own reactions; 7 default emojis.
- Complete: realtime sync, optimistic updates.
- Tests: unit (toggle semantics), integration (multi-user counts, dup prevention).
- Coverage: 100% critical (add/remove/aggregate correctness).
- Acceptance Criteria: reactions stable and accurate.
- Traceability: `T-REACT-U-*`, `T-REACT-I-*`, `D-REACT-*`.

### Feature: optimistic_ui_updates (FID-OPT)
- Boundary: optimistic send, temp IDs, rollback, timeouts.
- Simple: show sent message immediately; replace with server response.
- Lovable: clear retry UX; timeout fallback.
- Complete: auto retry on network recovery.
- Tests: unit (temp ID, rollback), integration (error path, retry path).
- Coverage: 100% critical (optimistic→server sync flow).
- Acceptance Criteria: smooth feedback; consistent final state.
- Traceability: `T-OPT-U-*`, `T-OPT-I-*`, `D-OPT-*`.

### Feature: message_pagination (FID-PAG)
- Boundary: offset-based load-more; merge; scroll position.
- Simple: load 50 older messages; merge correctly.
- Lovable: prefetch next page; disable at beginning.
- Complete: persist offset; maintain scroll position.
- Tests: unit (pagination math), integration (load/merge/persist/restore).
- Coverage: 100% critical (merge correctness, boundary conditions).
- Acceptance Criteria: efficient history browsing.
- Traceability: `T-PAG-U-*`, `T-PAG-I-*`, `D-PAG-*`.

### Feature: message_cache_system (FID-CACHE)
- Boundary: localStorage cache per chat; offset cache; clear on logout.
- Simple: hydrate from cache; save after fetch.
- Lovable: background refresh; error handling.
- Complete: merge server updates; cache lifecycle.
- Tests: unit (storage adapter), integration (hydrate/merge/clear flows).
- Coverage: 100% critical (hydrate/merge/clear correctness).
- Acceptance Criteria: faster loads; consistent state.
- Traceability: `T-CACHE-U-*`, `T-CACHE-I-*`, `D-CACHE-*`.

## Quality Gates
- Coverage: 100% on critical paths per feature; ≥90–95% overall module coverage.
- Defects: zero high-priority (P0/P1) defects before approval; medium defects documented with mitigation.
- Acceptance: all acceptance criteria satisfied and documented.
- Security: no secrets persisted beyond session; encryption validated with negative tests.

## Workflow & Approvals
- Sequence: Implement→Unit tests→Integration tests→Coverage report→Performance metrics→Test report→Review/Approval→Proceed.
- Reviews: submit test report for feature approval; gate prevents next feature start until approval.
- Change management: each feature has its own branch/PR and report; traceability IDs referenced in commit messages and docs.

## Coverage & Reporting
- Tooling: Jest with `@testing-library/react-native` (or web analog), Istanbul coverage.
- Thresholds: per-feature `jest.config` thresholds to enforce critical path 100% lines/branches/functions.
- Metrics: execution times, render latencies, encrypt/decrypt timings, realtime event round-trip where applicable.
- Report Template (saved per feature):
  - Feature: FID-XXX — name & description
  - Test Cases Executed: list with IDs (unit/integration)
  - Pass/Fail Status: table of case→status→notes
  - Coverage Metrics: lines, branches, functions; critical path coverage = 100%
  - Performance Metrics: measured values and thresholds
  - Identified Issues: severity (P0–P3), details, remediation plan
  - Acceptance Criteria: checklist with evidence links
  - Artifacts: code refs, screenshots/logs

## Traceability Model
- IDs:
  - Feature IDs: `FID-*` (e.g., FID-MSG)
  - Test IDs: `T-<FEATURE>-U-###`, `T-<FEATURE>-I-###`
  - Doc IDs: `D-<FEATURE>-###`
- Matrix: maintain a table mapping FID → tests (TIDs) → implementation files → docs; referenced in the plan and per-feature reports.

## Initial Execution Order & Milestones
- Milestone 1: Auth + Profiles approved (FID-AUTH, FID-PROF)
- Milestone 2: Chats + E2EE messaging + Key mgmt approved (FID-CHAT, FID-MSG, FID-KEY)
- Milestone 3: Realtime + Read Receipts + Typing + Presence (FID-RTM, FID-READ, FID-TYPE, FID-PRES)
- Milestone 4: Reactions + Optimistic UI + Pagination + Cache (FID-REACT, FID-OPT, FID-PAG, FID-CACHE)

## Risks & Mitigations
- E2EE correctness: add negative-path tests (wrong passphrase) and payload invariants.
- Realtime stability: reconnection/backoff tests; subscription lifecycle coverage.
- Coverage blind spots: enforce thresholds per module; add mutation tests for crypto-sensitive code if needed.

## Deliverables per Feature
- Minimal viable implementation (SLC-validated).
- Unit + integration tests with coverage report.
- Performance measurements.
- Formal test report (template above) with acceptance checklist.
- Traceability updates (matrix + IDs referenced).
