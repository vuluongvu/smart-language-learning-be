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

describe('Phase 3 Quizzes & Attempts (e2e)', () => {
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
        email: `p3.u1.${ts}@example.com`,
        displayName: 'Quiz Learner One',
        password,
      })
      .expect(201);
    user1Token = r1.body.data.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p3.u2.${ts}@example.com`,
        displayName: 'Quiz Learner Two',
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
          confirmEmail: `p3.u1.${ts}@example.com`,
          currentPassword: password,
        });
    }
    if (user2Token) {
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          confirm: true,
          confirmEmail: `p3.u2.${ts}@example.com`,
          currentPassword: password,
        });
    }
    await app.close();
  });

  it('supports manual creation (all 3 types), draft generation, progress resume, grading, snapshot immutability, saving vocab, and ownership checks', async () => {
    // 1. Seed a Topic + 2 Vocabulary items
    const topicRes = await request(app.getHttpServer())
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Work & Leadership' })
      .expect(201);
    const topicId = topicRes.body.data.id;

    const v1 = await request(app.getHttpServer())
      .post('/api/v1/vocabulary')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        term: 'pragmatic',
        partOfSpeech: 'adjective',
        definition: 'dealing with things sensibly and realistically',
        example: 'We took a pragmatic approach to the deadline.',
        topicIds: [topicId],
      })
      .expect(201);
    const vocab1Id = v1.body.data.id;

    await request(app.getHttpServer())
      .post('/api/v1/vocabulary')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        term: 'articulate',
        partOfSpeech: 'verb',
        definition: 'express an idea fluently and clearly',
        topicIds: [topicId],
      })
      .expect(201);

    // 2. Deterministic draft generation from vocabulary works without AI
    const draftRes = await request(app.getHttpServer())
      .post('/api/v1/quizzes/draft-from-vocabulary')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ topicId, count: 2 })
      .expect(201);
    expect(draftRes.body.data.questions.length).toBe(2);

    // 3. Create published quiz with all 3 question types
    const quizRes = await request(app.getHttpServer())
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Phase 3 Mixed Quiz',
        description: 'MCQ + Word Meaning + Fill Blank',
        topicId,
        difficulty: 'medium',
        status: 'published',
        questions: [
          {
            vocabularyId: vocab1Id,
            questionText: 'Which word means sensible and realistic?',
            questionType: 'multiple_choice',
            explanation: 'Pragmatic focuses on practical results.',
            options: [
              { optionText: 'pragmatic', isCorrect: true },
              { optionText: 'erratic', isCorrect: false },
            ],
          },
          {
            vocabularyTerm: 'concise',
            questionText: 'Select the meaning of "concise"',
            questionType: 'word_meaning',
            explanation: 'Concise means short and clear.',
            options: [
              { optionText: 'expressing much in few words', isCorrect: true },
              { optionText: 'extremely long', isCorrect: false },
            ],
          },
          {
            vocabularyTerm: 'mitigate',
            questionText: 'Early testing helps _____ production risk.',
            questionType: 'fill_blank',
            explanation: 'Mitigate = make less severe.',
            options: [{ optionText: 'mitigate', isCorrect: true }],
          },
        ],
      })
      .expect(201);
    const quizId = quizRes.body.data.id;
    const questions = quizRes.body.data.questions;
    expect(questions).toHaveLength(3);

    // Cross-user cannot read or attempt user1's quiz
    await request(app.getHttpServer())
      .get(`/api/v1/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({})
      .expect(403);

    // 4. Start attempt & confirm no answer keys leak
    const startRes = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({})
      .expect(201);
    const attemptId = startRes.body.data.id;
    expect(startRes.body.data.status).toBe('in_progress');
    expect(startRes.body.data.questions[0].options[0]).not.toHaveProperty(
      'isCorrect',
    );
    expect(startRes.body.data.questions[2].options).toEqual([]);

    // Save partial progress & resume
    const mcqCorrectOpt = questions[0].options.find((o: any) => o.isCorrect);
    await request(app.getHttpServer())
      .patch(`/api/v1/attempts/${attemptId}/progress`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        answers: [
          { questionId: questions[0].id, selectedOptionId: mcqCorrectOpt.id },
        ],
      })
      .expect(200);

    const resumed = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({})
      .expect(201);
    expect(resumed.body.data.id).toBe(attemptId);
    expect(resumed.body.data.questions[0].savedSelectedOptionId).toBe(
      mcqCorrectOpt.id,
    );

    // 5. Submit answers (1 correct MCQ, 1 wrong Word Meaning, 1 normalized Fill Blank)
    const wmWrongOpt = questions[1].options.find((o: any) => !o.isCorrect);
    const submitRes = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        answers: [
          { questionId: questions[0].id, selectedOptionId: mcqCorrectOpt.id },
          { questionId: questions[1].id, selectedOptionId: wmWrongOpt.id },
          { questionId: questions[2].id, answerText: '  MITIGATE  ' },
        ],
      })
      .expect(201);

    expect(submitRes.body.data.status).toBe('completed');
    expect(submitRes.body.data.correctCount).toBe(2);
    expect(submitRes.body.data.totalQuestions).toBe(3);
    expect(submitRes.body.data.score).toBe(66.67);

    // Double submit is blocked with 409 Conflict
    await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ answers: [] })
      .expect(409);

    // Cross-user cannot read attempt result
    await request(app.getHttpServer())
      .get(`/api/v1/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);

    // 6. Edit underlying vocabulary & replace quiz questions -> Attempt 1 snapshot MUST NOT change
    await request(app.getHttpServer())
      .patch(`/api/v1/vocabulary/${vocab1Id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ term: 'changed-term', definition: 'completely changed' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        questions: [
          {
            questionText: 'Completely replaced question',
            questionType: 'fill_blank',
            options: [{ optionText: 'newanswer', isCorrect: true }],
          },
        ],
      })
      .expect(200);

    const historicalAttempt = await request(app.getHttpServer())
      .get(`/api/v1/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(historicalAttempt.body.data.answers).toHaveLength(3);
    expect(historicalAttempt.body.data.answers[0].questionText).toBe(
      'Which word means sensible and realistic?',
    );
    expect(historicalAttempt.body.data.answers[0].correctAnswer).toBe(
      'pragmatic',
    );
    expect(historicalAttempt.body.data.answers[0].vocabularyTerm).toBe(
      'pragmatic',
    );

    // 7. Retake quiz creates a new attempt
    const retakeRes = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ forceNew: true })
      .expect(201);
    expect(retakeRes.body.data.id).not.toBe(attemptId);

    // 8. Save vocabulary from quiz (new topic + quiz source item AND attach existing without duplicate)
    const saveNewVocab = await request(app.getHttpServer())
      .post('/api/v1/quizzes/save-vocabulary')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        term: 'mitigate',
        definition: 'make less severe or painful',
        newTopicName: 'Risk Management',
      })
      .expect(201);
    expect(saveNewVocab.body.data.createdNewItem).toBe(true);
    expect(saveNewVocab.body.data.item.source).toBe('quiz');
    expect(saveNewVocab.body.data.item.topics).toHaveLength(1);

    const attachExisting = await request(app.getHttpServer())
      .post('/api/v1/quizzes/save-vocabulary')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        existingVocabularyId: saveNewVocab.body.data.item.id,
        topicIds: [topicId],
      })
      .expect(201);
    expect(attachExisting.body.data.createdNewItem).toBe(false);
    expect(attachExisting.body.data.item.topics).toHaveLength(2);

    // 9. Quiz history lists both attempts
    const historyRes = await request(app.getHttpServer())
      .get(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(historyRes.body.data.items).toHaveLength(2);
  });
});
