# TODO (Frontend)

**Current scope:** MVP — auth UI, chat list, 1-on-1 + group chats, real-time messaging, search.

> **For Claude:** Work through phases in order. Each frontend phase depends on the matching backend phase being available. Coordinate with the backend `TODO.md`. Mark items `[x]` only after the work is complete AND verified in the browser.

---

## Phase 0 — Project setup

- [x] Scaffold project with Vite: `npm create vite@latest . -- --template react`
- [x] Install dependencies: `react-router-dom`, `axios`, `@tanstack/react-query`, `zustand`, `socket.io-client`, `react-hook-form`, `zod`, `@hookform/resolvers`, `clsx`, `lucide-react`, `sonner`, `date-fns`
- [x] Install dev dependencies: `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- [x] Configure Tailwind (`tailwind.config.js`, `postcss.config.js`, directives in `index.css`)
- [x] Configure Vite path alias `@` → `src/`
- [x] Create folder structure exactly as defined in `CLAUDE.md`
- [x] Set up `.env.example` and `.gitignore` (ignore `.env`, `node_modules`, `dist/`)
- [x] Create `src/config/env.js` — validate required env vars
- [x] Create `src/api/client.js` — axios instance with `baseURL` from env
- [x] Set up TanStack Query provider in `main.jsx`
- [x] Set up Sonner toast provider in `App.jsx`
- [x] Set up React Router with a placeholder `/` route
- [x] Verify `npm run dev` starts on a different port than backend (Vite default 5173)
- [x] Configure CORS on backend to allow Vite dev origin

## Phase 1 — Auth UI (depends on Backend Phase 1)

- [x] `src/stores/authStore.js` — Zustand store: `accessToken`, `user`, `setAuth`, `clearAuth`
- [x] `src/api/auth.api.js` — `register`, `login`, `refresh`, `logout`, `me`
- [x] Axios request interceptor — attach `Bearer` token
- [x] Axios response interceptor — on 401, call refresh, retry, redirect to login on failure
- [x] `src/queries/auth.queries.js` — `useLoginMutation`, `useRegisterMutation`, `useLogoutMutation`, `useMeQuery`
- [x] `src/components/auth/LoginForm.jsx` — React Hook Form + Zod schema
- [x] `src/components/auth/RegisterForm.jsx`
- [x] `src/pages/LoginPage.jsx`
- [x] `src/pages/RegisterPage.jsx`
- [x] `src/routes/ProtectedRoute.jsx` — redirect to `/login` if not authed
- [x] Wire routes: `/login`, `/register`, protected `/`
- [x] Verify: register a user, log in, see auth state persist on refresh (via `/me` on app boot)

## Phase 2 — App shell & profile (depends on Backend Phase 2)

- [x] `src/components/ui/` — base components: `Button`, `Input`, `Avatar`, `Spinner`, `Modal`
- [x] `src/components/layout/AppShell.jsx` — sidebar + main content layout
- [x] `src/components/layout/Sidebar.jsx` — placeholder for chat list
- [x] `src/components/layout/Header.jsx` — current user avatar, logout button
- [x] `src/api/user.api.js` — `getProfile`, `updateProfile`, `searchUsers`
- [x] `src/queries/user.queries.js` — `useProfileQuery`, `useUpdateProfileMutation`, `useSearchUsersQuery`
- [x] `src/pages/ProfilePage.jsx` — view + edit own profile (avatar URL, bio)
- [ ] Verify: avatar shows in header, edit profile works, searches return users

## Phase 3 — Chats (depends on Backend Phase 3)

- [x] `src/api/chat.api.js` — `listMyChats`, `createDirectChat`, `createGroupChat`, `getChat`, `addMembers`, `removeMember`, `leaveChat`
- [x] `src/queries/chat.queries.js` — `useChatsQuery`, `useChatQuery`, mutations for create/add/remove/leave
- [x] `src/components/chat/ChatList.jsx` — list of chats with last message preview, unread badge
- [x] `src/components/chat/ChatListItem.jsx`
- [x] `src/components/chat/NewChatModal.jsx` — search users → start direct chat
- [x] `src/components/chat/NewGroupModal.jsx` — name + select members
- [x] `src/components/chat/ChatHeader.jsx` — chat name, members, settings
- [x] `src/components/chat/MembersDrawer.jsx` — manage members (admin only)
- [x] `src/pages/ChatPage.jsx` — `/chats/:chatId` route
- [x] `src/stores/uiStore.js` — track selected chat ID
- [ ] Verify: create direct + group chat, list updates, navigate between chats

## Phase 4 — Messages (depends on Backend Phase 4)

- [x] `src/api/message.api.js` — `getMessages` (paginated), `sendMessage`, `markSeen`, `searchMessages`
- [x] `src/queries/message.queries.js` — `useMessagesQuery` (infinite query), `useSendMessageMutation`, `useMarkSeenMutation`
- [x] `src/components/chat/MessageList.jsx` — virtualized or paginated message list, auto-scroll on new
- [x] `src/components/chat/MessageBubble.jsx` — own vs others styling, timestamp, read receipts
- [x] `src/components/chat/MessageInput.jsx` — textarea with send on Enter, Shift+Enter for newline
- [x] `src/components/chat/DateSeparator.jsx`
- [x] Optimistic updates on send (immediately show message, reconcile with server response)
- [x] Mark messages as seen when chat is open + visible
- [ ] Verify: messages send, persist, paginate; mark seen updates correctly

## Phase 5 — Real-time (depends on Backend Phase 5)

- [x] `src/socket/client.js` — singleton socket, connect with access token, reconnect logic
- [x] `src/socket/events.js` — event name constants (matches backend)
- [x] `src/socket/handlers.js` — incoming event handlers:
  - `message:new` → invalidate or update messages query for that chat, bump chat list order, increment unread if not active chat
  - `message:seen` → update receipt state in messages cache
  - `typing:start` / `typing:stop` → update `typingStore`
  - `presence:update` → update presence map
- [x] `src/stores/socketStore.js` — connection status, typing users per chat, presence map
- [x] `src/hooks/useSocket.js` — connect on mount when authed, disconnect on logout
- [x] `src/components/chat/TypingIndicator.jsx` — shows "X is typing..."
- [x] `src/components/chat/PresenceDot.jsx` — green dot on avatars when online
- [x] Wire MessageInput to emit `typing:start` / `typing:stop` (debounced)
- [ ] Verify: open two browsers, send messages live, see typing + presence + read receipts in real-time

## Phase 6 — Search & polish

- [x] `src/components/chat/SearchBar.jsx` — global message search with debounce
- [x] `src/pages/SearchPage.jsx` or modal — show results grouped by chat, click to jump
- [x] Empty states for: no chats, no messages, no search results
- [x] Loading skeletons for chat list and message list
- [x] Error toasts on mutation failures
- [x] Dark mode toggle (Zustand uiStore + Tailwind `dark:` classes)
- [x] Responsive layout (mobile sidebar drawer, full-screen chat on small screens)
- [ ] Smoke test: full flow (register → login → create group → send + search → mark seen → reload, state persists)

---

## Definition of Done (per task)

A task is `[x]` only when:
- Code follows the layered architecture in `CLAUDE.md`
- Server data goes through TanStack Query — never stored in Zustand
- API calls go through `api/` — never `axios` directly in components
- Loading and error states are handled
- Tailwind classes are used (no custom CSS unless justified)
- Manually verified in the browser
