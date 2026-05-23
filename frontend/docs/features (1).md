# Features Roadmap (Frontend)

UI feature roadmap for the chat messenger web client. Mirrors the backend roadmap at `../backend/docs/features.md` from the UI perspective. The currently active scope lives in `TODO.md`.

> **For Claude:** Reference doc only. Build only what's listed in `TODO.md`.

---

## Tier 0 — MVP (current)

- Login / register / logout flows
- Auth state persisted across reloads (via `/auth/me` on app boot)
- App shell (sidebar + main pane)
- Chat list with last message preview and unread badge
- New direct chat (search user → start)
- New group chat (name + select members)
- Chat window with paginated message history
- Message input with Enter-to-send
- Optimistic message rendering
- Typing indicators
- Online/offline presence dots
- Read receipts (delivered / seen)
- Real-time updates via Socket.io
- Global message search
- Profile page (view + edit avatar URL, bio)
- Loading skeletons and error toasts
- Dark mode
- Responsive layout (mobile + desktop)

---

## Tier 1 — v1

### Messaging UI
- Edit message (inline) with "edited" indicator
- Delete message (for me / for everyone)
- Emoji reactions (picker + display)
- Reply with quoted preview
- Threads (side panel)
- @mentions (autocomplete in input, highlight in display)
- Forward message picker
- Pinned messages drawer
- Starred messages page
- Drafts (persist per chat)

### Media UI
- Image upload with drag-drop + paste
- Inline image viewer (lightbox)
- Video player
- File attachment with download
- Voice message recorder + waveform player
- Link preview cards
- GIF / sticker picker

### UX
- Per-chat mute toggle
- Archive chats
- Notification settings page
- Keyboard shortcuts (Cmd+K for search, etc.)

### Multi-device
- Sync chat list and unread state across tabs/devices
- Outbound message queue when offline (retry on reconnect)

---

## Tier 2 — v2

### Voice & video
- 1-on-1 call UI (incoming, ringing, in-call)
- Group call grid view
- Screen share UI
- Call history view

### Security
- 2FA setup flow (QR code, backup codes)
- Session/device management page
- Disappearing messages indicator
- Block / report user flows

### Groups
- Roles & permissions UI
- Invite link generation + join page
- Polls UI
- Channels (broadcast UI)

### Bots & integrations
- Bot directory + add bot flow
- Slash command picker
- Rich message cards rendering

---

## Tier 3 — v3

### AI features
- Smart reply suggestions in input
- "Summarize thread" button
- Real-time translation toggle per message
- Voice message transcript display
- Semantic search results
- AI assistant chat UI
- Tone rewrite suggestions
- Meeting notes panel after calls

### Discovery
- Public communities directory
- Username search
- QR code scanner
- Contact import flow

---

## Cross-cutting

- Accessibility (ARIA, keyboard navigation, focus traps in modals, screen reader support)
- Internationalization (i18n) — design for it from MVP, wire up translations in v1
- Performance (code splitting per route, virtualized message list, image lazy load)
- Telemetry (error tracking, basic analytics) — opt-in, privacy-respecting
