# CLAUDE.md (Frontend)

Persistent project context for the React frontend. Read this at the start of every session.

## Project

Web client for the chat messenger. Talks to the backend via REST for standard operations and Socket.io for real-time messaging.

## Project Context (read these when relevant)

- @TODO.md — current scope and active tasks. Always check this before building anything.
- @docs/features.md — full feature roadmap. Reference when designing components or state shape that need to anticipate future work. Do NOT build anything from this file unless it's also in `TODO.md`.
- @../backend/docs/features.md — backend feature roadmap (for understanding API contracts).

**Build only what's in `TODO.md`.** If a user asks for something outside it, confirm before adding it.

## Tech Stack

- **Framework:** React 18+ (with Vite as the build tool)
- **Language:** JavaScript (ES Modules)
- **Routing:** React Router v6+
- **Styling:** Tailwind CSS (utility-first, no custom CSS unless absolutely necessary)
- **State management:** 
  - **Server state:** TanStack Query (React Query) — for all REST API data
  - **Client state:** Zustand — for auth, UI state, socket connection state
  - **Local component state:** `useState` / `useReducer`
- **HTTP client:** Axios (with interceptors for auth + token refresh)
- **Real-time:** `socket.io-client`
- **Forms:** React Hook Form + Zod for validation
- **Icons:** lucide-react
- **Notifications/toasts:** sonner
- **Testing:** Vitest + React Testing Library
- **Config:** All env-specific values come from `import.meta.env.VITE_*`. Never hardcode URLs or secrets.

## Folder Structure

```
src/
  api/                 # axios instance, interceptors, endpoint functions
    client.js          # axios instance with baseURL + interceptors
    auth.api.js        # login, register, refresh, logout, me
    user.api.js        # getProfile, updateProfile, searchUsers
    chat.api.js        # listChats, createChat, getChat, addMembers
    message.api.js     # getMessages, sendMessage, markSeen, search
  components/
    ui/                # generic, reusable, no business logic (Button, Input, Modal, Avatar)
    layout/            # AppShell, Sidebar, Header
    chat/              # ChatList, ChatWindow, MessageBubble, MessageInput, TypingIndicator
    auth/              # LoginForm, RegisterForm
  hooks/               # custom hooks (useAuth, useSocket, useChat, useMessages)
  pages/               # route-level components (LoginPage, ChatPage, ProfilePage)
  stores/              # Zustand stores (authStore, socketStore, uiStore)
  queries/             # TanStack Query hooks (useChatsQuery, useMessagesQuery, useSendMessage)
  socket/              # socket.io-client setup + event handlers
    client.js          # socket instance, connect/disconnect logic
    events.js          # event name constants
    handlers.js        # incoming event → store/query updates
  utils/               # generic helpers (formatDate, classNames, etc.)
  config/              # env loader, constants
    env.js             # validates and exports import.meta.env values
  routes/              # router config + ProtectedRoute wrapper
  App.jsx
  main.jsx
  index.css            # Tailwind directives only
public/
.env.example
.env                   # NEVER committed
tailwind.config.js
vite.config.js
```

## Architectural Rules (STRICT)

### Layer flow

```
Page → Component(s) → Query/Mutation hook (TanStack Query) → API function (axios) → Backend
                   ↘ Zustand store (for client state only)
                   ↘ Custom hook (composes queries + stores)
```

### `api/` layer
- Pure functions: take args, return promise of data.
- NO React hooks here.
- NO state. NO side effects beyond the HTTP call.
- Use the shared axios `client.js`. Never call `axios` directly.
- Throw on non-2xx (axios does this by default).

### `queries/` layer (TanStack Query)
- Wraps API functions in `useQuery` / `useMutation`.
- Owns cache keys, stale time, invalidation logic.
- This is where server state lives — NOT in Zustand.
- Naming: `useChatsQuery`, `useMessagesQuery`, `useSendMessageMutation`.

### `stores/` layer (Zustand)
- ONLY for client state: auth tokens, current chat selection, UI state (sidebar open, theme).
- NEVER store server data here. Server data lives in TanStack Query cache.
- Each store is a single file. Small, focused.

### `components/ui/`
- Generic, reusable, presentational.
- No API calls. No store reads (except theme/UI). No business logic.
- Props in, JSX out.

### `components/<feature>/`
- Feature-specific components.
- Can read from stores and call query hooks.
- Should still be relatively dumb — heavy logic goes in custom hooks.

### `hooks/`
- Custom hooks compose stores + queries + side effects.
- Example: `useChat(chatId)` returns `{ chat, messages, sendMessage, typingUsers, ... }`.
- This is where most of the orchestration happens, NOT in components.

### `pages/`
- One component per route.
- Layouts + composes feature components.
- Minimal logic.

### `socket/`
- Single socket instance, created after auth.
- Disconnect on logout.
- Incoming events update either Zustand stores OR invalidate/update TanStack Query cache directly (`queryClient.setQueryData`).
- Outgoing events go through dedicated functions, not raw `socket.emit` from components.

## Authentication & Token Refresh

- On login: store `accessToken` in Zustand (in-memory). Refresh token is httpOnly cookie set by backend (no JS access).
- Axios request interceptor: attach `Authorization: Bearer <accessToken>`.
- Axios response interceptor: on 401, call `/auth/refresh`, retry original request with new token. If refresh fails, redirect to login.
- ProtectedRoute component: redirect to `/login` if `!accessToken`.
- Socket auth: pass `accessToken` in `socket.handshake.auth.token` on connect.

## Error Handling

- Axios errors propagate to TanStack Query, which exposes `isError` and `error`.
- Components display errors via toast (sonner) for transient failures, or inline UI for form errors.
- Global error boundary at the App level for uncaught render errors.
- NEVER swallow errors silently. NEVER log to console in production code (only `logger.js` if you set one up — for now, console is fine in dev).

## Styling (Tailwind)

- Use Tailwind utility classes directly in JSX.
- Avoid arbitrary values (`w-[437px]`) unless truly necessary — use the scale.
- Extract repeated class strings into variables or a `cn()` helper, not into custom CSS.
- Dark mode support via `dark:` variants from day one (driven by `class` strategy).
- Use `clsx` or a small `cn()` util for conditional classes.
- Component variants (button sizes, etc.) handled via prop → conditional class strings, not CSS.

## Forms (React Hook Form + Zod)

- Every form uses `useForm` with a Zod schema as the resolver.
- Schema lives next to the form component or in a `schemas/` subfolder.
- Validation messages come from the schema, not hardcoded in components.

## Environment Variables

All in `import.meta.env`, prefixed with `VITE_`. Validate in `src/config/env.js` and fail fast.

Required:
```
VITE_API_BASE_URL=http://localhost:3010
VITE_SOCKET_URL=http://localhost:3010
```

## Testing (Vitest)

- Unit tests for utils, hooks, and Zustand stores.
- Component tests with React Testing Library for critical UI flows (login form, message send).
- Mock the API layer, not axios directly.
- Naming: `<filename>.test.js(x)`.

## Conventions

- **Naming:** camelCase for variables/functions, PascalCase for components, kebab-case for non-component files.
- **Files:** one component per file. Filename matches component name (`MessageBubble.jsx`).
- **Imports:** absolute imports from `src/` via Vite alias (`@/components/...`).
- **Async:** always async/await.
- **Components:** functional only. No class components.
- **Comments:** explain *why*, not *what*.

## Things Claude Should NOT Do

- Do NOT store server data in Zustand — it goes in TanStack Query cache.
- Do NOT call `axios` directly from components — go through `api/` and `queries/`.
- Do NOT use `useEffect` to fetch data — use TanStack Query.
- Do NOT write custom CSS unless Tailwind genuinely can't do it.
- Do NOT hardcode API URLs, ports, or any env value.
- Do NOT use `localStorage` for the access token (XSS risk) — keep it in memory (Zustand).
- Do NOT skip the loading and error states on queries.
- Do NOT create class components.
- Do NOT install heavy new dependencies without flagging it first.

## When in Doubt

Ask before:
- Adding a new top-level folder under `src/`.
- Introducing a new dependency.
- Bypassing TanStack Query for server data.
- Putting business logic directly in a component.
