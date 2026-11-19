import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

try {
  process.loadEnvFile('.env');
} catch {
  // Rely on environment variables already injected in CI/runtime
}

describe('Phase 1 Auth, Users & Languages (e2e)', () => {
  let app: INestApplication<App>;
  const uniqueEmail = `phase1.e2e.${Date.now()}@example.com`;
  const password = 'StrongPassword123!';
  let accessToken = '';
  let refreshToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    if (accessToken) {
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          confirm: true,
          confirmEmail: uniqueEmail,
          currentPassword: password,
        });
    }
    await app.close();
  });

  it('GET /api/v1/languages returns seeded English language', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/languages')
      .expect(200);

    expect(res.body.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(
      res.body.data.some((lang: { code: string }) => lang.code === 'en'),
    ).toBe(true);
  });

  it('registers a user, rejects duplicate email, and validates login', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        displayName: 'E2E Learner',
        password,
        timezone: 'Asia/Ho_Chi_Minh',
      })
      .expect(201);

    expect(registerRes.body.data.accessToken).toBeTruthy();
    expect(registerRes.body.data.refreshToken).toBeTruthy();
    expect(registerRes.body.data.user.email).toBe(uniqueEmail);
    expect(registerRes.body.data.user.passwordHash).toBeUndefined();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        displayName: 'Duplicate',
        password,
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail, password: 'WrongPassword!' })
      .expect(401);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail, password })
      .expect(200);

    accessToken = loginRes.body.data.accessToken;
    refreshToken = loginRes.body.data.refreshToken;
    expect(accessToken).toBeTruthy();
  });

  it('protects /users/me, updates timezone, and rotates refresh tokens', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body.data.email).toBe(uniqueEmail);
    expect(meRes.body.data.timezone).toBe('Asia/Ho_Chi_Minh');

    const tzRes = await request(app.getHttpServer())
      .patch('/api/v1/users/me/timezone')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ timezone: 'America/New_York' })
      .expect(200);

    expect(tzRes.body.data.timezone).toBe('America/New_York');

    const oldRefresh = refreshToken;
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);

    accessToken = refreshRes.body.data.accessToken;
    refreshToken = refreshRes.body.data.refreshToken;
    expect(refreshToken).not.toBe(oldRefresh);

    // Reusing rotated refresh token must fail
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);
  });
});
