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
});
