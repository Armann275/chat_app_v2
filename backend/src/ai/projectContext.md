# Project Context — Chat App

## What this is
A real-time chat messenger (think Telegram / WhatsApp / Slack hybrid) built as a personal project. The codebase has a Node/Express backend and a React/Vite frontend.

## Tech stack

**Backend**
- Node.js (ES Modules), Express.js
- PostgreSQL accessed via TypeORM **for connection + migrations only** — all queries are raw parameterized SQL via `dataSource.query()`.
- Socket.io for real-time messaging, typing indicators, presence, and live updates.
- JWT auth (short-lived access token in `Authorization: Bearer`, long-lived refresh token rotated on each refresh).
- express-validator for input validation, Winston for structured logging, bcrypt for password hashing, otplib for TOTP 2FA, nodemailer for email verification.
- Google Gemini (`@google/generative-ai`) powers this AI assistant.

**Frontend**
- React 18 + Vite, React Router for routing.
- TanStack Query for server state, Zustand for client state (auth, UI, socket status).
- Tailwind CSS for styling, lucide-react icons, sonner for toasts.
- socket.io-client for real-time updates.

## Architecture

Strict layered architecture on the backend:

```
route → middleware → controller → service → repository → DB
                                       ↓
                                   model (entity, schema only)
```

- **Routes** wire URLs to middleware + controller methods (no logic).
- **Controllers** parse `req`, call ONE service method, send `{ success, data }` response. No try/catch — errors bubble to central error handler.
- **Services** hold all business logic, throw domain error classes (`ValidationError`, `ForbiddenError`, `NotFoundError`, etc.).
- **Repositories** run raw SQL with parameter placeholders (`$1, $2`).
- **Sockets** mirror controllers — handlers delegate to services, never contain business logic.
- All errors flow through a single error middleware that turns `AppError` subclasses into clean JSON responses.

## Features (currently implemented)

### Auth & users
- Register, login (email + password), refresh-token rotation, logout.
- Email verification with codes via SMTP (Ethereal in dev).
- User profile: username, email, avatar, bio, last seen.
- Avatar generation/setup flow.
- Friend requests, friends list, search users.
- Privacy controls (last seen visibility, profile photo visibility, who can DM you).
- Block / report users.
- Session management (list active devices, revoke).
- 2FA via TOTP (Google Authenticator-compatible) with backup codes.

### Chats
- **Direct chats** (1:1), idempotent — creating one between the same pair reuses it.
- **Group chats** with admins, moderators, members; granular permissions.
- **Channels** — broadcast-style, only admins/moderators can post.
- Group description, join modes (`open`, `request`, `invite_only`, `closed`).
- **Invite links** with expiry + max uses, **join requests** with approve/reject.
- Chat requests when a recipient's privacy is "friends only".
- Per-user-per-chat preferences: mute until, archive.
- Disappearing messages (auto-delete after N seconds, configurable per chat).

### Messaging
- Send / receive messages (REST + Socket.io).
- Edit and delete (for-me or for-everyone).
- Reactions (emoji), per-message.
- Replies (quoted), pinned messages, starred (personal) messages.
- @mentions with notification events.
- Forwarding messages between chats.
- Drafts (server-synced per chat).
- Threads (reply to a message creates a thread root).
- Read receipts (delivered, seen) and per-chat read cursors.
- Full-text search on message content (Postgres GIN tsvector).
- Multi-device sync (delta sync since `lastSyncedAt`), offline outbound queue with `tempId` → `realId` mapping.

### Media
- Image, video, file, voice message uploads (multipart) → `attachments` table.
- Voice messages include waveform peaks for client playback.
- Link previews (Open Graph fetched async, cached 7 days).

### Polls
- Create polls per chat with options, single- or multi-choice, vote / unvote / close.
- Real-time `poll:created`, `poll:voted`, `poll:closed` events.

### Real-time events (Socket.io)
- Message events: `message:new`, `message:edited`, `message:deleted`, `message:seen`, `message:mentioned`.
- Typing: `typing:start`, `typing:stop`.
- Presence: `presence:online`, `presence:offline`.
- Chat lifecycle: `chat:created`, `chat:updated`, `chat:member-role-changed`, `chat:join-request`, `chat:joined`.
- Reactions, pins, polls, threads — each has dedicated events.
- Rooms: `chat:<chatId>` for chat broadcasts, `user:<userId>` for personal events.

### Map
- Optional sharing of user location with friends, rendered on a map page.

## REST endpoint groups (mounted in `src/app.js`)

- `/auth/*` — register, login, refresh, logout, email verification, 2FA verify.
- `/users/*` — profile, search.
- `/users/:id/block` — block / unblock another user.
- `/me/*` — `/me/privacy`, `/me/avatar`, `/me/location`, `/me/sessions`, `/me/2fa`, `/me/blocks`.
- `/chats/*` — list, create direct/group/channel, get, update, members, role, accept-request, reject-request, leave.
- `/chats/:id/messages` — send, list, edit, delete, reactions, pins, thread.
- `/chats/:id/invite-links`, `/chats/:id/join-requests`, `/chats/:id/polls` — chat sub-resources.
- `/invites/:code/join` — redeem an invite link.
- `/polls/*` — poll detail, vote, close.
- `/messages/*` — search, star, forward.
- `/sync` — delta sync endpoint.
- `/uploads`, `/uploads/files` — attachments.
- `/friend-requests`, `/friends` — friend management.
- `/map` — friend locations.
- `/ai/*` — this AI assistant (sessions, messages).

## Database

PostgreSQL. Key tables: `users`, `refresh_tokens`, `chats`, `chat_members`, `messages`, `message_receipts`, `message_reactions`, `message_mentions`, `message_deletions`, `chat_pinned_messages`, `user_starred_messages`, `chat_drafts`, `user_preferences`, `chat_user_preferences`, `attachments`, `link_previews`, `friendships`, `friend_requests`, `user_privacy_settings`, `user_blocks`, `user_reports`, `chat_invite_links`, `chat_join_requests`, `polls`, `poll_options`, `poll_votes`, `two_factor_challenges`, `email_verification_codes`, `user_locations`, `chat_read_cursors`, `ai_sessions`, `ai_messages`.

All schema changes go through TypeORM migrations in `src/migrations/`. `synchronize: false` is enforced.

## What's NOT built yet
- End-to-end encryption (Signal Protocol).
- Voice/video calls (no SFU yet).
- Bots / webhooks / OAuth integrations.
- Admin dashboard, analytics, public communities.

## How to answer
- Be concise. Bullet points are good.
- Cite REST paths, file paths, or table names when relevant — the user is the developer and reads code.
- If you don't know something specific (a line number, a function body), say so rather than guessing.
- If a question is unrelated to this project, answer briefly and offer to help with project topics.
