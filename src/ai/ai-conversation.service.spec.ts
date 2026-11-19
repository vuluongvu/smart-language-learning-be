import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { vi } from 'vitest';
import { AiConversationService } from './ai-conversation.service.js';
import { AiService } from './ai.service.js';
import { AiConversationSession } from './entities/ai-conversation-session.entity.js';
import { AiConversationTurn } from './entities/ai-conversation-turn.entity.js';

describe('AiConversationService', () => {
  let service: AiConversationService;
  let sessionRepo: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let turnRepo: {
    find: ReturnType<typeof vi.fn>;
  };
  let aiService: {
    chatJson: ReturnType<typeof vi.fn>;
  };
  let managerMock: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let dataSource: DataSource;

  beforeEach(() => {
    sessionRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn(),
      save: vi.fn(),
    };
    turnRepo = {
      find: vi.fn().mockResolvedValue([]),
    };
    aiService = {
      chatJson: vi.fn(),
    };
    managerMock = {
      create: vi.fn((_, data: object) => ({ ...data })),
      save: vi.fn(async (_, entity: Record<string, unknown>) => ({
        id: entity.id ?? 1,
        createdAt: new Date('2026-11-18T00:00:00Z'),
        updatedAt: new Date('2026-11-18T00:00:00Z'),
        ...entity,
      })),
    };
    dataSource = {
      transaction: vi.fn(
        async (cb: (m: typeof managerMock) => Promise<unknown>) =>
          cb(managerMock),
      ),
    } as unknown as DataSource;

    service = new AiConversationService(
      sessionRepo as unknown as Repository<AiConversationSession>,
      turnRepo as unknown as Repository<AiConversationTurn>,
      aiService as unknown as AiService,
      dataSource,
    );
  });

  it('starts a guided conversation with an AI opening question tailored to topic and level', async () => {
    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: {
        greeting: 'Welcome to our coffee shop practice!',
        openingQuestion: 'What kind of drink do you usually order at a cafe?',
      },
    });

    const detail = await service.startSession(5, {
      topic: 'Coffee Shop',
      level: 'B1',
      explanationLang: 'vi',
    });

    expect(detail.topic).toBe('Coffee Shop');
    expect(detail.level).toBe('B1');
    expect(detail.explanationLang).toBe('vi');
    expect(detail.status).toBe('active');
    expect(detail.turns).toHaveLength(1);
    expect(detail.turns[0].turnNumber).toBe(1);
    expect(detail.turns[0].aiPrompt).toContain(
      'What kind of drink do you usually order at a cafe?',
    );
    expect(detail.turns[0].userAnswer).toBeNull();
  });

  it('analyzes learner reply, returns notable errors + improved version + explanation, and generates a connected follow-up question', async () => {
    const activeSession: AiConversationSession = {
      id: 9,
      userId: 5,
      topic: 'Travel',
      level: 'B1',
      explanationLang: 'vi',
      status: 'active',
      turnCount: 0,
      summaryJson: null,
      createdAt: new Date('2026-11-18T00:00:00Z'),
      updatedAt: new Date('2026-11-18T00:00:00Z'),
      endedAt: null,
      user: undefined as never,
    };
    const pendingTurn: AiConversationTurn = {
      id: 101,
      sessionId: 9,
      turnNumber: 1,
      aiPrompt: 'Where did you go on your last trip?',
      userAnswer: null,
      feedbackJson: null,
      answeredAt: null,
      createdAt: new Date('2026-11-18T00:00:00Z'),
      session: activeSession,
    };

    sessionRepo.findOneBy.mockResolvedValue(activeSession);
    turnRepo.find.mockResolvedValue([pendingTurn]);
    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: {
        appropriateness: 'good',
        assessment: 'Ý rõ ràng nhưng thiếu chia quá khứ cho động từ go.',
        notableErrors: [
          {
            original: 'I go to Da Nang last summer',
            correction: 'I went to Da Nang last summer',
            category: 'grammar',
            reason:
              'Có mốc thời gian quá khứ "last summer" nên dùng thì quá khứ đơn.',
          },
        ],
        improvedVersion:
          'I went to Da Nang last summer and really enjoyed the beaches there.',
        explanation:
          'Dùng "went" cho hành động đã kết thúc và thêm "really enjoyed" giúp câu tự nhiên hơn.',
        suggestedWords: [
          {
            term: 'breathtaking',
            partOfSpeech: 'adjective',
            definition: 'đẹp ngoạn mục',
            example: 'The coastal view in Da Nang was breathtaking.',
          },
        ],
        followUpReaction: 'Da Nang sounds like a wonderful destination!',
        nextQuestion: 'What was your favorite place or food in Da Nang?',
      },
    });

    const updated = await service.replyToTurn(5, 9, {
      answer: 'I go to Da Nang last summer.',
    });

    expect(updated.turnCount).toBe(1);
    expect(updated.turns).toHaveLength(2);
    expect(updated.turns[0].userAnswer).toBe('I go to Da Nang last summer.');
    expect(updated.turns[0].feedback?.notableErrors).toHaveLength(1);
    expect(updated.turns[0].feedback?.improvedVersion).toContain(
      'went to Da Nang',
    );
    expect(updated.turns[1].turnNumber).toBe(2);
    expect(updated.turns[1].aiPrompt).toContain(
      'What was your favorite place or food in Da Nang?',
    );
    expect(updated.turns[1].userAnswer).toBeNull();
  });

  it('summarizes common mistakes, new vocabulary, and improvement tips when ending a session', async () => {
    const activeSession: AiConversationSession = {
      id: 9,
      userId: 5,
      topic: 'Travel',
      level: 'B1',
      explanationLang: 'vi',
      status: 'active',
      turnCount: 1,
      summaryJson: null,
      createdAt: new Date('2026-11-18T00:00:00Z'),
      updatedAt: new Date('2026-11-18T00:00:00Z'),
      endedAt: null,
      user: undefined as never,
    };
    const turn1: AiConversationTurn = {
      id: 101,
      sessionId: 9,
      turnNumber: 1,
      aiPrompt: 'Where did you go?',
      userAnswer: 'I go to Da Nang last year.',
      feedbackJson: {
        appropriateness: 'good',
        assessment: 'Good',
        notableErrors: [
          {
            original: 'I go',
            correction: 'I went',
            category: 'grammar',
            reason: 'Past tense',
          },
        ],
        improvedVersion: 'I went to Da Nang last year.',
        explanation: 'Use past tense.',
        suggestedWords: [],
      },
      answeredAt: new Date('2026-11-18T00:01:00Z'),
      createdAt: new Date('2026-11-18T00:00:00Z'),
      session: activeSession,
    };

    sessionRepo.findOneBy.mockResolvedValue(activeSession);
    sessionRepo.save.mockImplementation(async (s: AiConversationSession) => s);
    turnRepo.find.mockResolvedValue([turn1]);
    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: {
        overallRemark: 'Bạn phản hồi tự nhiên và giữ đúng mạch hội thoại.',
        commonMistakes: [
          {
            pattern: 'Nhầm thì hiện tại thay cho quá khứ đơn',
            example: 'I go -> I went',
            suggestion:
              'Kiểm tra trạng từ thời gian quá khứ trước khi chia động từ.',
          },
        ],
        newVocabulary: [
          {
            term: 'scenic route',
            partOfSpeech: 'noun',
            definition: 'cung đường ngắm cảnh đẹp',
            example: 'We took the scenic route along the coast.',
          },
        ],
        improvementTips: [
          'Luyện kể lại chuyến đi gần nhất bằng 5 câu quá khứ đơn.',
        ],
      },
    });

    const completed = await service.endSession(5, 9);

    expect(completed.status).toBe('completed');
    expect(completed.summary?.commonMistakes).toHaveLength(1);
    expect(completed.summary?.newVocabulary[0].term).toBe('scenic route');
    expect(completed.summary?.improvementTips).toHaveLength(1);

    const [summaryMessages, summaryOpts] = aiService.chatJson.mock.calls[0];
    expect(summaryOpts.maxTokens).toBe(850);
    expect(summaryMessages[1].content).toContain('"errs":["I go => I went"]');
  });

  it('rejects access by non-owners, replies to completed sessions, and invalid AI responses', async () => {
    sessionRepo.findOneBy.mockResolvedValue({
      id: 9,
      userId: 99,
      status: 'active',
    });
    await expect(service.getSessionDetail(5, 9)).rejects.toThrow(
      ForbiddenException,
    );

    sessionRepo.findOneBy.mockResolvedValue({
      id: 9,
      userId: 5,
      status: 'completed',
    });
    await expect(
      service.replyToTurn(5, 9, { answer: 'Hello' }),
    ).rejects.toThrow(BadRequestException);

    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: { greeting: 'Hi!' },
    });
    await expect(service.startSession(5, { topic: 'Work' })).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('supports Korean Hangul guided conversation sessions and filters sessions by languageCode', async () => {
    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: {
        greeting: '안녕하세요! 서울 카페 연습을 시작해 볼까요?',
        openingQuestion: '보통 카페에서 무슨 음료를 자주 주문해요?',
      },
    });

    const detail = await service.startSession(5, {
      languageCode: 'ko',
      topic: '카페에서 주문하기',
      level: 'A2',
      explanationLang: 'vi',
    });

    expect(detail.languageCode).toBe('ko');
    expect(detail.turns[0].aiPrompt).toContain('안녕하세요');
    const [promptMessages] = aiService.chatJson.mock.calls[0];
    expect(promptMessages[0].content).toContain('Korean conversation coach');

    sessionRepo.find.mockResolvedValue([]);
    await service.listSessions(5, 'ko');
    expect(sessionRepo.find).toHaveBeenCalledWith({
      where: { userId: 5, languageCode: 'ko' },
      order: { updatedAt: 'DESC', id: 'DESC' },
      take: 20,
    });
  });
});
