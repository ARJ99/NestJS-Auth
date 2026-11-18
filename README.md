# NestJS Auth API

A production-style authentication boilerplate built with **NestJS 12**, **Drizzle ORM**, and
**PostgreSQL (Neon serverless)**. It covers the full auth lifecycle: registration with email
verification, login, JWT access/refresh token rotation with httpOnly cookies, role-based access
control, and password reset — fully documented with an interactive Swagger UI.

## Features

- ✅ **Register / Login** — bcrypt password hashing (cost 12)
- ✅ **Email verification** — 24-hour verification tokens, auto-login on verify
- ✅ **JWT auth** — short-lived access tokens + rotating refresh tokens
- ✅ **Refresh token rotation** — httpOnly cookie, bcrypt-hashed at rest in the database
- ✅ **Role-based access control** — global `JwtAuthGuard` + `RolesGuard` (`user` / `admin`)
- ✅ **Password reset** — forgot/reset flow with 1-hour tokens and anti-enumeration responses
- ✅ **Transactional email** — verification & reset emails via [Resend](https://resend.com)
- ✅ **Validation** — global `ValidationPipe` with whitelist + transform
- ✅ **Uniform error envelope** — global exception filter
- ✅ **OpenAPI docs** — Swagger UI served at `/api/docs`

## Tech Stack

| Layer          | Technology                                                        |
| -------------- | ----------------------------------------------------------------- |
| Framework      | NestJS 12 (Express), TypeScript 6 (ES2023, strict mode)           |
| Database       | PostgreSQL via [Neon](https://neon.tech) serverless driver        |
| ORM            | Drizzle ORM + drizzle-kit (push-based schema management)          |
| Authentication | `@nestjs/jwt` (HS256) + `bcryptjs` — hand-rolled guards, no Passport |
| Email          | Resend HTTP API (`resend`)                                        |
| API docs       | `@nestjs/swagger` + `swagger-ui-express`                          |
| Validation     | `class-validator` / `class-transformer`                           |
| Testing        | Jest 30 + Supertest                                               |
| Lint / Format  | oxlint (type-aware) / Prettier                                    |

## Getting Started

### Prerequisites

- **Node.js ≥ 24** (the project targets ES2023 and runs Jest with `--experimental-vm-modules`)
- Yarn or npm
- A **Neon / PostgreSQL** connection string
- A **Resend** API key (for verification & password-reset emails)

### 1. Install dependencies

```bash
git clone <repo-url>
cd nestjs-auth
yarn install
```

### 2. Configure environment variables

Copy the template and fill in your values:

```bash
cp .env.template .env
```

| Variable                | Purpose                                          | Example value          |
| ----------------------- | ------------------------------------------------ | ---------------------- |
| `DATABASE_URL`          | Neon PostgreSQL connection string                | `postgres://...`       |
| `JWT_ACCESS_SECRET`     | HMAC secret for access tokens                    | (random strong string) |
| `JWT_REFRESH_SECRET`    | HMAC secret for refresh tokens                   | (random strong string) |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime                            | `15m`                  |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token lifetime                           | `7d`                   |
| `RESEND_API_KEY`        | Resend API key for transactional email           | `re_...`               |
| `APP_URL`               | Base URL used in email verification/reset links  | `http://localhost:3000`|
| `PORT`                  | HTTP port                                        | `3000`                 |

> ⚠️ Use **different** secrets for access and refresh tokens in production.

### 3. Push the database schema

```bash
yarn db:push        # apply src/db/schema.ts to your database
```

Other drizzle-kit commands available: `db:generate`, `db:migrate`, `db:studio`.

### 4. Run the app

```bash
# development (watch mode)
yarn start:dev

# production
yarn build && yarn start:prod
```

- API base URL: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`

## Available Scripts

| Script            | Description                              |
| ----------------- | ---------------------------------------- |
| `start:dev`       | Start in watch mode                      |
| `start:debug`     | Start in debug + watch mode              |
| `start:prod`      | Run the compiled build (`node dist/main`)|
| `build`           | Compile to `dist/`                       |
| `test`            | Run unit tests (Jest)                    |
| `test:e2e`        | Run e2e tests                            |
| `test:cov`        | Run tests with coverage                  |
| `lint`            | Lint with oxlint (type-aware)            |
| `format`          | Format with Prettier                     |
| `db:push`         | Push Drizzle schema to the database      |
| `db:generate`     | Generate Drizzle migrations              |
| `db:migrate`      | Apply Drizzle migrations                 |
| `db:studio`       | Open Drizzle Studio                      |

## API Reference

Base URL: **`/api`** — all request bodies are JSON. DTOs are validated globally
(unknown fields are rejected with `400`).

| Method | Path                        | Auth         | Description                                        |
| ------ | --------------------------- | ------------ | -------------------------------------------------- |
| POST   | `/api/auth/register`        | Public       | Create an account & receive a verification email   |
| GET    | `/api/auth/verify-email`    | Public       | Verify email via `?token=...`, auto-login          |
| POST   | `/api/auth/login`           | Public       | Authenticate, receive tokens + refresh cookie      |
| POST   | `/api/auth/refresh`         | Cookie       | Rotate refresh token, get a new access token       |
| POST   | `/api/auth/logout`          | Bearer JWT   | Invalidate refresh token & clear cookie            |
| GET    | `/api/auth/me`              | Bearer JWT   | Get the current user's profile                     |
| POST   | `/api/auth/forgot-password` | Public       | Request a password-reset email                     |
| POST   | `/api/auth/reset-password`  | Public       | Set a new password using a reset token             |

### `POST /api/auth/register`

```json
{ "name": "John Doe", "email": "john@example.com", "password": "password123" }
```

- `password`: min 8 characters
- **201** → `{ "message": "Registration Successfull. Please check your email to verify your account" }`
- **409** if the email is already registered
- A verification email is sent with a 24-hour token

### `GET /api/auth/verify-email?token=<token>`

- Verifies the account, clears the token, and **logs the user in immediately**
- **200** → `{ "message": "...", "accessToken": "...", "user": { "id", "email", "name", "role" } }`
- Also sets the `refresh_token` httpOnly cookie

### `POST /api/auth/login`

```json
{ "email": "john@example.com", "password": "password123" }
```

- **200** → `{ "accessToken": "...", "user": { "id", "email", "name", "role" } }`
- Sets the `refresh_token` httpOnly cookie
- **401** for invalid credentials **or** unverified email

### `POST /api/auth/refresh`

- Requires the `refresh_token` cookie (no body)
- Validates and **rotates** the refresh token (old one is invalidated, new cookie set)
- **200** → `{ "accessToken": "..." }`

### `POST /api/auth/logout` 🔒

- Requires `Authorization: Bearer <accessToken>`
- Nulls the stored refresh token hash and clears the cookie
- **200** → `{ "message": "Logged out successfully" }`

### `GET /api/auth/me` 🔒

- Requires `Authorization: Bearer <accessToken>`
- **200** → `{ "id", "email", "name", "role", "isVerified" }`

### `POST /api/auth/forgot-password`

```json
{ "email": "john@example.com" }
```

- Always returns the same generic message whether or not the email exists
  (prevents account enumeration)
- If the account exists: a 1-hour reset token is generated and emailed

### `POST /api/auth/reset-password`

```json
{ "token": "<reset-token>", "password": "newpassword123" }
```

- **200** → `{ "message": "Password reset successfully. You can now log in." }`
- **400** if the token is invalid or expired

🔒 = requires a valid Bearer access token.

## Authentication Architecture

### Token strategy

| Token   | Secret              | Default TTL | Delivery                              |
| ------- | ------------------- | ----------- | ------------------------------------- |
| Access  | `JWT_ACCESS_SECRET` | 15m         | JSON response body (`Authorization: Bearer`) |
| Refresh | `JWT_REFRESH_SECRET`| 7d          | httpOnly cookie (`refresh_token`)     |

- Payload: `{ sub: userId, email, role }`
- Refresh tokens are stored **bcrypt-hashed** in the database (`users.refreshTokenHash`)
- Cookie attributes: `httpOnly`, `sameSite: lax`, `secure` in production, `maxAge` 7 days
- On every refresh the token is **rotated**: the old hash is replaced, limiting the window
  for stolen tokens

### Guard pipeline

Both guards are registered **globally** (`APP_GUARD`), so every route is protected by default:

1. **`JwtAuthGuard`** — verifies the Bearer access token, loads the user from the database
   (rejects deleted users), and attaches the user to `request.user`
2. **`RolesGuard`** — enforces `@Roles(...)` metadata when present (403 otherwise)

Routes are marked public explicitly:

```ts
@Public()                      // skip JWT authentication
@Post('login')
login(@Body() dto: LoginDto) { ... }

@Roles('admin')                // restrict to specific roles
@Get('admin-only')
adminOnly() { ... }
```

Available custom decorators:

| Decorator         | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `@Public()`       | Mark a route as unauthenticated                |
| `@Roles(...)`     | Restrict a route to one or more roles          |
| `@CurrentUser()`  | Inject the authenticated user into a handler   |

## Database Schema

Drizzle schema lives in `src/db/schema.ts` (PostgreSQL, Neon serverless driver).

### `users`

| Column                       | Type         | Notes                              |
| ---------------------------- | ------------ | ---------------------------------- |
| `id`                         | uuid         | PK, auto-generated                 |
| `email`                      | text         | unique, not null                   |
| `password_hash`              | text         | bcrypt hash                        |
| `name`                       | text         | not null                           |
| `role`                       | enum         | `user` \| `admin`, default `user`  |
| `is_verified`                | boolean      | default `false`                    |
| `verification_token`         | text         | email verification (24h)           |
| `verification_token_expires` | timestamp    |                                    |
| `reset_token`                | text         | password reset (1h)                |
| `reset_token_expires_at`     | timestamp    |                                    |
| `refresh_token_hash`         | text         | bcrypt hash of the refresh token   |
| `created_at` / `updated_at`  | timestamp    | auto-managed                       |

### `task` *(defined, not yet exposed via API)*

| Column        | Type      | Notes                                       |
| ------------- | --------- | ------------------------------------------- |
| `id`          | uuid      | PK                                          |
| `title`       | text      | not null                                    |
| `description` | text      | nullable                                    |
| `status`      | enum      | `todo` \| `in_progress` \| `done`           |
| `user_id`     | uuid      | FK → `users.id`, `ON DELETE CASCADE`        |

## Error Handling

All errors pass through a global `HttpExceptionFilter` and return a uniform envelope:

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/auth/login"
}
```

## Project Structure

```
src/
├── main.ts                     # Bootstrap: cookie-parser, prefix "api", Swagger, filters
├── app.module.ts               # Global ConfigModule, JwtModule, APP_GUARD registrations
├── auth/
│   ├── auth.controller.ts      # All /api/auth endpoints
│   ├── auth.service.ts         # Token generation, rotation, password flows
│   ├── email.service.ts        # Resend integration (verification & reset emails)
│   └── dto/                    # register / login / forgot-password / reset-password
├── common/
│   ├── decorators/             # @Public(), @Roles(), @CurrentUser()
│   ├── guards/                 # JwtAuthGuard, RolesGuard (registered globally)
│   └── filters/                # HttpExceptionFilter (uniform error envelope)
├── db/
│   ├── schema.ts               # Drizzle tables: users, task
│   └── index.ts                # Neon serverless connection singleton
└── users/
    ├── users.service.ts        # User lookup / create / update / delete
    └── users.module.ts
```

## Roadmap

- [ ] Wire up `@nestjs/throttler` for rate limiting (dependency already installed)
- [ ] Users CRUD endpoints (`UsersService` is ready; controller pending)
- [ ] Use the `task` table (schema exists; module/endpoint pending)
- [ ] Hash reset & verification tokens at rest (currently only refresh tokens are hashed)
- [ ] Enable CORS for cross-origin frontends
- [ ] Expand e2e test coverage

## Notes

- The API docs are interactive at `/api/docs` — use the **Authorize** button with a Bearer token.
- Email sending is fire-and-forget; in local development you can use any Resend test API key
  and check the Resend dashboard for delivered messages.
- The starter e2e test (`test/app.e2e-spec.ts`) targets the default NestJS hello-world route and
  needs updating to match this API.
