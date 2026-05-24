# TODO

**Current scope:** MVP — auth, 1-on-1 chats, group chats, real-time delivery, basic search.

> **For Claude:** This file is the source of truth for *what to build next*. Work through phases in order. Mark items `[x]` only after the work is complete AND verified (endpoint tested, code reviewed). If something is unclear, ask before implementing.

---

## Phase 0 — Project setup

- [x] Initialize `package.json` with ES Modules (`"type": "module"`)
- [x] Install dependencies: `express`, `typeorm`, `pg`, `dotenv`, `winston`, `morgan`, `jsonwebtoken`, `bcrypt`, `express-validator`, `socket.io`, `uuid`, `cors`, `helmet`, `express-async-errors`
- [x] Install dev dependencies: `jest`, `nodemon`
- [x] Create folder structure exactly as defined in `CLAUDE.md`
- [x] Set up `.env.example` and `.gitignore` (ignore `.env`, `node_modules`, `logs/`)
- [x] Create `src/config/env.js` — load + validate required env vars, fail fast if missing
- [x] Create `src/config/logger.js` — Winston with console + file transports + correlation ID support
- [x] Create `src/config/database.js` — TypeORM DataSource (`synchronize: false`)
- [x] Create `src/middlewares/requestLogger.middleware.js` — attach `req.id`, log via morgan→Winston
- [x] Create `src/errors/` — base `AppError` and all required subclasses
- [x] Create `src/middlewares/error.middleware.js` — central error handler
- [x] Create `src/app.js` — wire middlewares, mount routes, register error handler last
- [x] Create `src/server.js` — start HTTP server + Socket.io
- [x] Set up TypeORM CLI scripts in `package.json` (migration:generate, migration:run, migration:revert)
- [x] Verify the server starts and `GET /health` returns 200

## Phase 1 — Auth

- [x] Define `User` entity in `src/models/user.entity.js` (id, username, email, password_hash, created_at, updated_at)
- [x] Define `RefreshToken` entity (id, user_id, token_hash, expires_at, revoked_at, created_at)
- [x] Generate + run migration for both tables
- [x] `src/repositories/user.repository.js` — raw SQL methods: `createUser`, `findByEmail`, `findById`, `findByUsername`
- [x] `src/repositories/refreshToken.repository.js` — raw SQL methods: `create`, `findByHash`, `revoke`, `revokeAllForUser`
- [x] `src/utils/jwt.js` — `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`
- [x] `src/utils/password.js` — `hash`, `compare` (bcrypt)
- [x] `src/services/auth.service.js` — `register`, `login`, `refresh` (rotate token), `logout`
- [x] `src/validators/auth.validator.js` — register, login chains
- [x] `src/middlewares/validate.middleware.js` — runs validation result, throws `ValidationError`
- [x] `src/middlewares/auth.middleware.js` — verifies access token, attaches `req.user`
- [x] `src/controllers/auth.controller.js` — register, login, refresh, logout, me
- [x] `src/routes/auth.routes.js` — wire routes
- [x] Mount auth router in `app.js`
- [x] Unit tests for `auth.service` (mock repositories)

## Phase 2 — Users & profiles

- [x] Add columns to `User`: `avatar_url`, `bio`, `last_seen_at`
- [x] Migration for new columns
- [x] Repository methods: `updateProfile`, `updateLastSeen`, `searchByUsername`
- [x] `src/services/user.service.js` — `getProfile`, `updateProfile`, `searchUsers`
- [x] `src/controllers/user.controller.js`
- [x] `src/routes/user.routes.js` — `GET /users/me`, `PATCH /users/me`, `GET /users/search?q=...`
- [x] Unit tests for `user.service`

## Phase 3 — Chats (1-on-1 and group)

- [x] Define entities: `Chat` (id, type ['direct'|'group'], name, created_by, created_at), `ChatMember` (chat_id, user_id, role, joined_at)
- [x] Migration
- [x] `src/repositories/chat.repository.js` — `createChat`, `addMember`, `removeMember`, `getChatById`, `getUserChats`, `getMembers`, `findDirectChatBetween`
- [x] `src/services/chat.service.js` — `createDirectChat` (idempotent — reuse if exists), `createGroupChat`, `addMembers`, `removeMember`, `leaveChat`, `listMyChats`, `getChat`
- [x] Authorization: only members can read; only admins can remove others; creator becomes admin in group
- [x] `src/validators/chat.validator.js`
- [x] `src/controllers/chat.controller.js`
- [x] `src/routes/chat.routes.js`
- [x] Unit tests for `chat.service`

## Phase 4 — Messages

- [x] Define `Message` entity (id, chat_id, sender_id, content, created_at, updated_at)
- [x] Define `MessageReceipt` entity (message_id, user_id, delivered_at, seen_at)
- [x] Migration with appropriate indexes (chat_id + created_at, full-text on content)
- [x] `src/repositories/message.repository.js` — `create`, `getByChat` (paginated), `getById`, `searchInChat`, `searchAll`
- [x] `src/repositories/messageReceipt.repository.js` — `markDelivered`, `markSeen`, `getUnreadCount`
- [x] `src/services/message.service.js` — `sendMessage` (verifies membership, persists, returns message), `getMessages`, `markSeen`, `searchMessages`, `getUnreadCounts`
- [x] `src/validators/message.validator.js`
- [x] `src/controllers/message.controller.js`
- [x] `src/routes/message.routes.js` — `POST /chats/:id/messages`, `GET /chats/:id/messages`, `POST /chats/:id/messages/:msgId/seen`, `GET /messages/search`
- [x] Unit tests for `message.service`

## Phase 5 — Real-time (Socket.io)

- [x] `src/sockets/index.js` — Socket.io setup, attach to HTTP server
- [x] `src/sockets/auth.middleware.js` — verify JWT from `socket.handshake.auth.token`
- [x] `src/sockets/chat.socket.js` — handlers for:
  - `chat:join` (join socket rooms for all my chats on connect)
  - `message:send` (delegate to `message.service.sendMessage`, broadcast to chat room)
  - `message:seen` (delegate to service, broadcast receipt)
  - `typing:start`, `typing:stop` (broadcast only, no persistence)
  - `presence:online` / `disconnect` (update `last_seen_at`, broadcast presence)
- [x] On message persisted via REST OR socket → emit to chat room (single source of truth)
- [x] Update `last_seen_at` on disconnect
- [x] Manual integration test: two clients exchange messages, see typing, see presence

## Phase 6 — Search & polish

- [x] PostgreSQL full-text index on `messages.content` (GIN tsvector)
- [x] `searchMessages` uses `ts_rank` for relevance
- [x] Pagination on all list endpoints (limit/cursor or limit/offset — pick one and document)
- [x] Rate limiting middleware on `/auth/*` and message send endpoints
- [x] Verify all logs include correlation IDs
- [x] Smoke test: full flow (register → login → create chat → send → search → mark seen)

---

## Phase 7 — Message edit + delete (Tier 1)

- [x] `messages.edited_at` / `deleted_at` already exist (Phase 4 hook)
- [x] Repository: `editMessage(messageId, content)`, `softDelete(messageId, mode)` (mode: `for_me` | `for_everyone`); `messageDeletion` table for `for_me` per-user hides
- [x] Migration for `message_deletions` table (per-user hide)
- [x] Service: `editMessage` (only sender, only if not deleted, sets `edited_at`), `deleteMessage` (sender → for_everyone soft-delete; non-sender → for_me)
- [x] Validator + controller + routes: `PATCH /chats/:id/messages/:msgId`, `DELETE /chats/:id/messages/:msgId?mode=for_me|for_everyone`
- [x] Real-time events: `message:edited`, `message:deleted`
- [x] `getByChat` filters out `for_me` deletions for the requesting user
- [x] Unit tests

## Phase 8 — Reactions

- [x] Entity + migration: `message_reactions` (message_id, user_id, emoji) PK on (message_id, user_id, emoji)
- [x] Repository: `addReaction`, `removeReaction`, `listForMessage`, `listForChat`
- [x] Service: `addReaction` / `removeReaction` (membership-checked)
- [x] Validator + controller + routes: `POST /chats/:id/messages/:msgId/reactions`, `DELETE .../reactions/:emoji`
- [x] Real-time events: `reaction:added`, `reaction:removed`
- [x] Unit tests

## Phase 9 — Replies + Pinned + Starred

- [x] Add `messages.reply_to_message_id` (nullable, FK to messages.id)
- [x] `chat_pinned_messages` table (chat_id, message_id, pinned_by, pinned_at) — limit 50 per chat?
- [x] `user_starred_messages` table (user_id, message_id, starred_at)
- [x] Repos + services for each, with authz
- [x] Routes: `GET /chats/:id/pins`, `POST /chats/:id/messages/:msgId/pin`, `DELETE .../pin`; `GET /messages/starred`, `POST /messages/:msgId/star`, `DELETE .../star`
- [x] `sendMessage` accepts optional `replyToMessageId`
- [x] Real-time events for pin/unpin
- [x] Unit tests

## Phase 10 — @mentions, forwarding, drafts

- [x] Mentions: extract `@username` from message content at send time; `message_mentions` table; emit `message:mentioned` to mentioned users' personal rooms
- [x] Forwarding: `forwardMessages({ messageIds, toChatIds })` service — copies content + sets `forwarded_from_message_id`
- [x] Drafts: `chat_drafts` table (chat_id, user_id, content, updated_at) UPSERT on save; `GET/PUT /chats/:id/draft`
- [x] Routes + tests for each

## Phase 11 — Threads (bigger; may need to split)

- [x] Add `messages.thread_root_id` (nullable, self-FK)
- [x] Sending a reply with `replyToMessageId` either targets a flat reply (Phase 9) or a thread; promote a flat reply to thread root on first thread reply
- [x] `getThreadMessages(rootId)` paginated
- [x] Update `getByChat` to optionally exclude thread replies (top-level only)
- [x] `GET /chats/:id/messages/:msgId/thread`
- [x] Real-time: thread replies emitted to chat room AND a `thread:<rootId>` room
- [x] Unit tests

## Phase 12 — UX prefs (per-user, per-chat)

- [x] `user_preferences` table: dark_mode, default notification settings (per-user)
- [x] `chat_user_preferences` table: muted_until, archived, notification_override (per-user-per-chat)
- [x] Routes: `GET/PATCH /users/me/preferences`, `GET/PATCH /chats/:id/preferences`x
- [x] Service-level: include `archived`, `muted_until` in `listMyChats`
- [x] Unit tests

## Phase 13 — Media uploads (image, video, file, voice)

- [x] Decision: storage (local disk for dev, S3-compatible API for prod)
- [x] `attachments` table: id, message_id, kind (image|video|file|voice), url, mime, size, width, height, duration_seconds (nullable per-kind)
- [x] Upload endpoint: `POST /uploads` (multipart) → returns attachment ids
- [x] Send message with `attachmentIds: []`
- [x] MIME validation, size limits, server-side image dimensions for previews
- [x] Voice: store waveform peaks (small JSON column) for client playback
- [x] Tests

## Phase 14 — Link previews

- [x] On message send (or in a worker), enqueue link-preview fetch for any URLs in content
- [x] `link_previews` table: url (PK), title, description, image_url, fetched_at
- [x] Cache + 7-day TTL
- [x] Real-time: `message:preview-attached` once fetched
- [x] Tests

## Phase 15 — Multi-device sync, offline queue, cross-device read state

- [x] Sync: client passes `lastSyncedAt`, server returns delta of messages/receipts/edits since that point
- [x] Offline queue: client posts batch of pending messages with client-generated `temp_id`; server returns mapping `{ tempId → realId }`
- [x] Cross-device read state: already partly there via `message_receipts.seen_at` — need a "read up to" cursor per user per chat for efficiency on huge chats
- [x] `chat_read_cursors` table: (user_id, chat_id, last_read_message_id, last_read_at)
- [x] Tests

---

## Phase 16 — Group admin (Tier 2)

Group features from `docs/features.md` Tier 2: granular roles, invite links, join requests, channels, polls, group description.

### 16.1 — Roles, permissions, group description

- [x] Migration: extend `chat_members.role` CHECK to include `moderator`; add `chats.description` (text, nullable, ≤1000 chars); add `chats.join_mode` (varchar(16), default `'invite_only'`, CHECK in `('open','request','invite_only','closed')`)
- [x] Update `chat.entity.js` (chatMember entity needs no schema change)
- [x] Repo: `updateChatInfo(chatId, { name, description })`, `setMemberRole(chatId, userId, role)`, `countAdmins(chatId)`
- [x] Service `chat.service.js`: `updateGroupInfo` (admin only), `setMemberRole` (admin only, cannot demote last admin); update `createGroupChat` to accept `description`
- [x] Add helper `utils/chatPermissions.js`: `canEditChat`, `canManageMembers`, `canPin`, `canPost`, `canManageRoles`, `canManageInvites`
- [x] Wire helper into chat.service (`removeMember`, `leaveChat`) and pin.service (`canPin`)
- [x] Validators: `updateGroupValidator`, `setMemberRoleValidator`
- [x] Controller + routes: `PATCH /chats/:id`, `PATCH /chats/:id/members/:userId/role`
- [x] Real-time: emit `chat:updated`, `chat:member-role-changed` to chat room
- [x] Unit tests for `setMemberRole` and `updateGroupInfo`

### 16.2 — Invite links + join requests

- [x] Migration: `chat_invite_links` + `chat_join_requests` with FKs, status CHECK, and indexes
- [x] Entities for both
- [x] Repos: invite-link CRUD + `incrementUses`; join-request upsertPending/find/listPending/decide
- [x] Service `inviteLink.service.js`: `create`, `list`, `revoke`, `redeem(code, userId)` — honors `join_mode`, expiry, max_uses
- [x] Service `joinRequest.service.js`: `request` (open → instant join; request → pending), `listPending`, `approve`, `reject`
- [x] Routes: `POST/GET /chats/:id/invite-links`, `DELETE /chats/:id/invite-links/:linkId`, `POST /invites/:code/join`, `POST/GET /chats/:id/join-requests`, `POST /chats/:id/join-requests/:userId/approve|reject`
- [x] Real-time: `chat:join-request`, `chat:join-approved/rejected`, `chat:member-added`, `chat:joined`
- [x] Unit tests (25 across both services)

### 16.3 — Channels (broadcast)

- [x] Migration: allow `'channel'` in `chats.type` CHECK
- [x] `createChannel` service entry point
- [x] `message.service.sendMessage` enforces `canPost(chat, role)` — non-moderator/admin posts in channels are 403
- [x] Validators + controller + route: `POST /chats/channel`
- [x] Unit tests (channel-creation + posting gate)

### 16.4 — Polls

- [x] Migration: `polls`, `poll_options`, `poll_votes` with FKs and indexes. Polls are standalone (not message-linked) to keep schema simple
- [x] Entities for all three
- [x] Repo: `createPollWithOptions` (txn), `findById`, `listByChat`, `listOptions`, `tally`, `listUserVotes`, `findOption`, `addVote` (replace on single-choice), `removeVote`, `close`
- [x] Service: `createPoll`, `listForChat`, `getPoll`, `vote`, `unvote`, `closePoll`
- [x] Validators + controller + routes: `POST/GET /chats/:id/polls`, `GET /polls/:pollId`, `POST/DELETE /polls/:pollId/options/:optionId/vote`, `POST /polls/:pollId/close`
- [x] Real-time: `poll:created`, `poll:voted`, `poll:closed`
- [x] Unit tests (14 covering create, vote replace/multi, close authz)

---

## Phase 17 — Security & calls (Tier 2)

Remaining Tier 2 backend items that are tractable without new infrastructure. Out of scope for now: E2E encryption (libsignal), encrypted backups, SFU-backed group calls, bot API, OAuth integrations.

### 17.1 — Block & report user

- [ ] Migration: `user_blocks` (blocker_id, blocked_id, created_at) PK(blocker_id, blocked_id); `user_reports` (id, reporter_id, reported_id, reason, details, created_at, resolved_at)
- [ ] Entities + repos
- [ ] Service `block.service.js`: `block`, `unblock`, `listBlocked`, `isBlocked`
- [ ] Service `report.service.js`: `report` (with rate-limit-friendly upsert per pair)
- [ ] Hook into `chat.service.createDirectChat` to refuse if either side has blocked
- [ ] Hook into `message.service.sendMessage` to refuse if recipient(s) blocked sender (direct chats only)
- [ ] Routes: `POST /users/:id/block`, `DELETE /users/:id/block`, `GET /me/blocks`, `POST /users/:id/report`
- [ ] Unit tests

### 17.2 — Session management

- [ ] Extend `refresh_tokens` with `user_agent`, `ip`, `last_used_at`
- [ ] Repo + service `session.service.js`: `listMine`, `revoke(sessionId)`, `revokeAllExceptCurrent`
- [ ] Capture UA/IP in auth.service.login + refresh, update `last_used_at` on refresh
- [ ] Routes: `GET /me/sessions`, `DELETE /me/sessions/:id`, `POST /me/sessions/revoke-others`
- [ ] Unit tests

### 17.3 — 2FA (TOTP)

- [ ] Add `otplib` dependency
- [ ] Migration: add `users.totp_secret` (text, nullable), `users.totp_enabled_at` (timestamptz, nullable), `users.totp_backup_codes` (jsonb of hashed codes)
- [ ] Service `totp.service.js`: `beginSetup` (returns secret + otpauth URI), `enable(code)`, `disable(code)`, `verify(userId, code)`
- [ ] Update auth.service.login: if user has TOTP enabled, return a `requires2fa: true, twoFactorToken` short-lived token instead of tokens; new endpoint exchanges 2FA code for tokens
- [ ] Routes: `POST /me/2fa/setup`, `POST /me/2fa/enable`, `POST /me/2fa/disable`, `POST /auth/2fa/verify`, `GET /me/2fa/backup-codes/regenerate`
- [ ] Unit tests

### 17.4 — Disappearing messages

- [ ] Migration: `chats.disappearing_seconds` (int, nullable) — when set, messages expire after N seconds
- [ ] Update `message.repository.getByChat` and search to filter out expired messages
- [ ] Settable via existing chat update endpoint (extend `updateGroupInfo` for groups/channels; allow on direct chats via a new endpoint)
- [ ] Real-time: `chat:disappearing-updated`
- [ ] Unit tests

### 17.5 — Privacy controls expansion

- [ ] Migration: extend `user_privacy_settings` with `last_seen_visibility`, `profile_photo_visibility` (varchar, default `'everyone'`, CHECK in `('everyone','friends','nobody')`)
- [ ] Update privacy.service: include the new fields in DTO + update; respect when shaping `publicUser` (mask `lastSeenAt` and `displayAvatarUrl` if viewer not allowed)
- [ ] Helper `applyPrivacy(viewerId, profileUser, settings, friendship)` used by user controllers and chat member listings
- [ ] Unit tests

### 17.6 — Call signaling + call history (no media server)

- [ ] Migration: `calls` (id, chat_id, initiator_id, status, started_at, ended_at, type ['voice'|'video']); `call_participants` (call_id, user_id, joined_at, left_at) PK
- [ ] Service `call.service.js`: `initiate(currentUser, chatId, type)` (direct chats only — group calls need SFU), `accept(callId)`, `reject(callId)`, `hangup(callId)`, `listHistory()`
- [ ] Socket events for WebRTC handshake: `call:offer` (sdp), `call:answer` (sdp), `call:ice-candidate`, `call:ended`, `call:missed`
- [ ] Routes: `POST /chats/:id/calls`, `POST /calls/:id/accept|reject|hangup`, `GET /me/calls`
- [ ] Auto-mark `missed` if not accepted within 30s (in-process timer)
- [ ] Unit tests

---

## Definition of Done (per task)

A task is `[x]` only when:
- Code follows the layered architecture in `CLAUDE.md`
- Raw SQL only — no TypeORM repository/find methods
- Errors use domain error classes and bubble to the central handler
- Sensitive data is not logged
- Unit tests added (where the phase calls for them) and passing
- Manually verified via curl, Postman, or socket client
