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
import { formatDateInTimezone } from './../src/common/utils/timezone.util.js';

try {
  process.loadEnvFile('.env');
} catch {
  // Ignore if env is already provided
}

describe('Phase 5 Progress, Streaks & Leaderboard (e2e)', () => {
  let app: INestApplication<App>;
  const password = 'StrongPassword123!';
  const ts = Date.now();
  let user1Token = '';
  let user2Token = '';
  let user3Token = '';
  let user3Id = 0;

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
        email: `p5.u1.${ts}@example.com`,
        displayName: 'Phase5 Learner One',
        password,
      })
      .expect(201);
    user1Token = r1.body.data.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p5.u2.${ts}@example.com`,
        displayName: 'Phase5 Learner Two',
        password,
      })
      .expect(201);
    user2Token = r2.body.data.accessToken;

    const r3 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p5.u3.${ts}@example.com`,
        displayName: 'Phase5 Hidden User',
        password,
      })
      .expect(201);
    user3Token = r3.body.data.accessToken;
    user3Id = r3.body.data.user.id;
  });

  afterAll(async () => {
    for (const token of [user1Token, user2Token, user3Token]) {
      if (token) {
        await request(app.getHttpServer())
          .delete('/api/v1/users/me')
          .set('Authorization', `Bearer ${token}`)
          .send({ confirm: true, currentPassword: password });
      }
    }
    await app.close();
  });

  it('tracks quiz + eligible flashcard streaks, rejects ineligible sessions, handles concurrent submissions, and aggregates real progress', async () => {
    // Initial streak and overview start at 0
    const initialStreak = await request(app.getHttpServer())
      .get('/api/v1/streaks/me')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(initialStreak.body.data.currentStreak).toBe(0);
    expect(initialStreak.body.data.status).toBe('inactive');

    // Seed topic & 6 vocabulary items
    const topicRes = await request(app.getHttpServer())
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Core Verbs' })
      .expect(201);
    const topicId = topicRes.body.data.id;

    const vocabIds: number[] = [];
    for (let i = 1; i <= 6; i += 1) {
      const vocab = await request(app.getHttpServer())
        .post('/api/v1/vocabulary')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          term: `word-${i}`,
          partOfSpeech: 'verb',
          definition: `definition-${i}`,
          topicIds: [topicId],
        })
        .expect(201);
      vocabIds.push(vocab.body.data.id);
    }

    // Create published quiz 1 with 2 questions
    const quiz1Res = await request(app.getHttpServer())
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Phase 5 Quiz One',
        topicId,
        status: 'published',
        questions: [
          {
            vocabularyId: vocabIds[0],
            questionText: 'Meaning of word-1?',
            questionType: 'multiple_choice',
            options: [
              { optionText: 'definition-1', isCorrect: true },
              { optionText: 'wrong', isCorrect: false },
            ],
          },
          {
            vocabularyId: vocabIds[1],
            questionText: 'Meaning of word-2?',
            questionType: 'multiple_choice',
            options: [
              { optionText: 'definition-2', isCorrect: true },
              { optionText: 'wrong-2', isCorrect: false },
            ],
          },
        ],
      })
      .expect(201);
    const quiz1Id = quiz1Res.body.data.id;

    const attempt1Res = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quiz1Id}/attempts`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({})
      .expect(201);
    const attempt1Id = attempt1Res.body.data.id;
    const questions1 = attempt1Res.body.data.questions;
    const q0WrongOption = questions1[0].options.find(
      (o: { optionText: string }) => o.optionText === 'wrong',
    );
    const q1RightOption = questions1[1].options.find(
      (o: { optionText: string }) => o.optionText === 'definition-2',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attempt1Id}/submit`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        answers: [
          { questionId: questions1[0].id, selectedOptionId: q0WrongOption.id },
          { questionId: questions1[1].id, selectedOptionId: q1RightOption.id },
        ],
      })
      .expect(201);

    // Quiz completion grants day 1 streak
    const streakAfterQuiz = await request(app.getHttpServer())
      .get('/api/v1/streaks/me')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(streakAfterQuiz.body.data.currentStreak).toBe(1);
    expect(streakAfterQuiz.body.data.longestStreak).toBe(1);
    expect(streakAfterQuiz.body.data.isActiveToday).toBe(true);

    // Partial flashcard session (< target / < 5) must NOT be streak-eligible
    const shortSession = await request(app.getHttpServer())
      .post('/api/v1/flashcard-sessions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ vocabularyIds: [vocabIds[0], vocabIds[1]] })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${shortSession.body.data.id}/reviews`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ vocabularyId: vocabIds[0], rating: 'again' })
      .expect(201);
    const completedShort = await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${shortSession.body.data.id}/complete`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(201);
    expect(completedShort.body.data.isStreakEligible).toBe(false);

    // Full 5-card flashcard session IS streak-eligible, adds flashcardCompletions without double-counting streak day
    const fullSession = await request(app.getHttpServer())
      .post('/api/v1/flashcard-sessions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ topicId, mode: 'all', limit: 6 })
      .expect(201);
    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post(`/api/v1/flashcard-sessions/${fullSession.body.data.id}/reviews`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ vocabularyId: vocabIds[i], rating: i === 0 ? 'again' : 'good' })
        .expect(201);
    }
    const completedFull = await request(app.getHttpServer())
      .post(`/api/v1/flashcard-sessions/${fullSession.body.data.id}/complete`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(201);
    expect(completedFull.body.data.isStreakEligible).toBe(true);

    // Concurrent quiz submissions stay serialized per user and never fail or double-increment streak
    const createSimpleAttempt = async (title: string) => {
      const qz = await request(app.getHttpServer())
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title,
          status: 'published',
          questions: [
            {
              vocabularyId: vocabIds[2],
              questionText: 'Q',
              questionType: 'multiple_choice',
              options: [
                { optionText: 'yes', isCorrect: true },
                { optionText: 'no', isCorrect: false },
              ],
            },
          ],
        })
        .expect(201);
      const att = await request(app.getHttpServer())
        .post(`/api/v1/quizzes/${qz.body.data.id}/attempts`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({})
        .expect(201);
      return {
        attemptId: att.body.data.id,
        questionId: att.body.data.questions[0].id,
        correctOptionId: att.body.data.questions[0].options.find(
          (o: { optionText: string }) => o.optionText === 'yes',
        ).id,
      };
    };

    const [a2, a3] = await Promise.all([
      createSimpleAttempt('Concurrent Quiz 2'),
      createSimpleAttempt('Concurrent Quiz 3'),
    ]);

    await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/attempts/${a2.attemptId}/submit`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          answers: [
            { questionId: a2.questionId, selectedOptionId: a2.correctOptionId },
          ],
        })
        .expect(201),
      request(app.getHttpServer())
        .post(`/api/v1/attempts/${a3.attemptId}/submit`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          answers: [
            { questionId: a3.questionId, selectedOptionId: a3.correctOptionId },
          ],
        })
        .expect(201),
    ]);

    const overviewRes = await request(app.getHttpServer())
      .get('/api/v1/progress/overview')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    const overview = overviewRes.body.data;

    expect(overview.streak.currentStreak).toBe(1);
    expect(overview.vocabulary.total).toBe(6);
    expect(overview.vocabulary.topicCount).toBe(1);
    expect(overview.quizzes.completedAttempts).toBe(3);
    expect(overview.flashcards.completedSessions).toBe(2);
    expect(overview.flashcards.streakEligibleSessions).toBe(1);
    expect(
      overview.weakVocabulary.some(
        (w: { vocabularyId: number }) => w.vocabularyId === vocabIds[0],
      ),
    ).toBe(true);
    const todayPoint = overview.recentActivity14d[13];
    expect(todayPoint.quizCompletions).toBe(3);
    expect(todayPoint.flashcardCompletions).toBe(1);
    expect(todayPoint.activityCount).toBe(4);

    // Calendar & History endpoints
    const calendarRes = await request(app.getHttpServer())
      .get('/api/v1/streaks/calendar')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(calendarRes.body.data.totalActiveDays).toBe(1);

    const historyRes = await request(app.getHttpServer())
      .get('/api/v1/progress/history')
      .query({ days: 7 })
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(historyRes.body.data.dailyActivities).toHaveLength(7);
  });

  it('respects leaderboard opt-out, tie-breaking, PII exclusion, and user timezone updates', async () => {
    // Update user2 timezone and verify server derives todayDate in new timezone
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/timezone')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ timezone: 'Asia/Tokyo' })
      .expect(200);

    const tzStreak = await request(app.getHttpServer())
      .get('/api/v1/streaks/me')
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);
    expect(tzStreak.body.data.timezone).toBe('Asia/Tokyo');
    expect(tzStreak.body.data.todayDate).toBe(
      formatDateInTimezone(new Date(), 'Asia/Tokyo'),
    );

    // Complete a quiz for user2 and user3 so both also have active streak = 1
    const triggerQuizStreak = async (token: string, title: string) => {
      const qz = await request(app.getHttpServer())
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title,
          status: 'published',
          questions: [
            {
              questionText: 'Check',
              questionType: 'multiple_choice',
              options: [
                { optionText: 'ok', isCorrect: true },
                { optionText: 'bad', isCorrect: false },
              ],
            },
          ],
        })
        .expect(201);
      const att = await request(app.getHttpServer())
        .post(`/api/v1/quizzes/${qz.body.data.id}/attempts`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/attempts/${att.body.data.id}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: [
            {
              questionId: att.body.data.questions[0].id,
              selectedOptionId: att.body.data.questions[0].options.find(
                (o: { optionText: string }) => o.optionText === 'ok',
              ).id,
            },
          ],
        })
        .expect(201);
    };

    await triggerQuizStreak(user2Token, 'User2 Streak Quiz');
    await triggerQuizStreak(user3Token, 'User3 Streak Quiz');

    // User3 opts out of public leaderboard
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/leaderboard-visibility')
      .set('Authorization', `Bearer ${user3Token}`)
      .send({ isLeaderboardVisible: false })
      .expect(200);

    const lbAsUser1 = await request(app.getHttpServer())
      .get('/api/v1/leaderboard/streaks')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    const items = lbAsUser1.body.data.items;
    expect(items.some((i: { userId: number }) => i.userId === user3Id)).toBe(
      false,
    );
    const u1Rank = items.find(
      (i: { displayName: string }) => i.displayName === 'Phase5 Learner One',
    )?.rank;
    const u2Rank = items.find(
      (i: { displayName: string }) => i.displayName === 'Phase5 Learner Two',
    )?.rank;
    expect(u1Rank).toBeLessThan(u2Rank);

    // Ensure zero PII leakage
    expect(items[0].email).toBeUndefined();
    expect(items[0].passwordHash).toBeUndefined();
    expect(items[0].timezone).toBeUndefined();

    // User3 calls leaderboard: myPosition indicates opted-out with rank null
    const lbAsUser3 = await request(app.getHttpServer())
      .get('/api/v1/leaderboard/streaks')
      .set('Authorization', `Bearer ${user3Token}`)
      .expect(200);
    expect(lbAsUser3.body.data.myPosition.isLeaderboardVisible).toBe(false);
    expect(lbAsUser3.body.data.myPosition.rank).toBeNull();
    expect(lbAsUser3.body.data.myPosition.currentStreak).toBe(1);
  });
});
