import { BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
import {
  AiHandwritingService,
  MAX_HANDWRITING_IMAGE_BYTES,
} from './ai-handwriting.service.js';
import { type AiService } from './ai.service.js';

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);

function makePngFile(size?: number) {
  const buffer =
    size && size > PNG_HEADER.length
      ? Buffer.concat([PNG_HEADER, Buffer.alloc(size - PNG_HEADER.length)])
      : PNG_HEADER;
  return {
    buffer,
    mimetype: 'image/png',
    originalname: 'handwriting.png',
    size: buffer.length,
  };
}

describe('AiHandwritingService', () => {
  it('rejects missing or empty image files', async () => {
    const aiService = { chatJson: vi.fn() } as unknown as AiService;
    const service = new AiHandwritingService(aiService);

    await expect(
      service.recognizeHandwriting(undefined, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.recognizeHandwriting(
        {
          buffer: Buffer.alloc(0),
          mimetype: 'image/png',
          originalname: 'empty.png',
          size: 0,
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects oversized or non-image files', async () => {
    const aiService = { chatJson: vi.fn() } as unknown as AiService;
    const service = new AiHandwritingService(aiService);

    await expect(
      service.recognizeHandwriting(
        makePngFile(MAX_HANDWRITING_IMAGE_BYTES + 1),
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.recognizeHandwriting(
        {
          buffer: Buffer.from('not-an-image-payload'),
          mimetype: 'image/png',
          originalname: 'fake.png',
          size: 20,
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recognizes freehand Hangul and deduplicates up to 5 candidates', async () => {
    const chatJson = vi.fn().mockResolvedValue({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      data: {
        recognizedText: '안녕',
        candidates: ['안녕', '안영', '안념', '알녕', '안년', '안명'],
        isMatch: false,
        feedback: null,
      },
      usage: { promptTokens: 200, completionTokens: 40, totalTokens: 240 },
    });
    const service = new AiHandwritingService({
      chatJson,
    } as unknown as AiService);

    const result = await service.recognizeHandwriting(makePngFile(), {
      mode: 'recognize',
    });

    expect(chatJson).toHaveBeenCalledTimes(1);
    const [messages, options] = chatJson.mock.calls[0] as [
      Array<{ role: string; content: unknown }>,
      Record<string, unknown>,
    ];
    expect(options).toMatchObject({ vision: true, temperature: 0.2 });
    expect(Array.isArray(messages[1].content)).toBe(true);
    expect(result).toEqual({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      recognizedText: '안녕',
      candidates: ['안녕', '안영', '안념', '알녕', '안년'],
      isMatch: null,
      feedback: null,
      usage: { promptTokens: 200, completionTokens: 40, totalTokens: 240 },
    });
  });

  it('evaluates drawing against expectedText and returns match and feedback', async () => {
    const chatJson = vi.fn().mockResolvedValue({
      model: 'vision-model',
      data: {
        recognizedText: '학교',
        candidates: ['학교', '학고'],
        isMatch: true,
        feedback: 'Nét chữ rõ ràng và cân đối.',
      },
    });
    const service = new AiHandwritingService({
      chatJson,
    } as unknown as AiService);

    const result = await service.recognizeHandwriting(makePngFile(), {
      expectedText: '학교',
      explanationLang: 'vi',
      mode: 'evaluate',
    });

    expect(result.isMatch).toBe(true);
    expect(result.recognizedText).toBe('학교');
    expect(result.feedback).toBe('Nét chữ rõ ràng và cân đối.');
  });

  it('forces isMatch=false when expectedText is set and canvas is blank/illegible', async () => {
    const chatJson = vi.fn().mockResolvedValue({
      model: 'vision-model',
      data: {
        recognizedText: '',
        candidates: [],
        isMatch: true,
        feedback: 'Please draw clearly inside the box.',
      },
    });
    const service = new AiHandwritingService({
      chatJson,
    } as unknown as AiService);

    const result = await service.recognizeHandwriting(makePngFile(), {
      expectedText: '한국',
      explanationLang: 'en',
      mode: 'evaluate',
    });

    expect(result.recognizedText).toBe('');
    expect(result.isMatch).toBe(false);
    expect(result.feedback).toBe('Please draw clearly inside the box.');
  });
});
