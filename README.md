# OpenQuiz Backend (`smart-language-learning-be`)

Backend API cho nền tảng tự học tiếng Anh cá nhân hóa **OpenQuiz**, xây dựng bằng **NestJS + TypeScript + MySQL 8.4 + TypeORM**.

## Stack

- **Runtime:** Node.js (`v24+`), TypeScript (`nodenext` ESM)
- **Framework:** NestJS `12` (`@nestjs/platform-express`)
- **Database:** MySQL `8.4` + TypeORM
- **API & Docs:** REST `/api/v1`, Swagger `/api/docs`
- **Validation & Security:** `class-validator`, `helmet`, `@nestjs/throttler`, `passport-jwt`, `bcrypt`
- **Testing & Lint:** Vitest, Supertest, Oxlint, Prettier

## Yêu cầu môi trường

- Node.js >= 24
- npm >= 11
- Docker & Docker Compose (hoặc MySQL 8.4 local)

## Cài đặt & Chạy local

1. Cài dependencies:

```bash
npm ci
```

2. Tạo file `.env` từ `.env.example` và điền thông tin kết nối MySQL + `JWT_SECRET` (tối thiểu 32 ký tự):

```bash
cp .env.example .env
```

3. Khởi động MySQL bằng Docker Compose (nếu dùng Docker):

```bash
docker compose up -d mysql
```

4. Chạy migration (từ Phase 1 trở đi):

```bash
npm run migration:run
```

5. Khởi động backend ở chế độ development:

```bash
npm run start:dev
```

- API base URL: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000/api/docs`

## Scripts chính

| Script | Mô tả |
| --- | --- |
| `npm run build` | Compile TypeScript ra `dist/` |
| `npm run start:dev` | Chạy dev server với watch mode |
| `npm run lint` | Kiểm tra lint bằng `oxlint` |
| `npm run format:check` | Kiểm tra định dạng Prettier |
| `npm test` | Chạy unit tests bằng Vitest |
| `npm run test:e2e` | Chạy e2e tests |
| `npm run migration:run` | Build và chạy TypeORM migrations |
| `npm run migration:revert` | Hoàn tác migration gần nhất |
| `npm run migration:show` | Kiểm tra trạng thái migrations |

## Cấu hình Google OAuth (AUTH-03)

1. Tạo OAuth 2.0 Client ID (loại **Web application**) trong Google Cloud Console.
2. Cấu hình **Authorized JavaScript origins**:
   - Local development: `http://localhost:4200`
3. Cấu hình **Authorized redirect URIs** (nếu dùng redirect flow / popup callback):
   - Local development: `http://localhost:4200` và `http://localhost:4200/login`
4. Điền `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` vào `.env` của backend (chỉ đặt `GOOGLE_CLIENT_ID` ở frontend `environment*.ts`, không bao giờ đặt `GOOGLE_CLIENT_SECRET` ở frontend).
5. Backend xác minh Google ID token server-side qua `google-auth-library`. Nếu email đã tồn tại bằng tài khoản mật khẩu, người dùng phải đăng nhập bằng mật khẩu rồi liên kết Google qua `POST /api/v1/auth/google/link`.

## Ghi chú kiến trúc & MVP

- **Database:** Sử dụng MySQL 8.4 (`number` auto-increment primary keys), lưu timestamp theo UTC (`timezone: 'Z'`), `synchronize` tắt mặc định (`DB_SYNCHRONIZE=false`) và bắt buộc tắt ở `production`.
- **Zero API Cost:** AI provider tắt mặc định (`AI_PROVIDER=none`), không có paid fallback.
- **Git workflow:** Phát triển theo nhánh feature, kiểm tra `build`, `lint`, `test` trước khi merge vào `develop` và `master`.
