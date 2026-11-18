# Argon Learning Backend — AWS Trial / Staging Deploy Guide (Paired with Vercel FE)

This directory contains everything needed to deploy `smart-language-learning-be` over **HTTPS** on AWS so the Vercel HTTPS frontend can connect cleanly without Mixed Content, CORS, or proxy timeout errors.

---

## Option A (Recommended for Trial): AWS EC2 + Docker + Caddy Auto-HTTPS

Vercel serves the frontend over **HTTPS**, so browsers block direct calls to plain `http://<EC2-IP>:3000`. Using `compose.aws.yaml` + **Caddy** gives you a valid trusted HTTPS certificate automatically.

### 1. Provision AWS EC2 Security Group
Allow inbound TCP ports:
- `22` (SSH — your IP only)
- `80` (HTTP — needed by Let's Encrypt / HTTP->HTTPS redirect)
- `443` (HTTPS — public API traffic)
- Do **not** open `3000` or `3306` to `0.0.0.0/0`.

### 2. Choose MySQL Mode & Configure `.env.aws`
On the EC2 instance (with Docker & Docker Compose installed):

```bash
git clone https://github.com/vuluongvu/smart-language-learning-be.git
cd smart-language-learning-be/deploy/aws
cp .env.aws.example .env.aws
nano .env.aws
```

Set at minimum:
- `API_DOMAIN`: Either your custom DNS A-record (e.g. `api.example.com`) pointing to the EC2 Public IP, or zero-domain `sslip.io` hostname (e.g. for EC2 IP `13.212.45.67`, set `13-212-45-67.sslip.io`).
- `CORS_ORIGIN`: Your exact Vercel URL (e.g. `https://argon-learning.vercel.app`, comma-separated if adding preview URLs).
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Strong unique random strings (`openssl rand -hex 32`).
- `AI_PROVIDER=groq` + `GROQ_API_KEY`: Your Groq API key.
- **Database**:
  - **EC2 built-in MySQL (fastest/lowest cost for trial)**: keep `DB_HOST=mysql`, `DB_SSL=false`, and set `DB_PASSWORD` + `MYSQL_ROOT_PASSWORD`.
  - **AWS RDS MySQL**: set `DB_HOST=<rds-endpoint>`, `DB_PORT=3306`, `DB_SSL=true`, and ensure the EC2 Security Group is allowed in the RDS Security Group inbound rules (`3306`).

### 3. Start Backend + Migrations + HTTPS Proxy

- **With built-in MySQL container (`--profile with-db`)**:
  ```bash
  docker compose -f compose.aws.yaml --env-file .env.aws --profile with-db up -d --build
  ```
- **With external AWS RDS MySQL**:
  ```bash
  docker compose -f compose.aws.yaml --env-file .env.aws up -d --build
  ```

Migrations (`typeorm migration:run`) and the curated Learning Path catalog sync run automatically on container startup.

### 4. Verify Backend Health Over HTTPS
```bash
curl -i https://<your-API_DOMAIN>/api/v1/health
```
Expected HTTP `200` with `{"status":"ok","database":"up",...}`.

---

## Option B: AWS App Runner / ECS Fargate + Amazon RDS

The root `Dockerfile` is a multi-stage production image (`node:24-alpine`) that automatically runs TypeORM migrations on boot (unless `RUN_MIGRATIONS=false` is set for multi-replica scaling) and exposes `GET /api/v1/health` on `PORT` (default `3000`).

1. Build & push to **Amazon ECR** (`linux/amd64` if building on Apple Silicon):
   ```bash
   docker build --platform linux/amd64 -t <account-id>.dkr.ecr.<region>.amazonaws.com/argon-learning-be:staging .
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/argon-learning-be:staging
   ```
2. Configure App Runner / ECS Task environment variables matching `.env.aws.example` (`NODE_ENV=production`, `DB_SSL=true`, `CORS_ORIGIN=https://<your-app>.vercel.app`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GROQ_API_KEY`, optional `GOOGLE_CLIENT_ID`).
3. Point health check path to `/api/v1/health` (HTTP `200`).

---

## Pairing with Vercel Frontend & Google Sign-In

1. In the **Vercel Dashboard** for `smart-language-learning-fe`, set Environment Variable:
   - `ARGON_API_BASE_URL=https://<your-API_DOMAIN>/api/v1`
2. Trigger a Vercel deployment (uses `vercel.json` -> `npm run build:vercel`).
3. Update `CORS_ORIGIN` on AWS `.env.aws` with the assigned `https://<your-app>.vercel.app` domain and recreate `app`:
   ```bash
   docker compose -f compose.aws.yaml --env-file .env.aws up -d app
   ```
4. If Google Sign-In is enabled (`GOOGLE_CLIENT_ID` set on AWS), add `https://<your-app>.vercel.app` under **Authorized JavaScript origins** in Google Cloud Console.
