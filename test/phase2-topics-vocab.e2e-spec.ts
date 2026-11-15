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

describe('Phase 2 Topics & Vocabulary (e2e)', () => {
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
        email: `p2.u1.${ts}@example.com`,
        displayName: 'User One',
        password,
      })
      .expect(201);
    user1Token = r1.body.data.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p2.u2.${ts}@example.com`,
        displayName: 'User Two',
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
        .send({ confirm: true, currentPassword: password });
    }
    if (user2Token) {
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ confirm: true, currentPassword: password });
    }
    await app.close();
  });

  it('supports CRUD, many-to-many topic-vocabulary, detach/delete safety, search, and ownership', async () => {
    const topicA = await request(app.getHttpServer())
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Environment', description: 'Climate & nature' })
      .expect(201);
    const topicAId = topicA.body.data.id;

    const topicB = await request(app.getHttpServer())
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Business' })
      .expect(201);
    const topicBId = topicB.body.data.id;

    // Create a multi-word phrase attached to both Topic A and Topic B
    const vocabRes = await request(app.getHttpServer())
      .post('/api/v1/vocabulary')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        term: 'carbon footprint',
        pronunciation: '/ˌkɑːr.bən ˈfʊt.prɪnt/',
        partOfSpeech: 'noun phrase',
        definition: 'Total greenhouse gas emissions caused by an entity',
        example: 'We aim to reduce our carbon footprint.',
        topicIds: [topicAId, topicBId],
      })
      .expect(201);

    const vocabId = vocabRes.body.data.id;
    expect(vocabRes.body.data.topics).toHaveLength(2);
    expect(vocabRes.body.data.duplicateWarning).toBe(false);

    // Check duplicate endpoint finds the term
    const dupRes = await request(app.getHttpServer())
      .get('/api/v1/vocabulary/check-duplicate?term=Carbon%20Footprint')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(dupRes.body.data.exists).toBe(true);

    // Cross-user access must be blocked
    await request(app.getHttpServer())
      .get(`/api/v1/topics/${topicAId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/vocabulary/${vocabId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ definition: 'Tampered' })
      .expect(403);

    // Detach from Topic A does NOT delete the vocabulary item
    await request(app.getHttpServer())
      .delete(`/api/v1/topics/${topicAId}/vocabulary/${vocabId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    // Deleting Topic B also does NOT delete the vocabulary item
    await request(app.getHttpServer())
      .delete(`/api/v1/topics/${topicBId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    const remaining = await request(app.getHttpServer())
      .get(`/api/v1/vocabulary/${vocabId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(remaining.body.data.term).toBe('carbon footprint');
    expect(remaining.body.data.topics).toHaveLength(0);

    // Search & pagination
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/vocabulary?search=carbon&sortBy=term_asc&page=1&limit=10')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(listRes.body.data.items).toHaveLength(1);
    expect(listRes.body.data.meta.total).toBe(1);
  });
});
