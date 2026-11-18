import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { vi } from 'vitest';
import { AiConversationService } from '../ai/ai-conversation.service.js';
import { AiService } from '../ai/ai.service.js';
import { LanguagesService } from '../languages/languages.service.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { TopicsService } from '../topics/topics.service.js';
import { User } from '../users/entities/user.entity.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import { VocabularyService } from '../vocabulary/vocabulary.service.js';
import { LearningPathPart } from './entities/learning-path-part.entity.js';
import { LearningPathTrack } from './entities/learning-path-track.entity.js';
import { LearningPathUnit } from './entities/learning-path-unit.entity.js';
import { UserUnitProgress } from './entities/user-unit-progress.entity.js';
import { LearningPathAiService } from './learning-path-ai.service.js';
import { LearningPathCatalogService } from './learning-path-catalog.service.js';
import { LearningPathService } from './learning-path.service.js';

describe('LearningPathService', () => {
  let service: LearningPathService;
  let learningPathAiService: LearningPathAiService;
  let userRepo: {
    findOneBy: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let trackRepo: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let partRepo: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
  };
  let unitRepo: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let progressRepo: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let vocabRepo: { createQueryBuilder: ReturnType<typeof vi.fn> };
  let topicVocabRepo: {
    find: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let catalogService: { ensureSeeded: ReturnType<typeof vi.fn> };
  let topicsService: {
    resolveOrCreateByNameWithinManager: ReturnType<typeof vi.fn>;
  };
  let vocabularyService: {
    findExistingTermSet: ReturnType<typeof vi.fn>;
    createBulk: ReturnType<typeof vi.fn>;
  };
  let aiService: { chatJson: ReturnType<typeof vi.fn> };
  let aiConversationService: {
    getSessionDetail: ReturnType<typeof vi.fn>;
    startSession: ReturnType<typeof vi.fn>;
  };
  let dataSource: DataSource;

  const sampleTrack: LearningPathTrack = {
    id: 1,
    code: 'band_45_55',
    title: 'Band 4.5–5.5',
    cefrLevel: 'B1',
    languageCode: 'en',
    summary: 'Foundation path',
    ownerUserId: null,
    isAiGenerated: false,
    sourcePrompt: null,
    sortOrder: 1,
    createdAt: new Date(),
  };

  const samplePart: LearningPathPart = {
    id: 10,
    trackId: 1,
    track: sampleTrack,
    partNumber: 1,
    title: 'My Everyday World',
    subtitle: 'Daily life topics',
    sortOrder: 1,
  };

  const sampleUnit1: LearningPathUnit = {
    id: 101,
    partId: 10,
    part: samplePart,
    unitNumber: 1,
    slug: 'where-do-you-live',
    title: 'Where Do You Live?',
    topicName: 'Neighborhood & Home',
    icon: 'home',
    themeColor: 'green',
    grammarFocus: 'Present simple & prepositions',
    vocabularyJson: [
      {
        term: 'cozy',
        pronunciation: '/ˈkoʊzi/',
        partOfSpeech: 'adjective',
        definition: 'ấm cúng',
        example: 'Our apartment is cozy.',
        notes: 'Natural everyday word.',
      },
      {
        term: 'balcony',
        pronunciation: '/ˈbælkəni/',
        partOfSpeech: 'noun',
        definition: 'ban công',
        example: 'We drink tea on the balcony.',
        notes: 'Use on the balcony.',
      },
    ],
    readingPassageJson: {
      title: 'Linh apartment',
      audioScript: 'I live in a cozy apartment with a balcony.',
      translation: 'Tôi sống ở căn hộ ấm cúng có ban công.',
      questions: [
        {
          id: 'q1',
          prompt: 'How is the apartment?',
          options: ['Noisy', 'Cozy'],
          correctIndex: 1,
          explanation: 'Passage says cozy apartment.',
        },
        {
          id: 'q2',
          prompt: 'What does it have?',
          options: ['Balcony', 'Garage'],
          correctIndex: 0,
          explanation: 'Passage mentions a balcony.',
        },
      ],
    },
    writingPromptJson: {
      prompt: 'Describe your home in 3-5 sentences.',
      minSentences: 3,
      targetBand: 'Band 4.5–5.5',
      targetTerms: ['cozy', 'balcony', 'convenient'],
      sampleAnswer: 'I live in a cozy home.',
    },
    speakingTopicPrompt: 'Describe your home and neighborhood',
    studyGuideJson: null,
    sortOrder: 1,
  };

  const sampleUnit2: LearningPathUnit = {
    ...sampleUnit1,
    id: 102,
    unitNumber: 2,
    slug: 'a-day-in-my-life',
    title: 'A Day in My Life',
    topicName: 'Daily Routine',
    sortOrder: 2,
  };

  beforeEach(() => {
    userRepo = {
      findOneBy: vi.fn().mockResolvedValue({
        id: 7,
        learningGoalBand: 'band_45_55',
        currentLevel: 'B1',
        dailyGoalMinutes: 15,
      }),
      save: vi.fn(async (u: object) => u),
    };
    trackRepo = {
      find: vi.fn().mockResolvedValue([sampleTrack]),
      findOneBy: vi.fn().mockResolvedValue(sampleTrack),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    partRepo = {
      find: vi.fn().mockResolvedValue([samplePart]),
      findOneBy: vi.fn().mockResolvedValue(samplePart),
    };
    unitRepo = {
      find: vi.fn().mockResolvedValue([sampleUnit1, sampleUnit2]),
      findOneBy: vi.fn().mockResolvedValue(sampleUnit1),
      save: vi.fn(async (u: object) => u),
    };
    progressRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
      create: vi.fn((x: object) => x),
      save: vi.fn(async (x: object) => ({ id: 50, ...x })),
    };
    vocabRepo = {
      createQueryBuilder: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      }),
    };
    topicVocabRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((x: object) => x),
      save: vi.fn(async (x: object) => x),
    };
    catalogService = {
      ensureSeeded: vi.fn().mockResolvedValue(undefined),
    };
    topicsService = {
      resolveOrCreateByNameWithinManager: vi.fn().mockResolvedValue({
        topic: { id: 88, name: 'Neighborhood & Home' },
        created: true,
      }),
    };
    vocabularyService = {
      findExistingTermSet: vi.fn().mockResolvedValue(new Set<string>()),
      createBulk: vi.fn().mockResolvedValue({ createdCount: 2, items: [] }),
    };
    aiService = {
      chatJson: vi.fn(),
    };
    aiConversationService = {
      getSessionDetail: vi.fn(),
      startSession: vi.fn(),
    };
    dataSource = {
      getRepository: vi.fn(),
      transaction: vi.fn(async (cb: (m: unknown) => Promise<unknown>) =>
        cb({}),
      ),
    } as unknown as DataSource;

    learningPathAiService = new LearningPathAiService(
      aiService as unknown as AiService,
    );

    service = new LearningPathService(
      userRepo as unknown as Repository<User>,
      trackRepo as unknown as Repository<LearningPathTrack>,
      partRepo as unknown as Repository<LearningPathPart>,
      unitRepo as unknown as Repository<LearningPathUnit>,
      progressRepo as unknown as Repository<UserUnitProgress>,
      vocabRepo as unknown as Repository<VocabularyItem>,
      topicVocabRepo as unknown as Repository<TopicVocabulary>,
      catalogService as unknown as LearningPathCatalogService,
      topicsService as unknown as TopicsService,
      vocabularyService as unknown as VocabularyService,
      {
        findActiveByCode: vi.fn().mockResolvedValue({ id: 1, code: 'en' }),
      } as unknown as LanguagesService,
      aiService as unknown as AiService,
      aiConversationService as unknown as AiConversationService,
      learningPathAiService,
      dataSource,
    );
  });

  it('computes overview unlock progression (unlocks Unit 2 after >= 2 skills on Unit 1) and updates goal', async () => {
    const initial = await service.getOverview(7);
    expect(initial.parts[0].units[0].unlocked).toBe(true);
    expect(initial.parts[0].units[1].unlocked).toBe(false);
    expect(initial.stats.recommendedUnitId).toBe(101);

    progressRepo.find.mockResolvedValue([
      {
        unitId: 101,
        vocabCompleted: true,
        quizCompleted: true,
        writingCompleted: false,
        speakingCompleted: false,
      },
    ]);

    const updated = await service.updateGoal(7, {
      learningGoalBand: 'band_45_55',
      currentLevel: 'B1',
      dailyGoalMinutes: 20,
    });
    expect(updated.goal.dailyGoalMinutes).toBe(20);
    expect(updated.parts[0].units[1].unlocked).toBe(true);
    expect(userRepo.save).toHaveBeenCalled();
  });

  it('syncs curated vocabulary to notebook and grades unit quiz with 0 live AI tokens', async () => {
    const synced = await service.syncUnitVocabToNotebook(7, 101);
    expect(synced.topicId).toBe(88);
    expect(synced.addedCount).toBe(2);
    expect(synced.progress.vocabCompleted).toBe(true);
    expect(aiService.chatJson).not.toHaveBeenCalled();

    const quizRes = await service.submitUnitQuiz(7, 101, {
      answers: [
        { questionId: 'q1', selectedIndex: 1 },
        { questionId: 'q2', selectedIndex: 1 },
      ],
    });
    expect(quizRes.correctCount).toBe(1);
    expect(quizRes.total).toBe(2);
    expect(quizRes.score).toBe(50);
    expect(quizRes.progress.quizCompleted).toBe(true);
    expect(aiService.chatJson).not.toHaveBeenCalled();
  });

  it('evaluates learner writing via AI calibrated to target Band and detects used target words', async () => {
    await expect(
      service.evaluateUnitWriting(7, 101, { text: 'short' }),
    ).rejects.toThrow(BadRequestException);

    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: {
        estimatedBand: 'Band 5.0',
        summary: 'Câu rõ nghĩa và dùng đúng ngữ cảnh.',
        notableErrors: [
          {
            original: 'is have a balcony',
            correction: 'has a balcony',
            reason: 'Không dùng is trước have trong thì hiện tại đơn.',
          },
        ],
        upgradedVersion: 'I live in a cozy apartment that has a small balcony.',
        explanation: '1. **Động từ**: Dùng `has` thay cho `is have`.',
        suggestedWords: [
          {
            term: 'well-lit',
            partOfSpeech: 'adjective',
            definition: 'nhiều ánh sáng',
            example: 'Our living room is warm and well-lit.',
          },
        ],
      },
    });

    const evalRes = await service.evaluateUnitWriting(7, 101, {
      text: 'I live in a cozy apartment and it is have a balcony.',
      explanationLang: 'vi',
    });

    expect(evalRes.feedback.usedTargetTerms).toEqual(['cozy', 'balcony']);
    expect(evalRes.feedback.missedTargetTerms).toEqual(['convenient']);
    expect(evalRes.feedback.estimatedBand).toBe('Band 5.0');
    expect(evalRes.progress.writingCompleted).toBe(true);
  });

  it('links speaking AI conversation and saves suggested words to unit topic notebook', async () => {
    aiConversationService.startSession.mockResolvedValue({
      id: 300,
      topic: 'Where Do You Live?',
      level: 'B1',
      explanationLang: 'vi',
      status: 'active',
      turnCount: 0,
      summary: null,
      turns: [],
    });

    const speaking = await service.startUnitSpeaking(7, 101, {
      explanationLang: 'vi',
    });
    expect(speaking.session.id).toBe(300);
    expect(speaking.progress.speakingSessionId).toBe(300);

    progressRepo.findOneBy.mockResolvedValue({
      id: 50,
      userId: 7,
      unitId: 101,
      vocabCompleted: true,
      quizCompleted: true,
      writingCompleted: true,
      speakingCompleted: false,
      speakingSessionId: 300,
      topicId: 88,
      completedAt: null,
    });
    dataSource.getRepository = vi.fn().mockReturnValue({
      findOneBy: vi
        .fn()
        .mockResolvedValue({ id: 88, userId: 7, name: 'Neighborhood & Home' }),
    });

    const completed = await service.completeUnitSpeaking(7, 101);
    expect(completed.progress.speakingCompleted).toBe(true);
    expect(completed.progress.percentDone).toBe(100);
    expect(completed.progress.completedAt).toBeTruthy();

    const savedWords = await service.saveWordsToUnitNotebook(7, 101, {
      words: [
        {
          term: 'well-lit',
          partOfSpeech: 'adjective',
          definition: 'nhiều ánh sáng',
          example: 'Our living room is well-lit.',
        },
      ],
    });
    expect(savedWords.addedCount).toBe(1);
    expect(savedWords.topicId).toBe(88);
  });

  it('generates an AI learning path with study materials across 2 units and prevents cross-user access', async () => {
    const savedTracks: LearningPathTrack[] = [];
    const savedParts: LearningPathPart[] = [];
    const savedUnits: LearningPathUnit[] = [];

    aiService.chatJson
      .mockResolvedValueOnce({
        model: 'qwen/qwen3.8-27b',
        data: {
          trackTitle: 'Backend Job Interviews',
          trackSummary: 'Lộ trình luyện phỏng vấn kỹ sư phần mềm.',
          partTitle: 'Core Interview Modules',
          partSubtitle: 'Giới thiệu bản thân và kiến trúc hệ thống',
          units: [
            {
              title: 'System Design Pitch',
              topicName: 'Software Architecture',
              grammarFocus: 'Past simple & passive voice',
              icon: 'layers',
              themeColor: 'lavender',
              speakingTopicPrompt: 'Explain a backend architecture you built.',
            },
            {
              title: 'Scaling & Trade-offs',
              topicName: 'System Reliability',
              grammarFocus: 'Conditionals & modals',
              icon: 'bar-chart',
              themeColor: 'green',
              speakingTopicPrompt: 'Discuss database caching trade-offs.',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        model: 'openai/gpt-oss-120b',
        data: {
          studyGuide: {
            overview: 'Tổng quan cách trình bày dự án backend rõ ràng.',
            grammarPoints: [
              {
                title: 'Past Simple for impact',
                explanation: 'Dùng quá khứ đơn khi mô tả kết quả đạt được.',
                example: 'I reduced API latency by 40 percent.',
              },
            ],
            keyPatterns: [
              {
                pattern: 'We opted for X in order to Y',
                meaning: 'Chúng tôi chọn X để đạt được Y',
                example: 'We opted for Redis in order to cache hot queries.',
              },
            ],
            commonMistakes: [
              {
                mistake: 'I was optimize the query.',
                correction: 'I optimized the query.',
                tip: 'Không dùng was + V nguyên thể cho câu chủ động.',
              },
            ],
            studyTips: ['Luyện nói thành tiếng số liệu cụ thể của dự án.'],
          },
          vocabulary: [
            {
              term: 'bottleneck',
              pronunciation: '/ˈbɑːtlnek/',
              partOfSpeech: 'noun',
              definition: 'điểm nghẽn hiệu năng',
              example: 'The database became our main bottleneck.',
              notes: 'Hay đi với identify / eliminate.',
            },
            {
              term: 'throughput',
              pronunciation: '/ˈθruːpʊt/',
              partOfSpeech: 'noun',
              definition: 'lưu lượng xử lý',
              example: 'Caching doubled our request throughput.',
              notes: 'Dùng trong mô tả scalability.',
            },
          ],
          readingListening: {
            title: 'Resolving a Traffic Spike',
            audioScript:
              'Last quarter our payment service hit a bottleneck during flash sales, so we added caching to boost throughput.',
            translation:
              'Quý trước dịch vụ thanh toán gặp điểm nghẽn nên chúng tôi đã thêm cache.',
            questions: [
              {
                prompt: 'Why did they add caching?',
                options: [
                  'To remove UI CSS',
                  'To increase throughput',
                  'To delete logs',
                  'To change DB',
                ],
                correctIndex: 1,
                explanation: 'They added caching to boost throughput.',
              },
            ],
          },
          writing: {
            prompt:
              'Write 4 sentences about a performance bottleneck you solved.',
            minSentences: 4,
            targetTerms: ['bottleneck', 'throughput'],
            sampleAnswer: 'Last year our API hit a database bottleneck.',
          },
        },
      })
      .mockResolvedValueOnce({
        model: 'openai/gpt-oss-20b',
        data: {
          studyGuide: {
            overview: 'Cách phân tích đánh đổi giữa tốc độ và độ nhất quán.',
            grammarPoints: [],
            keyPatterns: [],
            commonMistakes: [],
            studyTips: ['Luôn nêu rõ ưu và nhược điểm.'],
          },
          vocabulary: [
            {
              term: 'trade-off',
              pronunciation: '/ˈtreɪd ɔːf/',
              partOfSpeech: 'noun',
              definition: 'sự đánh đổi',
              example: 'Eventual consistency is a common trade-off.',
              notes: 'Danh từ ghép phổ biến.',
            },
            {
              term: 'resilient',
              pronunciation: '/rɪˈzɪliənt/',
              partOfSpeech: 'adjective',
              definition: 'có khả năng chịu lỗi tốt',
              example: 'Retries make microservices more resilient.',
              notes: 'Dùng để mô tả hệ thống bền bỉ.',
            },
          ],
          readingListening: {
            title: 'Designing Resilient Queues',
            audioScript:
              'Every architecture involves a trade-off, and queues help keep distributed workers resilient.',
            translation:
              'Mọi kiến trúc đều có sự đánh đổi để hệ thống chịu lỗi tốt hơn.',
            questions: [
              {
                prompt: 'What do queues help improve?',
                options: ['Resilience', 'Font size', 'Colors', 'Icons'],
                correctIndex: 0,
                explanation: 'Queues make workers resilient.',
              },
            ],
          },
          writing: {
            prompt: 'Explain one system trade-off.',
            minSentences: 4,
            targetTerms: ['trade-off', 'resilient'],
            sampleAnswer:
              'Adding a message queue introduces a small delay trade-off.',
          },
        },
      });

    dataSource.transaction = vi.fn(
      async (cb: (m: unknown) => Promise<unknown>) =>
        cb({
          getRepository: (entity: unknown) => {
            if (entity === LearningPathTrack) {
              return {
                create: (x: object) => x,
                save: async (t: LearningPathTrack) => {
                  const row = { ...t, id: 99, createdAt: new Date() };
                  savedTracks.push(row);
                  return row;
                },
              };
            }
            if (entity === LearningPathPart) {
              return {
                create: (x: object) => x,
                save: async (p: LearningPathPart) => {
                  const row = { ...p, id: 199 };
                  savedParts.push(row);
                  return row;
                },
              };
            }
            return {
              create: (x: object) => x,
              save: async (u: LearningPathUnit) => {
                const row = { ...u, id: 500 + savedUnits.length };
                savedUnits.push(row);
                return row;
              },
            };
          },
        }),
    ) as unknown as DataSource['transaction'];

    trackRepo.find.mockImplementation(async () => [
      sampleTrack,
      ...savedTracks,
    ]);
    partRepo.find.mockImplementation(
      async ({ where }: { where: { trackId: number } }) =>
        where.trackId === 99 ? savedParts : [samplePart],
    );
    unitRepo.find.mockImplementation(async () => savedUnits);

    const overview = await service.generateAiLearningPath(7, {
      goalTopic: 'Backend Job Interviews',
      learningFocus: 'Focus on spoken confidence and architecture terms',
      targetBand: 'band_55_65',
      currentLevel: 'B1',
      unitCount: 2,
      explanationLang: 'vi',
    });

    expect(savedTracks).toHaveLength(1);
    expect(savedTracks[0].ownerUserId).toBe(7);
    expect(savedTracks[0].isAiGenerated).toBe(true);
    expect(savedUnits).toHaveLength(2);
    expect(savedUnits[0].studyGuideJson?.keyPatterns[0].pattern).toContain(
      'We opted for',
    );
    expect(overview.activeTrack.isAiGenerated).toBe(true);
    expect(overview.parts[0].units).toHaveLength(2);

    // Ownership isolation checks
    unitRepo.findOneBy.mockResolvedValue(savedUnits[0]);
    partRepo.findOneBy.mockResolvedValue(savedParts[0]);
    trackRepo.findOneBy.mockResolvedValue(savedTracks[0]);

    await expect(service.getUnitDetail(999, savedUnits[0].id)).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.deleteAiTrack(999, 99)).rejects.toThrow(
      NotFoundException,
    );

    const ownerDetail = await service.getUnitDetail(7, savedUnits[0].id);
    expect(ownerDetail.isCustomAiTrack).toBe(true);
    expect(ownerDetail.studyGuide?.overview).toContain('backend');

    // Study guide on a curated unit persists to UserUnitProgress
    unitRepo.findOneBy.mockResolvedValue(sampleUnit1);
    partRepo.findOneBy.mockResolvedValue(samplePart);
    trackRepo.findOneBy.mockResolvedValue(sampleTrack);
    progressRepo.findOneBy.mockResolvedValue(null);
    aiService.chatJson.mockResolvedValueOnce({
      model: 'qwen/qwen3.8-27b',
      data: {
        overview: 'Tài liệu ôn tập cá nhân hóa.',
        grammarPoints: [
          {
            title: 'Present Simple',
            explanation: 'Diễn tả nơi ở cố định.',
            example: 'My apartment sits near a park.',
          },
        ],
        keyPatterns: [],
        commonMistakes: [],
        studyTips: ['Ôn thẻ ghi nhớ mỗi sáng 10 phút.'],
      },
    });

    const customGuide = await service.generateUnitStudyGuide(7, 101, {
      focusGoal: 'Emphasize practical apartment descriptions',
      explanationLang: 'vi',
    });
    expect(customGuide.studyGuide.overview).toBe(
      'Tài liệu ôn tập cá nhân hóa.',
    );
    expect(progressRepo.save).toHaveBeenCalled();

    // Deleting curated track is blocked, while deleting owner's AI track succeeds
    await expect(service.deleteAiTrack(7, 1)).rejects.toThrow(
      BadRequestException,
    );
    trackRepo.findOneBy.mockResolvedValue(savedTracks[0]);
    await service.deleteAiTrack(7, 99);
    expect(trackRepo.remove).toHaveBeenCalledWith(savedTracks[0]);
  });

  it('repairs partial or alternatively keyed AI study materials and retries once on transient JSON failure', async () => {
    aiService.chatJson
      .mockRejectedValueOnce(new Error('Truncated JSON output'))
      .mockResolvedValueOnce({
        model: 'qwen/qwen3.8-27b',
        data: {
          words: [
            {
              word: 'stance',
              meaning: 'Quan điểm rõ ràng về một vấn đề',
            },
          ],
          reading_listening: {
            title: 'Nuanced Perspectives',
          },
        },
      });

    const pack = await learningPathAiService.generateUnitStudyPack({
      unit: {
        unitNumber: 2,
        title: 'Nuanced Opinion Formation',
        topicName: 'Academic Debate & Critical Thinking',
        grammarFocus: 'Concessive clauses with although and whereas',
      },
      goalTopic: 'IELTS Speaking & Writing Band 6.5',
      targetBand: 'band_55_65',
      explanationLang: 'vi',
    });

    expect(aiService.chatJson).toHaveBeenCalledTimes(2);
    expect(pack.vocabulary.length).toBeGreaterThanOrEqual(4);
    expect(pack.vocabulary[0].term).toBe('stance');
    expect(pack.readingListening.audioScript.length).toBeGreaterThan(40);
    expect(pack.readingListening.questions.length).toBeGreaterThanOrEqual(2);
    expect(pack.studyGuide.grammarPoints.length).toBeGreaterThanOrEqual(1);
  });
});
