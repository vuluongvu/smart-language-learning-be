import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, vi } from 'vitest';
import {
  AiService,
  DEFAULT_CHAT_MAX_TOKENS,
  DEFAULT_GROQ_FALLBACK_MODELS,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GROQ_WHISPER_MODEL,
  MAX_WHISPER_PROMPT_CHARS,
} from './ai.service.js';

function createService(env: Record<string, string | undefined>) {
  const config = {
    get: vi.fn((key: string) => env[key]),
    getOrThrow: vi.fn((key: string) => {
      if (env[key] === undefined) throw new Error(`Missing ${key}`);
      return env[key];
    }),
  } as unknown as ConfigService;
  return new AiService(config);
}

describe('AiService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('is disabled when AI_PROVIDER=none', async () => {
    const service = createService({ AI_PROVIDER: 'none' });
    expect(service.isEnabled()).toBe(false);
    await expect(
      service.chat([{ role: 'user', content: 'hi' }]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('defaults to qwen/qwen3.8-27b', () => {
    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'k' });
    expect(service.model).toBe(DEFAULT_GROQ_MODEL);
    expect(DEFAULT_GROQ_MODEL).toBe('qwen/qwen3.8-27b');
  });

  it('calls Groq chat completions and maps the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'qwen/qwen3.8-27b',
        choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });
    const result = await service.chat([{ role: 'user', content: 'hi' }]);

    expect(result).toEqual({
      model: 'qwen/qwen3.8-27b',
      content: 'Hello!',
      usage: { promptTokens: 5, completionTokens: 2, totalTokens: 7 },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer key');
    expect(JSON.parse(init.body).model).toBe('qwen/qwen3.8-27b');
  });

  it('throws BadGateway on non-2xx responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid key',
      }),
    );
    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'bad' });
    await expect(
      service.chat([{ role: 'user', content: 'hi' }]),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('requests json_object mode and parses JSON in chatJson', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'qwen/qwen3.8-27b',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '```json\n{"term":"resilient"}\n```',
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });
    const res = await service.chatJson<{ term: string }>([
      { role: 'user', content: 'json' },
    ]);

    expect(res.data).toEqual({ term: 'resilient' });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body).response_format).toEqual({
      type: 'json_object',
    });
  });

  it('throws BadGateway when chatJson receives malformed JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'qwen/qwen3.8-27b',
          choices: [{ message: { role: 'assistant', content: 'not json' } }],
        }),
      }),
    );
    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });
    await expect(
      service.chatJson([{ role: 'user', content: 'json' }]),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('transcribes audio using Groq Whisper and rejects empty buffers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: ' On weekends I usually meet my friends. ' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });
    await expect(
      service.transcribeAudio({
        buffer: Buffer.alloc(0),
        mimetype: 'audio/webm',
        originalname: 'empty.webm',
        size: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const out = await service.transcribeAudio(
      {
        buffer: Buffer.from([1, 2, 3, 4]),
        mimetype: 'audio/webm',
        originalname: 'speech.webm',
        size: 4,
      },
      { language: 'en', prompt: 'What do you do on weekends?' },
    );

    expect(out).toEqual({
      model: DEFAULT_GROQ_WHISPER_MODEL,
      text: 'On weekends I usually meet my friends.',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('prompt')).toBe(
      'What do you do on weekends?',
    );
  });

  it('fails over across the 3 strongest models on 429, skips cooled-down models, and restores primary after cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T00:00:00Z'));

    const fetchMock = vi
      .fn()
      // 1st chat(): primary qwen hits 429 (15s retry-after) -> immediately tries gpt-oss-120b
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '15' }),
        text: async () => 'qwen rate limit',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'openai/gpt-oss-120b',
          choices: [{ message: { role: 'assistant', content: 'from 120b' } }],
        }),
      })
      // 2nd chat() 2s later: qwen is skipped in cooldown, goes straight to gpt-oss-120b which hits 429 -> falls back to gpt-oss-20b
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '20' }),
        text: async () => '120b rate limit',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'openai/gpt-oss-20b',
          choices: [{ message: { role: 'assistant', content: 'from 20b' } }],
        }),
      })
      // 3rd chat() after 25s: qwen cooldown expired, primary restores
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: DEFAULT_GROQ_MODEL,
          choices: [{ message: { role: 'assistant', content: 'qwen back' } }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });
    expect(service.getCandidateModels()).toEqual([
      DEFAULT_GROQ_MODEL,
      ...DEFAULT_GROQ_FALLBACK_MODELS,
    ]);

    const res1 = await service.chat([{ role: 'user', content: 'turn 1' }]);
    expect(res1.model).toBe('openai/gpt-oss-120b');
    expect(res1.content).toBe('from 120b');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe(
      'qwen/qwen3.8-27b',
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe(
      'openai/gpt-oss-120b',
    );

    vi.advanceTimersByTime(2_000);
    const res2 = await service.chat([{ role: 'user', content: 'turn 2' }]);
    expect(res2.model).toBe('openai/gpt-oss-20b');
    expect(res2.content).toBe('from 20b');
    // Confirmed: qwen was skipped without a wasted request during cooldown
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).model).toBe(
      'openai/gpt-oss-120b',
    );
    expect(JSON.parse(fetchMock.mock.calls[3][1].body).model).toBe(
      'openai/gpt-oss-20b',
    );

    vi.advanceTimersByTime(25_000);
    const res3 = await service.chat([{ role: 'user', content: 'turn 3' }]);
    expect(res3.model).toBe(DEFAULT_GROQ_MODEL);
    expect(JSON.parse(fetchMock.mock.calls[4][1].body).model).toBe(
      'qwen/qwen3.8-27b',
    );
  });

  it('throws HTTP 429 with earliest wait hint when all 3 models are limited and short-circuits follow-up calls', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T00:00:00Z'));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '12' }),
        text: async () => 'limit 1',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '25' }),
        text: async () => 'limit 2',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '30' }),
        text: async () => 'limit 3',
      });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });

    let firstErr: unknown;
    try {
      await service.chat([{ role: 'user', content: 'hi' }]);
    } catch (err) {
      firstErr = err;
    }
    expect(firstErr).toBeInstanceOf(HttpException);
    expect((firstErr as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect((firstErr as HttpException).message).toContain('12s');
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Next immediate call fails fast in router without hitting network
    await expect(
      service.chat([{ role: 'user', content: 'hi again' }]),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('maps Whisper 429 and enforces compact prompt/chat defaults', async () => {
    const longPrompt = 'x'.repeat(MAX_WHISPER_PROMPT_CHARS + 50);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '9' }),
        text: async () => 'whisper rate limit',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'ok' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: DEFAULT_GROQ_MODEL,
          choices: [{ message: { role: 'assistant', content: 'ok' } }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });

    let whisperErr: unknown;
    try {
      await service.transcribeAudio({
        buffer: Buffer.from([1, 2]),
        mimetype: 'audio/webm',
        originalname: 'clip.webm',
        size: 2,
      });
    } catch (err) {
      whisperErr = err;
    }
    expect(whisperErr).toBeInstanceOf(HttpException);
    expect((whisperErr as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect((whisperErr as HttpException).message).toContain('9s');

    await service.transcribeAudio(
      {
        buffer: Buffer.from([1, 2]),
        mimetype: 'audio/webm',
        originalname: 'clip.webm',
        size: 2,
      },
      { prompt: longPrompt },
    );
    const [, whisperInit] = fetchMock.mock.calls[1];
    expect(
      ((whisperInit.body as FormData).get('prompt') as string).length,
    ).toBe(MAX_WHISPER_PROMPT_CHARS);

    await service.chat([{ role: 'user', content: 'hello' }]);
    const [, chatInit] = fetchMock.mock.calls[2];
    expect(JSON.parse(chatInit.body).max_tokens).toBe(DEFAULT_CHAT_MAX_TOKENS);
  });

  it('uses vision candidate pool without text fallbacks and maps 400 image error to BadRequest', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'qwen/qwen3.8-27b',
          choices: [
            { message: { role: 'assistant', content: '{"items":[]}' } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '{"error":{"message":"invalid image data"}}',
      });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService({
      AI_PROVIDER: 'groq',
      GROQ_API_KEY: 'key',
      GROQ_MODEL: 'openai/gpt-oss-120b',
    });

    expect(service.getCandidateModels(true)).toEqual(['qwen/qwen3.8-27b']);

    await service.chatJson(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract words' },
            {
              type: 'image_url',
              image_url: { url: 'data:image/png;base64,abc' },
            },
          ],
        },
      ],
      { vision: true },
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe(
      'qwen/qwen3.8-27b',
    );

    await expect(
      service.chat([{ role: 'user', content: 'bad image' }], { vision: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sends reasoning hints in jsonMode, strips unsupported reasoning fields on 400, and fails over on json_validate_failed/empty JSON', async () => {
    const fetchMock = vi
      .fn()
      // Attempt 1: qwen/qwen3.8-27b rejects reasoning_effort with 400 -> retry same model without reasoning fields
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          '{"error":{"message":"Unknown field: reasoning_effort"}}',
      })
      // Attempt 2: qwen/qwen3.8-27b returns 200 OK with empty content (finish_reason=length) -> failover to gpt-oss-120b
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'qwen/qwen3.8-27b',
          choices: [
            {
              message: { role: 'assistant', content: '' },
              finish_reason: 'length',
            },
          ],
        }),
      })
      // Attempt 3: openai/gpt-oss-120b returns 400 json_validate_failed -> retries same model without response_format
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          '{"error":{"code":"json_validate_failed","message":"Failed to generate JSON"}}',
      })
      // Attempt 4: openai/gpt-oss-120b plain prompt retry succeeds cleanly
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'openai/gpt-oss-120b',
          choices: [
            {
              message: { role: 'assistant', content: '{"status":"ok"}' },
              finish_reason: 'stop',
            },
          ],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });
    const res = await service.chatJson<{ status: string }>([
      { role: 'user', content: 'Return status' },
    ]);

    expect(res).toEqual({
      model: 'openai/gpt-oss-120b',
      data: { status: 'ok' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const call0Body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(call0Body.model).toBe('qwen/qwen3.8-27b');
    expect(call0Body.reasoning_effort).toBe('none');

    const call1Body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(call1Body.reasoning_effort).toBeUndefined();

    const call2Body = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(call2Body.model).toBe('openai/gpt-oss-120b');
    expect(call2Body.reasoning_effort).toBe('low');
    expect(call2Body.reasoning_format).toBe('parsed');
    expect(call2Body.response_format).toEqual({ type: 'json_object' });

    const call3Body = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(call3Body.model).toBe('openai/gpt-oss-120b');
    expect(call3Body.response_format).toBeUndefined();
  });

  it('fails over on network timeouts/404 and respects x-ratelimit-reset-tokens duration headers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-19T12:00:00Z'));

    try {
      const fetchMock = vi
        .fn()
        // Primary qwen times out/rejects -> fail over cleanly to gpt-oss-120b
        .mockRejectedValueOnce(new Error('timeout'))
        // gpt-oss-120b hits 429 with x-ratelimit-reset-tokens: 8.5s -> cooldown 9s, move to gpt-oss-20b
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'x-ratelimit-reset-tokens': '8.5s' }),
          text: async () => 'TPM limit reached',
        })
        // gpt-oss-20b succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            model: 'openai/gpt-oss-20b',
            choices: [{ message: { role: 'assistant', content: 'ready' } }],
          }),
        });
      vi.stubGlobal('fetch', fetchMock);

      const service = createService({
        AI_PROVIDER: 'groq',
        GROQ_API_KEY: 'key',
      });
      const res = await service.chat([{ role: 'user', content: 'hello' }]);

      expect(res.model).toBe('openai/gpt-oss-20b');
      expect(res.content).toBe('ready');

      const selectionAfter9s = service.selectAvailableModels(
        Date.now() + 9_500,
      );
      expect(selectionAfter9s.available).toContain('openai/gpt-oss-120b');
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces actionable 403 network/egress error without endless retries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'cf-ray': 'abc123-SIN' }),
      text: async () =>
        '{"error":{"message":"Access denied. Please check your network settings."}}',
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = createService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'key' });
    await expect(
      service.chat([{ role: 'user', content: 'hi' }]),
    ).rejects.toThrow('403');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
