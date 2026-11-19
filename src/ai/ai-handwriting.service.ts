import { Injectable } from '@nestjs/common';
import {
  type UploadedImageInput,
  validateAndEncodeImageDataUrl,
} from '../common/utils/image-upload.util.js';
import { AiService, type AiTokenUsage } from './ai.service.js';
import {
  type HandwritingExplanationLang,
  RecognizeHandwritingDto,
} from './dto/handwriting.dto.js';

export const MAX_HANDWRITING_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_CANDIDATES = 5;

export interface RecognizeHandwritingResult {
  model: string;
  recognizedText: string;
  candidates: string[];
  isMatch: boolean | null;
  feedback: string | null;
  usage?: AiTokenUsage;
}

interface RawHandwritingJson {
  recognizedText?: unknown;
  candidates?: unknown;
  isMatch?: unknown;
  feedback?: unknown;
}

function normalizeForComparison(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\s.,!?'"·\-~()[\]]+/g, '')
    .trim();
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

function buildHandwritingSystemPrompt(
  expectedText: string | undefined,
  explanationLang: HandwritingExplanationLang,
): string {
  const langLabel = explanationLang === 'en' ? 'English' : 'Vietnamese';

  if (expectedText) {
    return (
      'You are an expert Korean Hangul handwriting recognition and calligraphy tutor. ' +
      'Inspect the canvas image containing dark handwritten strokes on a white background (ignore any subtle guide lines). ' +
      `The learner was trying to write: "${expectedText}". ` +
      'First read objectively what Hangul syllables or isolated Jamo actually appear in the drawing (do not invent the target if strokes are missing, different, or blank). ' +
      'Check initial consonant, medial vowel stroke orientation/count (e.g. ㅏ vs ㅓ, ㅗ vs ㅜ, ㅐ vs ㅔ), and final consonant (batchim). ' +
      'Return valid JSON only with exact shape: ' +
      '{"recognizedText":"Hangul string or empty string if blank/illegible","candidates":["best Hangul match","2nd option","3rd option"],"isMatch":true|false,"feedback":"1-2 concise sentences in ' +
      langLabel +
      '"}. ' +
      `Rules: set isMatch to true ONLY when the handwritten strokes clearly depict "${expectedText}" (allowing natural handwriting variation); set isMatch to false if blank, illegible, or a different character/missing batchim. ` +
      `feedback MUST be written in ${langLabel}, encouraging and specific (praise good form or name exact Jamo/stroke to adjust).`
    );
  }

  return (
    'You are an expert Korean Hangul handwriting OCR assistant. ' +
    'Inspect the canvas image containing dark handwritten Korean strokes on a white background (ignore any faint grid lines). ' +
    'Read the handwritten Hangul syllables and/or isolated Jamo from left to right. ' +
    'Return valid JSON only with exact shape: ' +
    '{"recognizedText":"best Hangul reading or empty string if blank/illegible","candidates":["best guess","2nd closest Hangul","3rd closest Hangul","4th closest Hangul"],"isMatch":null,"feedback":null}. ' +
    `Rules: candidates must list up to 4 plausible Korean Hangul alternatives ordered best-first; keep isMatch as null; set feedback to null unless the image is blank or completely illegible (in which case give a brief 1-sentence hint in ${langLabel}).`
  );
}

@Injectable()
export class AiHandwritingService {
  constructor(private readonly aiService: AiService) {}

  /**
   * Sends a canvas drawing (PNG/JPEG/WebP/GIF) to the configured AI vision
   * model to recognize Korean Hangul text and optionally grade it against an
   * expected target word or character.
   */
  async recognizeHandwriting(
    image: UploadedImageInput | undefined,
    dto: RecognizeHandwritingDto,
  ): Promise<RecognizeHandwritingResult> {
    const dataUrl = validateAndEncodeImageDataUrl(
      image,
      MAX_HANDWRITING_IMAGE_BYTES,
      '2 MB',
    );
    const expectedText = cleanText(dto.expectedText, 120) ?? undefined;
    const explanationLang: HandwritingExplanationLang =
      dto.explanationLang === 'en' ? 'en' : 'vi';

    const userText = expectedText
      ? `Target Hangul: "${expectedText}". Recognize what is drawn and evaluate accuracy.`
      : 'Recognize the handwritten Korean Hangul text in this drawing.';

    const { model, data, usage } =
      await this.aiService.chatJson<RawHandwritingJson>(
        [
          {
            role: 'system',
            content: buildHandwritingSystemPrompt(
              expectedText,
              explanationLang,
            ),
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        {
          vision: true,
          temperature: 0.2,
          maxTokens: 450,
          timeoutMs: 45_000,
        },
      );

    return this.normalizeResult(model, data, expectedText, usage);
  }

  private normalizeResult(
    model: string,
    data: RawHandwritingJson,
    expectedText: string | undefined,
    usage: AiTokenUsage | undefined,
  ): RecognizeHandwritingResult {
    const rawRecognized = cleanText(data.recognizedText, 120);
    const rawCandidates = Array.isArray(data.candidates) ? data.candidates : [];

    const candidates: string[] = [];
    const seen = new Set<string>();
    const addCandidate = (candidate: string | null) => {
      if (!candidate) return;
      const normalized = candidate.normalize('NFC');
      if (seen.has(normalized)) return;
      seen.add(normalized);
      candidates.push(normalized);
    };

    addCandidate(rawRecognized);
    for (const item of rawCandidates) {
      if (candidates.length >= MAX_CANDIDATES) break;
      addCandidate(cleanText(item, 120));
    }

    const recognizedText =
      rawRecognized?.normalize('NFC') ?? candidates[0] ?? '';
    const feedback = cleanText(data.feedback, 500);

    let isMatch: boolean | null = null;
    if (expectedText) {
      if (!recognizedText && candidates.length === 0) {
        isMatch = false;
      } else if (typeof data.isMatch === 'boolean') {
        isMatch = data.isMatch;
      } else {
        isMatch =
          normalizeForComparison(recognizedText) ===
          normalizeForComparison(expectedText);
      }
    }

    return {
      model,
      recognizedText,
      candidates,
      isMatch,
      feedback,
      usage,
    };
  }
}
