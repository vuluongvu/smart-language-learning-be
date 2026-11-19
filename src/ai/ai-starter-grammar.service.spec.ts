import { BadGatewayException } from '@nestjs/common';
import { vi } from 'vitest';
import { AiStarterGrammarService } from './ai-starter-grammar.service.js';
import { type AiService } from './ai.service.js';

describe('AiStarterGrammarService', () => {
  it('normalizes generated grammar lessons with choice and scramble exercises', async () => {
    const aiService = {
      chatJson: vi.fn().mockResolvedValue({
        model: 'qwen/qwen3.8-27b',
        usage: { promptTokens: 120, completionTokens: 210, totalTokens: 330 },
        data: {
          category: 'verbs',
          titleVi: 'Thì quá khứ đơn (Past Simple)',
          titleEn: 'Past Simple Tense',
          formula: 'S + V-ed / V2 · S + did not + V',
          explanationVi: 'Dùng để kể lại hành động đã kết thúc trong quá khứ.',
          explanationEn: 'Used for completed actions in the past.',
          rules: [
            {
              labelVi: 'Động từ có quy tắc',
              labelEn: 'Regular verbs',
              sample: 'worked / played',
            },
          ],
          examples: [
            {
              sentence: 'I walked to school yesterday.',
              reading: '/aɪ wɔːkt tuː skuːl ˈjestərdeɪ/',
              meaningVi: 'Hôm qua tôi đi bộ tới trường.',
              meaningEn: 'I walked to school yesterday.',
            },
          ],
          mistake: 'I go yesterday.',
          correction: 'I went yesterday.',
          mistakeNoteVi: 'Động từ bất quy tắc của "go" là "went".',
          mistakeNoteEn: 'Past form of "go" is "went".',
          aiPromptVi: 'Cho mình 5 động từ bất quy tắc hay gặp.',
          aiPromptEn: 'Give me 5 common irregular verbs.',
          exercises: [
            {
              kind: 'choice',
              promptVi: 'Chọn động từ quá khứ phù hợp:',
              promptEn: 'Choose the past tense verb:',
              stem: 'She ___ dinner last night.',
              correctOption: 'cooked',
              options: ['cook', 'cooked', 'cooking', 'cooks'],
              completedSentence: 'She cooked dinner last night.',
              explanationVi: 'last night chỉ quá khứ nên dùng cooked.',
              explanationEn: '"last night" signals past simple: cooked.',
            },
            {
              kind: 'scramble',
              promptVi: 'Sắp xếp thành câu hoàn chỉnh:',
              promptEn: 'Arrange words cleanly:',
              stem: 'Hôm qua anh ấy đã uống trà.',
              correctOption: 'He drank tea yesterday.',
              options: [],
              scrambleWords: ['He', 'drank', 'tea', 'yesterday.'],
              completedSentence: 'He drank tea yesterday.',
              explanationVi: 'Giữ trật tự S + V2 + O + trạng ngữ thời gian.',
              explanationEn: 'Keep Subject + Past Verb + Object + Time order.',
            },
          ],
        },
      }),
    } as unknown as AiService;

    const service = new AiStarterGrammarService(aiService);
    const result = await service.generate({
      topic: 'Past simple',
      level: 'A1',
      languageCode: 'en',
      exerciseCount: 2,
    });

    expect(result.model).toBe('qwen/qwen3.8-27b');
    expect(result.grammarPoint.isAiGenerated).toBe(true);
    expect(result.grammarPoint.level).toBe('A1');
    expect(result.grammarPoint.category).toBe('verbs');
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0].kind).toBe('choice');
    expect(result.exercises[0].options).toContain('cooked');
    expect(result.exercises[1].kind).toBe('scramble');
    // Unscrambled token array gets cleanly rotated away from solution order
    expect(result.exercises[1].scrambleWords?.join(' ')).not.toBe(
      'He drank tea yesterday.',
    );
    expect(result.exercises[1].correctOption).toBe('He drank tea yesterday.');
  });

  it('repairs Korean payloads with missing options and throws when examples are absent', async () => {
    const aiService = {
      chatJson: vi
        .fn()
        .mockResolvedValueOnce({
          model: 'openai/gpt-oss-120b',
          data: {
            category: 'invalid-cat',
            titleVi: 'Liên kết -고',
            titleEn: 'Connecting -고',
            formula: 'Động từ + 고',
            examples: [
              {
                sentence: '커피를 마시고 빵을 먹어요.',
                reading: 'keo-pi-reul ma-si-go ppang-eul meo-geo-yo',
                meaningVi: 'Uống cà phê và ăn bánh mì.',
                meaningEn: 'Drink coffee and eat bread.',
              },
            ],
            exercises: [
              {
                kind: 'choice',
                correctOption: '마시고',
                options: ['마시고'],
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          model: 'openai/gpt-oss-120b',
          data: { titleVi: 'Empty', examples: [] },
        }),
    } as unknown as AiService;

    const service = new AiStarterGrammarService(aiService);
    const repaired = await service.generate({
      topic: '-고',
      languageCode: 'ko',
      exerciseCount: 2,
    });

    expect(repaired.grammarPoint.category).toBe('verbs');
    expect(repaired.exercises).toHaveLength(1);
    // Falls back to deterministic scramble from example when options < 2
    expect(repaired.exercises[0].kind).toBe('scramble');
    expect(repaired.exercises[0].completedSentence).toBe(
      '커피를 마시고 빵을 먹어요.',
    );

    await expect(
      service.generate({ topic: 'Missing', languageCode: 'ko' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
