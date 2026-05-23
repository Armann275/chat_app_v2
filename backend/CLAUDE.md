# CLAUDE.md

Persistent project context for Claude Code. Read this at the start of every session.

## Project

Real-time chat messenger backend. REST API for standard requests, Socket.io for real-time messaging. Layered architecture with strict separation of concerns.

## Project Context (read these when relevant)

- @TODO.md — current scope and active tasks. Always check this before building anything.
- @docs/features.md — full feature roadmap. Reference when designing models or APIs that need to anticipate future work. Do NOT build anything from this file unless it's also in `TODO.md`.

**Build only what's in `TODO.md`.** If a user asks for something outside it, confirm before adding it (and update `TODO.md` accordingly).

## Tech Stack

- **Runtime:** Node.js (LTS)
- **Language:** JavaScript (ES Modules — `"type": "module"` in `package.json`)
- **Framework:** Express.js
- **Database:** PostgreSQL
- **DB layer:** TypeORM — used **only** for connection management, entity definitions, and migrations. **All queries are raw SQL** via `dataSource.query()` or `queryRunner.query()`. Do NOT use `.find()`, `.save()`, `.findOne()`, the query builder, or any TypeORM repository methods for data access.
- **Real-time:** Socket.io
- **Auth:** JWT with access + refresh tokens
- **Validation:** express-validator
- **Logging:** Winston (with morgan piped into Winston for HTTP logs)
- **Testing:** Jest (unit tests for services and repositories)
- **Config:** All credentials and env-specific values come from `process.env` (loaded via `dotenv`). Never hardcode secrets.

## Folder Structure

Layered, NOT feature-modular. Everything lives under `src/`:

```
src/
  config/              # env loader, db config, logger config, socket config
    env.js             # validates and exports process.env values
    database.js        # TypeORM DataSource setup
    logger.js          # Winston instance
  controllers/         # HTTP handlers — parse req, call service, send res
  services/            # business logic — orchestrates repositories, throws domain errors
  repositories/        # raw SQL queries against PostgreSQL via TypeORM dataSource
  models/              # TypeORM entities (schema definitions only — used for migrations)
  routes/              # Express routers — wires URL → middleware → controller
  middlewares/         # auth, validation runner, request logger, error handler
  validators/          # express-validator chains, grouped by resource
  sockets/             # Socket.io namespaces, event handlers, auth middleware for sockets
  errors/              # domain error classes
  utils/               # generic helpers (jwt, hashing, etc.)
  migrations/          # TypeORM migration files
  app.js               # Express app setup (middlewares, routes, error handler)
  server.js            # entry point — starts HTTP + Socket.io server
tests/
  unit/                # mirrors src/ structure
.env.example           # template, committed
.env                   # NEVER committed (in .gitignore)
```

## Architectural Rules (STRICT)

Layers flow strictly downward. Skipping layers is not allowed.

```
route → middleware → controller → service → repository → DB
                                       ↓
                                    model (entity, schema only)
```

### Routes (`src/routes/`)
- One router file per resource (e.g., `user.routes.js`, `message.routes.js`).
- Wires URL + HTTP method → middlewares (auth, validators) → controller method.
- Contains NO logic. No DB calls, no business rules, no try/catch.

### Controllers (`src/controllers/`)
- Receive `req`, extract data, call exactly ONE service method, send response.
- MUST NOT contain business logic.
- MUST NOT call repositories directly.
- MUST NOT catch errors — let them bubble to the error middleware. Use `express-async-errors` or wrap async handlers so errors propagate.
- Response shape is consistent: `{ success: true, data: ... }` on success.

### Services (`src/services/`)
- All business logic lives here.
- Orchestrates one or more repositories.
- Throws domain errors (from `src/errors/`) — never returns error objects, never sends responses.
- Pure-ish: no `req`/`res` knowledge.
- One service per resource (e.g., `user.service.js`, `message.service.js`).

### Repositories (`src/repositories/`)
- Single responsibility: read from / write to the database.
- ALL queries are raw SQL using `dataSource.query(sql, params)`.
- Use parameterized queries — NEVER concatenate user input into SQL.
- Return plain objects (rows). Do not throw domain errors here — throw on infrastructure failures only; let services interpret "not found" etc.
- One repository per table/aggregate.

### Models (`src/models/`)
- TypeORM entities, used ONLY for migrations and schema documentation.
- Repositories do NOT import these for queries. Queries are raw SQL.

### Middlewares (`src/middlewares/`)
- `auth.middleware.js` — verifies JWT access token, attaches `req.user`.
- `validate.middleware.js` — runs express-validator result, throws `ValidationError` on fail.
- `requestLogger.middleware.js` — assigns correlation ID, logs request via Winston.
- `error.middleware.js` — the ONE central error handler. Must be registered last.

### Validators (`src/validators/`)
- express-validator chains exported per route.
- Grouped by resource (e.g., `user.validator.js` exports `registerValidator`, `loginValidator`).

### Sockets (`src/sockets/`)
- Socket.io connection handler in `index.js`.
- One file per namespace/feature (e.g., `chat.socket.js`).
- Socket auth middleware verifies JWT from handshake.
- Socket handlers call services — same rule as controllers, no business logic in the handler.

## Error Handling

### Domain error classes (`src/errors/`)
All custom errors extend a base `AppError`. Each has:
- `statusCode` (HTTP status)
- `code` (machine-readable string, e.g., `USER_NOT_FOUND`)
- `message` (human-readable)
- `isOperational = true` (distinguishes expected errors from bugs)

Required classes (add more as needed):
- `AppError` — base
- `ValidationError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `InternalError` (500)

### Central error middleware
- Registered LAST in `app.js`.
- If error is an `AppError` → respond with `{ success: false, code, message }` and the right status code.
- If unknown error → log full stack with Winston at `error` level, respond with generic 500.
- ALWAYS log the error with the request's correlation ID.

### Rules
- Services throw domain errors. Controllers do not catch them.
- Never send raw error messages from unknown errors to the client (leak risk).

## Logging (Winston)

### Setup (`src/config/logger.js`)
- Levels: `error`, `warn`, `info`, `http`, `debug`.
- Transports:
  - Console (pretty format in dev, JSON in prod)
  - File: `logs/error.log` (error only)
  - File: `logs/combined.log` (all levels)
- Each log line includes: timestamp, level, message, correlation ID (when available), metadata.

### Request logging
- Morgan piped into Winston at `http` level via a stream.
- Each request gets a correlation ID (UUID) attached to `req.id`, included in all logs for that request.

### What to log
- `info`: server start, DB connection, successful auth events.
- `http`: every HTTP request (status, method, url, duration).
- `warn`: validation failures, auth failures, expected error conditions.
- `error`: unhandled errors, DB failures, anything 5xx.
- `debug`: query details (dev only).

### What NEVER to log
- Passwords, raw tokens, refresh tokens, full request bodies for auth endpoints.

## Authentication (JWT)

- **Access token:** short-lived (e.g., 15 min), sent in `Authorization: Bearer <token>` header.
- **Refresh token:** long-lived (e.g., 7 days), stored in DB (hashed) and sent as httpOnly cookie OR in body — pick one and stick with it.
- **Endpoints:** `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`.
- On refresh: rotate the refresh token (issue new one, invalidate old).
- On logout: invalidate the refresh token in DB.
- Auth middleware verifies access token only; refresh logic lives in the auth controller/service.
- Socket.io auth: client sends access token in `socket.handshake.auth.token`, verified in socket middleware.

## Environment Variables

All in `process.env`, loaded via `dotenv` at the very top of `server.js`. Validate presence in `src/config/env.js` and fail fast on startup if any required var is missing.

Required vars (keep `.env.example` in sync):
```
NODE_ENV=
PORT=
DATABASE_URL=         # or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=
LOG_LEVEL=
CORS_ORIGIN=
```

## Database (TypeORM + Raw SQL)

- DataSource configured in `src/config/database.js` from env vars.
- Entities in `src/models/` defined with TypeORM decorators or schema syntax — purely for migrations.
- `synchronize: false` ALWAYS. Schema changes go through migrations only.
- Migrations in `src/migrations/`, run via TypeORM CLI scripts in `package.json`.
- Repositories execute raw SQL like:
  ```js
  const rows = await dataSource.query(
    'SELECT id, username, email FROM users WHERE id = $1',
    [userId]
  );
  ```
- Always parameterized. No string concatenation in SQL.

## Testing (Jest)

- Unit tests for services and repositories.
- Tests mirror `src/` structure under `tests/unit/`.
- Mock repositories when testing services. Mock the DB driver when testing repositories.
- Naming: `<filename>.test.js`.
- Run with `npm test`.

## Conventions

- **Naming:** camelCase for variables/functions, PascalCase for classes, kebab-case for filenames with dot-suffix for layer (`user.service.js`, `message.controller.js`).
- **Imports:** absolute imports from `src/` if path aliases are set up; otherwise relative.
- **Async:** always async/await, never raw promises with `.then()`.
- **Functions:** small, single-purpose. If a service method exceeds ~40 lines, consider splitting.
- **Comments:** explain *why*, not *what*. Code should be self-documenting.

## Things Claude Should NOT Do

- Do NOT use TypeORM `.find()`, `.save()`, `.findOne()`, repository pattern, or query builder. Raw SQL only.
- Do NOT put business logic in controllers or routes.
- Do NOT call repositories directly from controllers.
- Do NOT catch errors in controllers — let them bubble to the error middleware.
- Do NOT hardcode secrets, URLs, ports, or any env-specific value.
- Do NOT log sensitive data (passwords, tokens, full auth payloads).
- Do NOT use `synchronize: true` on the TypeORM DataSource.
- Do NOT skip parameterized queries.
- Do NOT install heavy new dependencies without flagging it first.

## When in Doubt

Ask before:
- Adding a new top-level folder under `src/`.
- Introducing a new dependency.
- Deviating from the layered flow (route → controller → service → repository).
- Changing the error response shape.
