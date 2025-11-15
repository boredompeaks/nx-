# Components Overview

## Pages
- `CalculatorDecoy`: Calculator shell at `/` with PIN gate to `/login`.
- `Login`, `Register`: Auth screens.
- `Chats`: Lists chats; creates chat.
- `Conversation`: Shows messages, E2EE decrypt, send.
- `Settings`: User preferences.

## Context
- `AuthContext`: Supabase auth state and methods.

## Store
- `realtime`: Subscriptions for messages, typing, reactions, receipts.

## E2EE
- `E2EEPasswordModal`: Derive and store session passphrases.
