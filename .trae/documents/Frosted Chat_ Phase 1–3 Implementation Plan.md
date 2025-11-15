**Scope Overview**
- Make backend real with Supabase, wire the React app to it, and complete real-time and feature gaps per FROSTED_CHAT_COMPLETE_IMPLEMENTATION_PLAN.md.
- Deliver in three phases with verified migrations, API rewrites, frontend integration, realtime, and tests.

**Phase 1: Backend Foundation**
- Database Migrations
  - Create `migrations/0004_core_features.sql` with tables and constraints per plan:
    - `reactions`: `id uuid PK`, `message_id uuid FK messages`, `user_id uuid FK profiles`, `emoji text NOT NULL`, `created_at timestamp DEFAULT now()`, `UNIQUE(message_id, user_id, emoji)`. Index: `message_id`, `user_id`.
    - `read_receipts`: `id uuid PK`, `message_id uuid FK messages`, `user_id uuid FK auth.users`, `conversation_id uuid FK chats`, `read_at timestamp DEFAULT now()`, `created_at/updated_at timestamp DEFAULT now()`, `UNIQUE(message_id, user_id)`. Index: `conversation_id`, `user_id`.
    - `typing_indicators`: `id uuid PK`, `conversation_id uuid FK chats`, `user_id uuid FK profiles`, `is_typing boolean DEFAULT true`, `updated_at/created_at timestamp DEFAULT now()`, `UNIQUE(conversation_id, user_id)`. Add trigger stubs for stale cleanup and `updated_at` bump (to be filled per plan).
    - `message_status`: `id uuid PK`, `message_id uuid FK messages`, `user_id uuid FK profiles`, `is_delivered boolean DEFAULT false`, `is_read boolean DEFAULT false`, `delivered_at/read_at timestamp`, `UNIQUE(message_id, user_id)`. Index: `message_id`, `user_id`.
    - `hidden_messages`: `id uuid PK`, `message_id uuid FK messages`, `hidden_by_user_id uuid FK profiles`, `hidden_at timestamp DEFAULT now()`, `user_id uuid FK profiles`, `conversation_id uuid FK chats`, `created_at timestamp DEFAULT now()`. Index: `user_id`, `conversation_id`.
  - Create `migrations/0005_webrtc.sql` for WebRTC engine:
    - `webrtc_signals`: `id uuid PK DEFAULT gen_random_uuid()`, `room_id text NOT NULL`, `from_user text NOT NULL`, `to_user text NOT NULL`, `signal_type text CHECK (signal_type IN ('offer','answer','ice-candidate','renegotiate','bye'))`, `signal_data jsonb NOT NULL`, `timestamp timestamp DEFAULT now()`. Indexes on `(room_id)`, `(to_user, room_id)`. Matches usage in `src/engine/SignalingClient.ts:186`.
    - `webrtc_presence`: `id uuid PK DEFAULT gen_random_uuid()`, `room_id text NOT NULL`, `user_id text NOT NULL`, `status text CHECK (status IN ('joined','left'))`, `last_heartbeat timestamp DEFAULT now()`, `UNIQUE(room_id, user_id)`. Matches upsert and filters in `src/engine/SignalingClient.ts:239` and `:132`.
  - Apply migrations using Supabase (MCP/CLI or SQL editor) against the target project.

- Backend API Rewrite (`src/server/index.ts`)
  - Replace in-memory stores at `src/server/index.ts:97–104` with Supabase CRUD. Initialize server-side Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env.
  - Add lightweight auth middleware to read `Authorization: Bearer` and resolve `user.id` via Supabase; use it for `created_by`, `sender_id`, and access control checks.
  - Endpoints
    - `POST /chats`: Insert into `chats` (generate `id` server-side) and add creator to `chat_participants`. Return full chat.
    - `GET /chats`: Query chats joined by current user via `chat_participants` join, return list with metadata.
    - `POST /messages`: Encrypt content when `is_encrypted` per plan, insert into `messages`, set `delivered_at` and insert a `message_status` row for recipients. Publish realtime via Supabase.
    - `GET /messages`: Fetch by `chat_id` with pagination (50 per page) and filter out `hidden_messages` for current user.
    - `POST /reactions` and `GET /reactions`: Write/read `reactions` with unique constraint handling.
    - `POST /read-receipts` and `GET /read-receipts`: Upsert per-user read receipt, update `messages.read_at` when appropriate, update `message_status.is_read/read_at`.
    - `POST /typing` and `GET /typing`: Upsert `typing_indicators` with `updated_at` bump; cleanup stale via trigger.
    - `GET /message-status`: Read from `message_status` and aggregate delivered/read indicators.
    - Preserve existing security middleware, validation (`src/server/validation.ts`), and error handling (`src/server/errorHandler.ts`). Ensure inputs map to DB columns.
  - Realtime: Ensure all inserts/updates trigger Supabase Realtime (channels already observed by frontend and `SignalingClient` for WebRTC).

- Backend Tests
  - Convert `tests/server_endpoints.test.ts` from in-memory harness to integration tests against a test Supabase project or schema.
  - Test cases
    - Chat create/list
    - Message send/list (with optimistic replacement and pagination)
    - Reaction add/list
    - Read receipts add/list and message_status updates
    - Typing set/list lifecycle
    - Presence list (backed by profiles/presence tables)
  - Setup and teardown: create per-test chat/users, clean rows after tests to avoid residue.

**Phase 2: Core Chat Functionality**
- Frontend API wiring
  - `web/src/pages/Chats.tsx`: Keep `/chats` calls; parse real DB payload shapes, include unread counts and last activity when available.
  - `web/src/pages/Conversation.tsx`: On send, encrypt content before POST; on load, decrypt where `is_encrypted=true`. Replace hardcoded UI placeholders (typing indicator, status checkmarks) with API-backed data.
- End-to-End Encryption (browser)
  - Implement Web Crypto AES-CBC version of `deriveChatKey`, `encryptMessage`, `decryptMessage` for the browser; use `sessionStorage` password via `E2EEPasswordModal.tsx`. Maintain compatibility with backend schema (`messages.content` stores encrypted payload).
- Real-time Store
  - Expand `web/src/store/realtime.ts`:
    - Messages channel: already subscribes on INSERT; add UPDATE/DELETE to handle deletions and one-time view logic.
    - Typing channel: already listens to `typing_indicators`; add auto-clear logic client-side with 3s timer.
    - Reactions: subscribe to `reactions` INSERT/DELETE; merge counts.
    - Read receipts: subscribe to `read_receipts` to update local `message_status` UI.
    - Presence: subscribe to profiles/presence signals to update online/away indicators.
  - Ensure subscribe/unsubscribe lifecycle matches plan, using per-chat channels.
- WebRTC readiness
  - With `webrtc_signals` and `webrtc_presence` in place, verify `src/engine/SignalingClient.ts` joins and reacts to database changes, and heartbeat works.

**Phase 3: Testing & Feature Completion**
- Frontend Testing
  - Add dependencies: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`.
  - Write tests for:
    - `web/src/context/AuthContext.tsx`: auth flows, logout cleanup, session persistence.
    - `web/src/pages/Conversation.tsx`: message send (optimistic), realtime update handling, decryption with correct/incorrect password.
    - `web/src/components/E2EEPasswordModal.tsx`: validation (min 8 chars), storage, unlock callback.
  - Configure `vitest` environment with `jsdom` and RTL.
- Feature Completion (priority order)
  - User Profiles: CRUD UI bound to `profiles` with realtime (presence badges, avatar, status).
  - Message Reactions: full emoji picker and toggle logic; aggregate display on `Conversation`.
  - Read Receipts: mark on scroll/view; UI indicators (✓ sent, ✓✓ delivered, ✓✓ blue read).
  - WebRTC Voice/Video: integrate `CallEngine` with `SignalingClient` and UI buttons; test offer/answer, ICE flow.

**Security & Quality**
- Follow plan’s RLS and validation; never log secrets; load env vars from `.env`.
- Add indexes for performance per high-traffic tables (messages, reactions, read_receipts, message_status, typing_indicators, webrtc_*).
- Keep code style consistent with existing imports, ESM, and middleware patterns.

**Verification**
- Migrations: run and verify tables exist; insert sample data; confirm realtime events fire.
- Backend: run integration tests; manual curl checks; check error handling.
- Frontend: run vitest coverage; manual dev run to validate realtime and E2EE.
- WebRTC: verify signals/presence channels with two users; heartbeat updates.

**Key Code References**
- In-memory backend to replace: `src/server/index.ts:97–104`
- WebRTC DB usage: `src/engine/SignalingClient.ts:101–121`, `:127–147`, `:186–193`, `:239–251`, `:270–276`
- Frontend data fetching: `web/src/pages/Chats.tsx:14–18`, `web/src/pages/Conversation.tsx:19–38`
- Realtime store scaffold: `web/src/store/realtime.ts:22–44`
- Validation/Error handling: `src/server/validation.ts`, `src/server/errorHandler.ts`
- E2EE primitives (server-side reference): `src/crypto/e2ee.ts`

Confirm to proceed and I will create the migrations, apply them, rewrite the backend API, and implement the tests, then move to Phase 2 and 3 with verified changes.