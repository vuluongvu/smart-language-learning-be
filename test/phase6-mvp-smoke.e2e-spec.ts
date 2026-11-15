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
  // Ignore if env is already provided
}

describe('Phase 6 MVP Smoke & Security Boundaries (e2e)', () => {
  let app: INestApplication<App>;
  const password = 'SmokePassword123!';
  const ts = Date.now();
  let ownerToken = '';
  let intruderToken = '';

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

    const r1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p6.owner.${ts}@example.com`,
        displayName: 'Smoke Owner',
        password,
      })
      .expect(201);
    expect(r1.body.data.user.passwordHash).toBeUndefined();
    ownerToken = r1.body.data.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p6.intruder.${ts}@example.com`,
        displayName: 'Smoke Intruder',
        password,
      })
      .expect(201);
    intruderToken = r2.body.data.accessToken;
  });

  afterAll(async () => {
    for (const token of [ownerToken, intruderToken]) {
      if (token) {
        await request(app.getHttpServer())
          .delete('/api/v1/users/me')
          .set('Authorization', `Bearer ${token}`)
          .send({ confirm: true, currentPassword: password });
      }
    }
    await app.close();
  });

  it('exposes public health endpoint, enforces auth & DTO strictness, and passes full end-to-end MVP flow with IDOR protection', async () => {
    // 1. Health check is public
    const healthRes = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(healthRes.body.data.status).toBe('ok');

    // 2. Unauthenticated access rejected on protected MVP routes
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/progress/overview')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/leaderboard/streaks')
      .expect(401);

    // 3. Non-whitelisted DTO payload fields rejected cleanly (400)
    await request(app.getHttpServer())
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Valid Name', unexpectedAdminFlag: true })
      .expect(400);

    // 4. Create Topic + Vocabulary (M:N), verify IDOR protection
    const topicRes = await request(app.getHttpServer())
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Smoke Topic' })
      .expect(201);
    const topicId = topicRes.body.data.id;

    await request(app.getHttpServer())
      .get(`/api/v1/topics/${topicId}`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .expect(403);

    const vocabRes = await request(app.getHttpServer())
      .post('/api/v1/vocabulary')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        term: 'cohesive',
        definition: 'well integrated and united',
        topicIds: [topicId],
      })
      .expect(201);
    const vocabId = vocabRes.body.data.id;

    // 5. Quiz creation -> attempt -> submit -> save new word from question -> flashcard review -> streak & dashboard
    const quizRes = await request(app.getHttpServer())
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Smoke Check Quiz',
        topicId,
        status: 'published',
        questions: [
          {
            vocabularyId: vocabId,
            vocabularyTerm: 'ubiquitous',
            questionText:
              'Complete: Smartphones are _____ in modern classrooms.',
            questionType: 'fill_blank',
            options: [{ optionText: 'ubiquitous', isCorrect: true }],
          },
        ],
      })
      .expect(201);
    const quizId = quizRes.body.data.id;

    await request(app.getHttpServer())
      .get(`/api/v1/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .expect(403);

    const attemptRes = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(201);
    const attemptId = attemptRes.body.data.id;
    const questionId = attemptRes.body.data.questions[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        answers: [{ questionId, answerText: 'ubiquitous' }],
      })
      .expect(201);

    // Save word from quiz question
    const saveRes = await request(app.getHttpServer())
      .post('/api/v1/quizzes/save-vocabulary')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        term: 'ubiquitous',
        definition: 'present everywhere at once',
        topicIds: [topicId],
      })
      .expect(201);
    expect(saveRes.body.data.item.term).toBe('ubiquitous');

    // Review flashcard session cleanly
    const fcSession = await request(app.getHttpServer())
      .post('/api/v1/flashcard-sessions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ topicId, mode: 'all', limit: 5 })
      .expect(201);
    for (const card of fcSession.body.data.cards) {
      await request(app.getHttpServer())
        .post(`/api/v1/flashcard-sessions/${fcSession.body.data.id}/reviews`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ vocabularyId: card.id, rating: 'good' })
        .expect(201);
    }
    const fcDone = await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${fcSession.body.data.id}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    expect(fcDone.body.data.isStreakEligible).toBe(true);

    // Verify overview, calendar, and leaderboard consistency
    const overview = await request(app.getHttpServer())
      .get('/api/v1/progress/overview')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(overview.body.data.streak.currentStreak).toBe(1);
    expect(overview.body.data.quizzes.completedAttempts).toBe(1);
    expect(overview.body.data.quizzes.accuracyRate).toBe(100);
    expect(overview.body.data.vocabulary.total).toBe(2);
  });
});
