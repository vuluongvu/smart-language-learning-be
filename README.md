# OpenQuiz Backend (`smart-language-learning-be`)

Backend REST API for the **OpenQuiz** personalized English self-learning platform MVP, built with **NestJS + TypeScript (ESM) + MySQL 8.4 + TypeORM**.

---

## Stack

- **Runtime:** Node.js `v24+`, TypeScript (`nodenext`)
- **Framework:** NestJS `12` (`@nestjs/platform-express`)
- **Database & Migrations:** MySQL `8.4` + TypeORM migrations (`synchronize: false` in production)
- **Authentication:** Email + Password (`bcrypt`), JWT access + rotating refresh sessions, server-verified Google OAuth (`google-auth-library`)
- **Security & Validation:** `helmet`, `@nestjs/throttler` rate limiting, strict `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`), ownership IDOR guards, configured CORS origin allowlist
- **Testing & Quality:** Vitest (`unit` & `e2e`), Supertest, Oxlint, Prettier
- **Zero Paid AI Policy:** `AI_PROVIDER=none` by default — core MVP runs offline/locally with deterministic quiz drafting and spaced repetition scheduling

---

## Prerequisites

- Node.js `>= 24`
- npm `>= 11`
- Docker & Docker Compose (recommended for local MySQL 8.4) or local MySQL 8.4 instance

---

## Local Setup & Runbook

1. **Install dependencies**

   ```bash
   npm ci
   ```

2. **Create `.env` from `.env.example`**

   ```bash
   cp .env.example .env
   ```

   Key environment variables:
   - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`: MySQL connection settings
   - `CORS_ORIGIN`: Comma-separated allowed frontend origins (e.g. `http://localhost:4200`)
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`: Strong random secrets (`>= 32` characters)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Optional Google OAuth credentials
   - `AI_PROVIDER`: Keep `none` for zero-cost MVP
   - `ENABLE_SWAGGER`: Optional (`true` enables `/api/docs` outside dev; dev enables Swagger automatically)

3. **Start MySQL 8.4 via Docker Compose**

   ```bash
   docker compose up -d mysql
   ```

4. **Apply database migrations**

   ```bash
   npm run migration:run
   npm run migration:show
   ```

5. **Optional (Development Only): Seed realistic demo data**

   > Never runs in `NODE_ENV=production`. Safe and idempotent to run locally for manual QA.

   ```bash
   npm run seed
   ```

   Creates demo learner credentials:
   - Email: `demo@openquiz.local`
   - Password: `DemoPassword123!`

6. **Start the API server**

   ```bash
   npm run start:dev
   ```

   - API Base URL: `http://localhost:3000/api/v1`
   - Health Check: `GET http://localhost:3000/api/v1/health`
   - Swagger API Docs (development): `http://localhost:3000/api/docs`

---

## Google OAuth Configuration (`AUTH-03`)

1. Create an **OAuth 2.0 Client ID** (`Web application`) in Google Cloud Console.
2. Add Authorized JavaScript origins:
   - `http://localhost:4200` (and your production origin when deployed)
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend `.env`, and set only `googleClientId` in frontend `environment*.ts`. Never place `GOOGLE_CLIENT_SECRET` in frontend assets.
4. ID tokens are verified server-side via `google-auth-library`. Existing password accounts cannot be hijacked by matching email alone — users must authenticate with their password and link Google explicitly via `POST /api/v1/auth/google/link`.

---

## Scripts

| Script | Description |
| --- | --- |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm run start:dev` | Run NestJS in watch mode |
| `npm run lint` | Run Oxlint checks across `src/` and `test/` |
| `npm run format` / `format:check` | Format or verify Prettier style |
| `npm test` | Run unit test suite (Vitest) |
| `npm run test:e2e` | Run full end-to-end integration tests against MySQL |
| `npm run migration:run` | Build and apply pending TypeORM migrations |
| `npm run migration:show` | Show applied vs pending migrations |
| `npm run migration:revert` | Revert the latest migration |
| `npm run seed` | Seed local development demo data (blocked in `production`) |

---

## Implemented MVP API Modules

- **Health**: `GET /api/v1/health`
- **Auth & Profile**: `/api/v1/auth/*`, `/api/v1/users/me*` (`timezone`, `isLeaderboardVisible`, `password`, account deletion)
- **Languages**: `/api/v1/languages` (English active for MVP)
- **Topics & Vocabulary**: `/api/v1/topics`, `/api/v1/vocabulary` (many-to-many topics, search/filter/pagination, duplicate hint)
- **Quizzes & Attempts**: `/api/v1/quizzes`, `/api/v1/quizzes/draft-from-vocabulary`, `/api/v1/quizzes/:id/attempts`, `/api/v1/attempts/:id/*` (MCQ, Word Meaning, Fill-in-the-Blank, immutable snapshots, save vocabulary from quiz)
- **Flashcards & SM-2 SRS**: `/api/v1/flashcards/due`, `/api/v1/flashcard-sessions/*`
- **Progress, Streaks & Leaderboard**: `/api/v1/progress/overview`, `/api/v1/progress/history`, `/api/v1/streaks/me`, `/api/v1/streaks/calendar`, `/api/v1/leaderboard/streaks`

---

## Running Backend + MySQL in Docker

1. Ensure `.env` exists (copied from `.env.example` with strong `JWT_SECRET` / `JWT_REFRESH_SECRET` and DB credentials).
2. Start MySQL and Backend together on the shared `openquiz-network` bridge:

   ```bash
   docker compose up -d --build
   ```

   - Automatically applies pending TypeORM migrations before starting `dist/main.js`.
   - Backend API: `http://localhost:3001/api/v1` (Health: `http://localhost:3001/api/v1/health`)
   - MySQL (`openquiz-mysql`): `127.0.0.1:3311`
   - Optional (dev only): seed sample demo data inside the running container:

     ```bash
     docker compose exec app node dist/database/seed.js
     ```
