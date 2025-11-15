# Frosted Chat API

## Auth
- Authorization: `Bearer <token>` required for POST endpoints.

## Chats
- `GET /chats`
- `POST /chats` body: `{ name?: string, is_group?: boolean }`

## Messages
- `GET /messages?chat_id=<uuid>`
- `POST /messages` body: `{ chat_id, content, content_type?, reply_to_id?, media_url?, disappear_after?, disappears_at?, is_one_time_view? }`
- `GET /message-status?message_id=<uuid>`

## Reactions
- `GET /reactions?message_id=<uuid>`
- `POST /reactions` body: `{ message_id, emoji }`

## Read Receipts
- `GET /read-receipts?message_id=<uuid>`
- `POST /read-receipts` body: `{ message_id }`

## Typing
- `GET /typing?chat_id=<uuid>`
- `POST /typing` body: `{ chat_id, is_typing }`

## Presence
- `GET /presence`
- `POST /presence` body: `{ status: 'online'|'offline'|'away' }`

## Health & Metrics
- `GET /health`
- `GET /metrics`
