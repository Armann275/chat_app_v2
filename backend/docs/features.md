# Features Roadmap

Full feature list for the chat messenger, organized by tier. This is a living roadmap — features move between tiers as priorities change. The currently active scope lives in `TODO.md`.

> **For Claude:** This document is the *what* — the product vision. It is NOT a build instruction. Only build features that are listed in `TODO.md`. Use this file as reference when designing data models or APIs that need to anticipate future features.

---

## Tier 0 — MVP (current)

The minimum to call it a chat app. See `TODO.md` for active tasks.

- User authentication (register, login, logout, refresh)
- User profile (username, email, avatar, bio)
- 1-on-1 chats
- Group chats (create, add/remove members, leave)
- Real-time message delivery (Socket.io)
- Message persistence in PostgreSQL
- Typing indicators
- Online/offline presence
- Read receipts (delivered, seen)
- Unread message counts
- Basic full-text search across messages
- Push-style notifications via socket events
- REST API for all non-realtime operations

---

## Tier 1 — v1 (next)

Polish and expected features for a "real" chat app.

### Messaging
- Message edit (with edited indicator)
- Message delete (for me / for everyone)
- Message reactions (emoji)
- Reply to a specific message (quoted reply)
- Message threads
- @mentions with notification triggers
- Message forwarding
- Pinned messages (per chat)
- Starred/saved messages (per user)
- Drafts (server-synced)

### Media
- Image upload + inline preview
- Video upload + inline player
- File upload (documents, etc.)
- Voice messages (record, upload, play)
- Link previews (Open Graph)
- GIFs / sticker support

### UX
- Dark mode flag in user prefs
- Per-chat mute / snooze
- Archive chats
- Custom notification rules per chat

### Sync
- Multi-device sync (web, mobile, desktop)
- Offline outbound queue
- Cross-device read state

---

## Tier 2 — v2

Trust, scale, and richer collaboration.

### Voice & video
- 1-on-1 voice calls (WebRTC)
- 1-on-1 video calls
- Group calls (via SFU — LiveKit or mediasoup)
- Screen sharing
- Call history, missed call notifications

### Security
- End-to-end encryption (Signal Protocol / `libsignal`)
- 2FA (TOTP)
- Disappearing messages (auto-delete after N seconds)
- Block & report user
- Privacy controls (last seen, profile photo visibility)
- Session management (active devices, revoke)
- Encrypted backups

### Groups
- Admin / moderator roles
- Granular permissions (invite, post, pin, etc.)
- Invite links with expiry
- Join requests
- Channels (broadcast-style, read-only for non-admins)
- Polls
- Group rules / description

### Bots & integrations
- Bot API
- Webhooks
- Slash commands
- OAuth integrations (GitHub, Calendar, etc.)

---

## Tier 3 — v3

Differentiators.

### AI features
- Smart replies
- Long-thread summarization
- Real-time message translation
- Voice message transcription
- Semantic search ("find that link about pricing")
- AI assistant inside a chat
- Tone rewrite suggestions
- Meeting notes from voice/video calls

### Operations
- Admin dashboard
- Analytics
- Audit logs
- Advanced anti-spam / abuse detection
- Rate limiting per user / per IP

### Discovery
- Public communities
- Username search
- QR code add
- Contact import
- "People you may know"

---

## Cross-cutting (apply at every tier)

These are not tier-specific — they should be considered whenever building.

- Input validation (express-validator)
- Centralized error handling with domain errors
- Structured logging with correlation IDs
- Rate limiting on auth and message endpoints
- Soft deletes where appropriate (messages, users)
- Pagination for all list endpoints
- Internationalization-ready strings (no hardcoded user-facing text in MVP, but design for it)
