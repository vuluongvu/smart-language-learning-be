import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
import { AiService } from '../ai/ai.service.js';
import { TopicsService } from '../topics/topics.service.js';
import { VocabularyAiService } from './vocabulary-ai.service.js';
import { VocabularyService } from './vocabulary.service.js';

describe('VocabularyAiService', () => {
  let service: VocabularyAiService;
  let aiService: { chatJson: ReturnType<typeof vi.fn> };
  let vocabularyService: {
    checkDuplicate: ReturnType<typeof vi.fn>;
    findExistingTermSet: ReturnType<typeof vi.fn>;
    listTopicTerms: ReturnType<typeof vi.fn>;
  };
  let topicsService: { findOwnedTopicsByIds: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    aiService = { chatJson: vi.fn() };
    vocabularyService = {
      checkDuplicate: vi.fn().mockResolvedValue({ exists: false, matches: [] }),
      findExistingTermSet: vi.fn().mockResolvedValue(new Set()),
      listTopicTerms: vi.fn().mockResolvedValue([]),
    };
    topicsService = {
      findOwnedTopicsByIds: vi.fn().mockResolvedValue([]),
    };

    service = new VocabularyAiService(
      aiService as unknown as AiService,
      vocabularyService as unknown as VocabularyService,
      topicsService as unknown as TopicsService,
    );
  });

  it('enriches a single English term with Vietnamese definition and duplicate flag', async () => {
    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: {
        term: 'resilient',
        pronunciation: '/rɪˈzɪliənt/',
        partOfSpeech: 'Adjective',
        definition: 'Kiên cường, mau phục hồi',
        example: 'She stayed resilient under pressure.',
        notes: 'Hay đi với "stay" hoặc "remain".',
      },
      usage: { promptTokens: 40, completionTokens: 60, totalTokens: 100 },
    });
    vocabularyService.checkDuplicate.mockResolvedValue({
      exists: true,
      matches: [{ id: 1, term: 'resilient', definition: 'old' }],
    });

    const result = await service.enrichTerm(5, { term: '  resilient  ' });

    expect(result.item).toEqual({
      term: 'resilient',
      pronunciation: '/rɪˈzɪliənt/',
      partOfSpeech: 'adjective',
      definition: 'Kiên cường, mau phục hồi',
      example: 'She stayed resilient under pressure.',
      notes: 'Hay đi với "stay" hoặc "remain".',
      alreadyExists: true,
      existingMatchCount: 1,
    });
  });

  it('throws BadRequest when enrich term is blank and BadGateway when AI omits definition', async () => {
    await expect(service.enrichTerm(5, { term: '   ' })).rejects.toThrow(
      BadRequestException,
    );

    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: { term: 'resilient', definition: '   ' },
    });
    await expect(service.enrichTerm(5, { term: 'resilient' })).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('generates batch vocabulary, deduplicates, checks existing terms, and includes topic context', async () => {
    topicsService.findOwnedTopicsByIds.mockResolvedValue([
      { id: 3, name: 'Environment', description: 'Green tech' },
    ]);
    vocabularyService.listTopicTerms.mockResolvedValue(['emission']);
    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: {
        items: [
          {
            term: 'sustainable',
            pronunciation: '/səˈsteɪnəbl/',
            partOfSpeech: 'adjective',
            definition: 'Bền vững',
            example: 'Sustainable energy reduces waste.',
            notes: 'null',
          },
          {
            term: 'Sustainable',
            partOfSpeech: 'adjective',
            definition: 'Duplicate inside batch should be dropped',
          },
          {
            term: 'renewable',
            pronunciation: '/rɪˈnjuːəbl/',
            partOfSpeech: 'adjective',
            definition: 'Có thể tái tạo',
            example: 'Solar power is a renewable resource.',
            notes: null,
          },
        ],
      },
    });
    vocabularyService.findExistingTermSet.mockResolvedValue(
      new Set(['renewable']),
    );

    const res = await service.generateBatch(5, {
      prompt: 'Clean energy',
      mode: 'topic',
      level: 'B2',
      count: 4,
      topicId: 3,
    });

    expect(topicsService.findOwnedTopicsByIds).toHaveBeenCalledWith(5, [3]);
    expect(vocabularyService.listTopicTerms).toHaveBeenCalledWith(5, 3, 30);
    expect(res.items).toEqual([
      {
        term: 'sustainable',
        pronunciation: '/səˈsteɪnəbl/',
        partOfSpeech: 'adjective',
        definition: 'Bền vững',
        example: 'Sustainable energy reduces waste.',
        notes: null,
        alreadyExists: false,
      },
      {
        term: 'renewable',
        pronunciation: '/rɪˈnjuːəbl/',
        partOfSpeech: 'adjective',
        definition: 'Có thể tái tạo',
        example: 'Solar power is a renewable resource.',
        notes: null,
        alreadyExists: true,
      },
    ]);
  });

  it('extracts vocabulary drafts and suggestedTopic from a valid uploaded image', async () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    topicsService.findOwnedTopicsByIds.mockResolvedValue([
      { id: 4, name: 'Travel', description: null },
    ]);
    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: {
        suggestedTopic: 'Airport Signs',
        items: [
          {
            term: 'boarding pass',
            pronunciation: '/ˈbɔːrdɪŋ pæs/',
            partOfSpeech: 'noun',
            definition: 'Thẻ lên máy bay',
            example: 'Please show your boarding pass at the gate.',
            notes: 'Thường dùng tại sân bay',
          },
          {
            term: 'BOARDING PASS',
            partOfSpeech: 'noun',
            definition: 'Duplicate term',
          },
        ],
      },
    });
    vocabularyService.findExistingTermSet.mockResolvedValue(new Set());

    const result = await service.extractFromImage(
      5,
      {
        buffer: pngBuffer,
        mimetype: 'application/octet-stream',
        originalname: 'sign.png',
        size: pngBuffer.length,
      },
      { prompt: 'Airport words', level: 'B1', count: 6, topicId: 4 },
    );

    expect(aiService.chatJson).toHaveBeenCalledWith(
      [
        expect.objectContaining({ role: 'system' }),
        {
          role: 'user',
          content: [
            expect.objectContaining({
              type: 'text',
              text: expect.stringContaining('Airport words'),
            }),
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${pngBuffer.toString('base64')}`,
              },
            },
          ],
        },
      ],
      expect.objectContaining({ vision: true }),
    );
    expect(result.suggestedTopic).toBe('Airport Signs');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].term).toBe('boarding pass');
  });

  it('rejects missing, unsupported, oversized, or empty-result image uploads', async () => {
    await expect(service.extractFromImage(5, undefined, {})).rejects.toThrow(
      BadRequestException,
    );

    await expect(
      service.extractFromImage(
        5,
        {
          buffer: Buffer.from('not-an-image'),
          mimetype: 'image/png',
          originalname: 'fake.png',
          size: 12,
        },
        {},
      ),
    ).rejects.toThrow(BadRequestException);

    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    await expect(
      service.extractFromImage(
        5,
        {
          buffer: oversized,
          mimetype: 'image/jpeg',
          originalname: 'big.jpg',
          size: oversized.length,
        },
        {},
      ),
    ).rejects.toThrow(BadRequestException);

    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: { suggestedTopic: null, items: [] },
    });
    await expect(
      service.extractFromImage(
        5,
        {
          buffer: jpegBuffer,
          mimetype: 'image/jpeg',
          originalname: 'blank.jpg',
          size: jpegBuffer.length,
        },
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('enriches Korean Hangul vocabulary with bilingual Korean-Vietnamese prompts', async () => {
    aiService.chatJson.mockResolvedValue({
      model: 'qwen/qwen3.8-27b',
      data: {
        term: '감사합니다',
        pronunciation: '[감ː사함니다 / gamsahamnida]',
        partOfSpeech: 'phrase',
        definition: 'cảm ơn (trang trọng)',
        example: '도와주셔서 정말 감사합니다.',
        notes: 'Dùng trong bối cảnh lịch sự, trang trọng.',
      },
    });

    const result = await service.enrichTerm(5, {
      term: '감사합니다',
      languageCode: 'ko',
    });

    expect(result.item.term).toBe('감사합니다');
    expect(vocabularyService.checkDuplicate).toHaveBeenCalledWith(
      5,
      '감사합니다',
      'ko',
    );
    const [messages] = aiService.chatJson.mock.calls[0];
    expect(messages[0].content).toContain('Korean-Vietnamese');
    expect(messages[1].content).toContain('Korean term:');
  });
});
