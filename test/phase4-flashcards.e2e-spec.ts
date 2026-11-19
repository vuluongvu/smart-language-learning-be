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

describe('Phase 4 Flashcards & SRS Review (e2e)', () => {
  let app: INestApplication<App>;
  const password = 'StrongPassword123!';
  const ts = Date.now();
  let user1Token = '';
  let user2Token = '';

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
        email: `p4.u1.${ts}@example.com`,
        displayName: 'Flashcard Learner One',
        password,
      })
      .expect(201);
    user1Token = r1.body.data.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p4.u2.${ts}@example.com`,
        displayName: 'Flashcard Learner Two',
        password,
      })
      .expect(201);
    user2Token = r2.body.data.accessToken;
  });

  afterAll(async () => {
    if (user1Token) {
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          confirm: true,
          confirmEmail: `p4.u1.${ts}@example.com`,
          currentPassword: password,
        });
    }
    if (user2Token) {
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          confirm: true,
          confirmEmail: `p4.u2.${ts}@example.com`,
          currentPassword: password,
        });
    }
    await app.close();
  });

  it('supports due queue, SM-2 card rating, vocabulary progress filtering, streak thresholds, and ownership checks', async () => {
    // 1. Seed a Topic + 6 Vocabulary items
    const topicRes = await request(app.getHttpServer())
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Travel & Culture' })
      .expect(201);
    const topicId = topicRes.body.data.id;

    const words = [
      { term: 'itinerary', definition: 'a planned route or journey' },
      { term: 'jet lag', definition: 'tiredness after a long flight' },
      { term: 'layover', definition: 'short stop between connecting flights' },
      { term: 'excursion', definition: 'short leisure trip or outing' },
      { term: 'embark', definition: 'board a ship, aircraft, or journey' },
      { term: 'hospitality', definition: 'friendly reception of guests' },
    ];

    const vocabIds: number[] = [];
    for (const word of words) {
      const created = await request(app.getHttpServer())
        .post('/api/v1/vocabulary')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          term: word.term,
          partOfSpeech: 'noun',
          definition: word.definition,
          topicIds: [topicId],
        })
        .expect(201);
      vocabIds.push(created.body.data.id);
    }

    // 2. Verify initial due queue counts and vocabulary reviewStatus=new
    const initialQueue = await request(app.getHttpServer())
      .get('/api/v1/flashcards/due')
      .query({ topicId, mode: 'due_and_new' })
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(initialQueue.body.data.summary).toEqual({
      totalCount: 6,
      dueCount: 0,
      newCount: 6,
      learningCount: 0,
      masteredCount: 0,
      hardCount: 0,
    });

    const newVocabRes = await request(app.getHttpServer())
      .get('/api/v1/vocabulary')
      .query({ topicId, reviewStatus: 'new' })
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(newVocabRes.body.data.meta.total).toBe(6);
    expect(newVocabRes.body.data.items[0].progress.status).toBe('new');

    // 3. Create a partial 2-card session and complete with only 1 distinct card rated -> not Streak eligible
    const shortSessionRes = await request(app.getHttpServer())
      .post('/api/v1/flashcard-sessions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        topicId,
        vocabularyIds: [vocabIds[0], vocabIds[1]],
      })
      .expect(201);
    const shortSessionId = shortSessionRes.body.data.id;
    expect(shortSessionRes.body.data.targetCount).toBe(2);
    expect(shortSessionRes.body.data.streakMinThreshold).toBe(2);

    await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${shortSessionId}/reviews`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ vocabularyId: vocabIds[0], rating: 'good' })
      .expect(201);

    const shortCompleted = await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${shortSessionId}/complete`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(201);
    expect(shortCompleted.body.data.status).toBe('completed');
    expect(shortCompleted.body.data.reviewedCount).toBe(1);
    expect(shortCompleted.body.data.isStreakEligible).toBe(false);

    // Completed session rejects additional reviews and idempotent complete preserves timestamp
    await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${shortSessionId}/reviews`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ vocabularyId: vocabIds[1], rating: 'good' })
      .expect(409);

    const idempotentCompleted = await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${shortSessionId}/complete`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(201);
    expect(idempotentCompleted.body.data.completedAt).toBe(
      shortCompleted.body.data.completedAt,
    );

    // 4. Create a 6-card session covering all topic cards, rate >= 5 distinct cards -> Streak eligible
    const fullSessionRes = await request(app.getHttpServer())
      .post('/api/v1/flashcard-sessions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ topicId, mode: 'all', limit: 10 })
      .expect(201);
    const fullSessionId = fullSessionRes.body.data.id;
    expect(fullSessionRes.body.data.targetCount).toBe(6);
    expect(fullSessionRes.body.data.streakMinThreshold).toBe(5);

    // Rate card 0 (already rep=1 from shortSession, interval=1) -> easy => rep=2, interval=6 (learning)
    await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${fullSessionId}/reviews`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ vocabularyId: vocabIds[0], rating: 'easy' })
      .expect(201);

    // Rate card 1 with 'again' -> hard/learning card, forgottenVocabularyIds
    await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${fullSessionId}/reviews`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ vocabularyId: vocabIds[1], rating: 'again' })
      .expect(201);

    // Rate cards 2..5 with 'hard', 'good', 'easy'
    const ratings = ['hard', 'good', 'easy', 'good'] as const;
    for (let i = 0; i < ratings.length; i += 1) {
      await request(app.getHttpServer())
        .post(`/api/v1/flashcard-sessions/${fullSessionId}/reviews`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ vocabularyId: vocabIds[i + 2], rating: ratings[i] })
        .expect(201);
    }

    const completedFull = await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${fullSessionId}/complete`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(201);
    expect(completedFull.body.data.reviewedCount).toBe(6);
    expect(completedFull.body.data.isStreakEligible).toBe(true);
    expect(completedFull.body.data.forgottenVocabularyIds).toEqual(
      expect.arrayContaining([vocabIds[1], vocabIds[2]]),
    );

    // Rate card 0 one more time in a follow-up custom session with 'easy' -> interval >= 14 & reps >= 2 => mastered!
    const masterySession = await request(app.getHttpServer())
      .post('/api/v1/flashcard-sessions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ vocabularyIds: [vocabIds[0]] })
      .expect(201);
    const masteryReview = await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${masterySession.body.data.id}/reviews`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ vocabularyId: vocabIds[0], rating: 'easy' })
      .expect(201);
    expect(masteryReview.body.data.updatedProgress.status).toBe('mastered');
    expect(
      masteryReview.body.data.updatedProgress.intervalDays,
    ).toBeGreaterThanOrEqual(14);

    // 5. Verify Vocabulary Bank reviewStatus filtering reflects learning & mastered cards
    const learningRes = await request(app.getHttpServer())
      .get('/api/v1/vocabulary')
      .query({ topicId, reviewStatus: 'learning' })
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(learningRes.body.data.meta.total).toBe(5);

    const masteredRes = await request(app.getHttpServer())
      .get('/api/v1/vocabulary')
      .query({ topicId, reviewStatus: 'mastered' })
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(masteredRes.body.data.meta.total).toBe(1);
    expect(masteredRes.body.data.items[0].id).toBe(vocabIds[0]);

    // 6. Verify hard_only queue shows cards last rated again or hard (cards 1 and 2)
    const hardQueue = await request(app.getHttpServer())
      .get('/api/v1/flashcards/due')
      .query({ topicId, mode: 'hard_only' })
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(hardQueue.body.data.summary.hardCount).toBe(2);
    expect(hardQueue.body.data.items).toHaveLength(2);

    // 7. Cross-user ownership enforcement (User 2 gets 403)
    await request(app.getHttpServer())
      .get(`/api/v1/flashcard-sessions/${fullSessionId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${fullSessionId}/complete`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/flashcards/due')
      .query({ topicId })
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);

    // 8. Session history listing
    const historyRes = await request(app.getHttpServer())
      .get('/api/v1/flashcard-sessions')
      .query({ status: 'completed' })
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(historyRes.body.data.meta.total).toBeGreaterThanOrEqual(2);
  });
});
