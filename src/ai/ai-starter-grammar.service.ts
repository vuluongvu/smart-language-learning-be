import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  type LearningLanguageCode,
  normalizeLearningLanguage,
} from '../common/constants/learning-languages.js';
import { AiService, type AiTokenUsage } from './ai.service.js';
import {
  type GenerateStarterGrammarDto,
  type StarterGrammarLevel,
} from './dto/starter-grammar.dto.js';

export type StarterGrammarCategory = 'order' | 'particles' | 'verbs';

export interface GeneratedGrammarRulePart {
  labelVi: string;
  labelEn: string;
  sample: string;
}

export interface GeneratedGrammarExample {
  sentence: string;
  reading?: string;
  meaningVi: string;
  meaningEn: string;
}

export interface GeneratedStarterGrammarPoint {
  id: string;
  category: StarterGrammarCategory;
  titleVi: string;
  titleEn: string;
  formula: string;
  explanationVi: string;
  explanationEn: string;
  rules: GeneratedGrammarRulePart[];
  examples: GeneratedGrammarExample[];
  mistake: string;
  correction: string;
  mistakeNoteVi: string;
  mistakeNoteEn: string;
  aiPromptVi: string;
  aiPromptEn: string;
  isAiGenerated: true;
  level: StarterGrammarLevel;
}

export interface GeneratedStarterGrammarQuestion {
  id: string;
  grammarId: string;
  kind: 'choice' | 'scramble';
  promptVi: string;
  promptEn: string;
  stem: string;
  correctOption: string;
  options: string[];
  scrambleWords?: string[];
  completedSentence: string;
  explanationVi: string;
  explanationEn: string;
  isAiGenerated: true;
}

export interface GenerateStarterGrammarResult {
  model: string;
  grammarPoint: GeneratedStarterGrammarPoint;
  exercises: GeneratedStarterGrammarQuestion[];
  usage?: AiTokenUsage;
}

interface RawGrammarRulePart {
  labelVi?: unknown;
  labelEn?: unknown;
  sample?: unknown;
}

interface RawGrammarExample {
  sentence?: unknown;
  reading?: unknown;
  meaningVi?: unknown;
  meaningEn?: unknown;
}

interface RawGrammarExercise {
  kind?: unknown;
  promptVi?: unknown;
  promptEn?: unknown;
  stem?: unknown;
  correctOption?: unknown;
  options?: unknown;
  scrambleWords?: unknown;
  completedSentence?: unknown;
  explanationVi?: unknown;
  explanationEn?: unknown;
}

interface RawStarterGrammarPayload {
  category?: unknown;
  titleVi?: unknown;
  titleEn?: unknown;
  formula?: unknown;
  explanationVi?: unknown;
  explanationEn?: unknown;
  rules?: unknown;
  examples?: unknown;
  mistake?: unknown;
  correction?: unknown;
  mistakeNoteVi?: unknown;
  mistakeNoteEn?: unknown;
  aiPromptVi?: unknown;
  aiPromptEn?: unknown;
  exercises?: unknown;
}

function cleanText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeCategory(raw: unknown): StarterGrammarCategory {
  if (raw === 'order' || raw === 'particles' || raw === 'verbs') {
    return raw;
  }
  return 'verbs';
}

function tokenizeSentence(sentence: string): string[] {
  return sentence
    .trim()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function deterministicScramble(words: string[]): string[] {
  if (words.length <= 1) {
    return [...words];
  }
  // Rotate and swap pairs so scrambled order always differs cleanly from target sentence order
  const rotated = [...words.slice(1), words[0]];
  if (rotated.join(' ') === words.join(' ') && rotated.length >= 2) {
    return [...words].reverse();
  }
  return rotated;
}

@Injectable()
export class AiStarterGrammarService {
  constructor(private readonly aiService: AiService) {}

  async generate(
    dto: GenerateStarterGrammarDto,
  ): Promise<GenerateStarterGrammarResult> {
    const lang = normalizeLearningLanguage(dto.languageCode);
    const level: StarterGrammarLevel = dto.level ?? 'A0';
    const exerciseCount = Math.min(Math.max(dto.exerciseCount ?? 4, 2), 6);
    const topic = dto.topic.trim();
    const explainLang = dto.explanationLanguage ?? 'vi';

    const { model, data, usage } =
      await this.aiService.chatJson<RawStarterGrammarPayload>(
        this.buildMessages(topic, level, lang, explainLang, exerciseCount),
        {
          temperature: 0.35,
          maxTokens: 2048,
          reasoningEffort: 'low',
        },
      );

    const uniqueTag = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const grammarId = `ai-${lang}-g-${uniqueTag}`;

    const grammarPoint = this.normalizeGrammarPoint(
      data,
      grammarId,
      topic,
      level,
      lang,
    );
    const exercises = this.normalizeExercises(
      data.exercises,
      grammarId,
      lang,
      exerciseCount,
      grammarPoint,
    );

    return {
      model,
      grammarPoint,
      exercises,
      ...(usage ? { usage } : {}),
    };
  }

  private buildMessages(
    topic: string,
    level: StarterGrammarLevel,
    lang: LearningLanguageCode,
    explainLang: 'vi' | 'en',
    exerciseCount: number,
  ) {
    const targetName = lang === 'ko' ? 'Korean (Hangul)' : 'English';
    const readingHint =
      lang === 'ko'
        ? 'Romanization reading hint (e.g. "jeo-neun hak-saeng-i-e-yo")'
        : 'IPA or short phonetic hint';
    const scrambleCount = Math.max(1, Math.floor(exerciseCount / 2));
    const choiceCount = Math.max(1, exerciseCount - scrambleCount);

    const systemPrompt =
      `You are an expert ${targetName} grammar curriculum designer for beginners (CEFR ${level}). ` +
      'Return ONE single valid JSON object (no markdown fences, no commentary) matching the exact schema below. ' +
      'Always populate both Vietnamese ("Vi") and English ("En") explanation fields concisely and accurately ' +
      `(prioritize crystal-clear ${explainLang === 'vi' ? 'Vietnamese' : 'English'} phrasing).`;

    const userPrompt =
      `Create 1 structured ${targetName} beginner grammar lesson at level ${level} for topic: "${topic}", ` +
      `plus exactly ${exerciseCount} interactive exercises (${choiceCount} "choice" fill-in/selection and ${scrambleCount} "scramble" sentence-ordering).\n\n` +
      'Required JSON schema:\n' +
      '{\n' +
      '  "category": "order" | "particles" | "verbs",\n' +
      '  "titleVi": "Tiêu đề ngắn tiếng Việt",\n' +
      '  "titleEn": "Short English title",\n' +
      '  "formula": "Compact formula pattern",\n' +
      '  "explanationVi": "2 concise sentences in Vietnamese for beginners",\n' +
      '  "explanationEn": "2 concise sentences in English for beginners",\n' +
      '  "rules": [{"labelVi":"...","labelEn":"...","sample":"..."}],\n' +
      `  "examples": [{"sentence":"Target ${targetName} sentence","reading":"${readingHint}","meaningVi":"Nghĩa tiếng Việt","meaningEn":"English meaning"}],\n` +
      '  "mistake": "Common learner wrong sentence",\n' +
      '  "correction": "Corrected natural sentence",\n' +
      '  "mistakeNoteVi": "Why the correction is right (Vietnamese)",\n' +
      '  "mistakeNoteEn": "Why the correction is right (English)",\n' +
      '  "aiPromptVi": "Short follow-up prompt in Vietnamese",\n' +
      '  "aiPromptEn": "Short follow-up prompt in English",\n' +
      '  "exercises": [\n' +
      '    {\n' +
      '      "kind": "choice",\n' +
      '      "promptVi": "Đề bài tiếng Việt",\n' +
      '      "promptEn": "Prompt in English",\n' +
      '      "stem": "Sentence with ___ blank (must match options)",\n' +
      '      "correctOption": "Exact missing token",\n' +
      '      "options": ["opt1", "opt2", "opt3", "opt4"],\n' +
      '      "completedSentence": "Full target sentence with blank filled",\n' +
      '      "explanationVi": "Lý do đáp án đúng (tiếng Việt)",\n' +
      '      "explanationEn": "Why correct option fits (English)"\n' +
      '    },\n' +
      '    {\n' +
      '      "kind": "scramble",\n' +
      '      "promptVi": "Sắp xếp các mảnh sau thành câu đúng:",\n' +
      '      "promptEn": "Arrange the words into a correct sentence:",\n' +
      '      "stem": "Vietnamese/English meaning clue for the sentence",\n' +
      '      "correctOption": "Exact space-joined target sentence without trailing space",\n' +
      '      "options": [],\n' +
      '      "scrambleWords": ["word1", "word2", "word3", "word4"],\n' +
      '      "completedSentence": "Same exact space-joined target sentence",\n' +
      '      "explanationVi": "Giải thích trật tự từ (tiếng Việt)",\n' +
      '      "explanationEn": "Word-order explanation (English)"\n' +
      '    }\n' +
      '  ]\n' +
      '}';

    return [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];
  }

  private normalizeGrammarPoint(
    raw: RawStarterGrammarPayload,
    id: string,
    topic: string,
    level: StarterGrammarLevel,
    lang: LearningLanguageCode,
  ): GeneratedStarterGrammarPoint {
    const titleVi = cleanText(raw.titleVi, `${topic} (${level})`);
    const titleEn = cleanText(raw.titleEn, `${topic} (${level})`);
    const formula = cleanText(raw.formula, topic);

    const rules = (Array.isArray(raw.rules) ? raw.rules : [])
      .slice(0, 4)
      .map((item) => {
        const r = item as RawGrammarRulePart;
        return {
          labelVi: cleanText(r?.labelVi, cleanText(r?.labelEn, 'Quy tắc')),
          labelEn: cleanText(r?.labelEn, cleanText(r?.labelVi, 'Rule')),
          sample: cleanText(r?.sample),
        };
      })
      .filter((r) => r.sample.length > 0);

    const examples = (Array.isArray(raw.examples) ? raw.examples : [])
      .slice(0, 3)
      .map((item) => {
        const ex = item as RawGrammarExample;
        const sentence = cleanText(ex?.sentence);
        const reading = cleanText(ex?.reading);
        return {
          sentence,
          ...(reading ? { reading } : {}),
          meaningVi: cleanText(ex?.meaningVi, sentence),
          meaningEn: cleanText(ex?.meaningEn, sentence),
        };
      })
      .filter((ex) => ex.sentence.length > 0);

    if (examples.length === 0) {
      throw new BadGatewayException(
        'AI returned an incomplete grammar lesson without examples. Please try again.',
      );
    }

    const fallbackSentence = examples[0].sentence;
    const mistake = cleanText(raw.mistake, '...');
    const correction = cleanText(raw.correction, fallbackSentence);

    return {
      id,
      category: normalizeCategory(raw.category),
      titleVi,
      titleEn,
      formula,
      explanationVi: cleanText(
        raw.explanationVi,
        `Mẫu ngữ pháp ${level} xoay quanh chủ điểm ${topic}.`,
      ),
      explanationEn: cleanText(
        raw.explanationEn,
        `${level} grammar guide covering ${topic}.`,
      ),
      rules:
        rules.length > 0
          ? rules
          : [
              {
                labelVi: 'Mẫu chính',
                labelEn: 'Core pattern',
                sample: formula,
              },
            ],
      examples,
      mistake,
      correction,
      mistakeNoteVi: cleanText(
        raw.mistakeNoteVi,
        `Chú ý dùng đúng cấu trúc "${formula}".`,
      ),
      mistakeNoteEn: cleanText(
        raw.mistakeNoteEn,
        `Follow the pattern "${formula}".`,
      ),
      aiPromptVi: cleanText(
        raw.aiPromptVi,
        `Cho mình thêm 3 ví dụ ${lang === 'ko' ? 'tiếng Hàn' : 'tiếng Anh'} và mẹo dùng "${titleVi}".`,
      ),
      aiPromptEn: cleanText(
        raw.aiPromptEn,
        `Give me 3 extra ${lang === 'ko' ? 'Korean' : 'English'} examples and tips for "${titleEn}".`,
      ),
      isAiGenerated: true,
      level,
    };
  }

  private normalizeExercises(
    rawExercises: unknown,
    grammarId: string,
    lang: LearningLanguageCode,
    targetCount: number,
    point: GeneratedStarterGrammarPoint,
  ): GeneratedStarterGrammarQuestion[] {
    const list = Array.isArray(rawExercises) ? rawExercises : [];
    const normalized: GeneratedStarterGrammarQuestion[] = [];

    list.slice(0, targetCount).forEach((entry, index) => {
      const ex = entry as RawGrammarExercise;
      const qId = `${grammarId}-q${index + 1}`;
      const completedSentence = cleanText(
        ex?.completedSentence,
        point.examples[0].sentence,
      );

      if (ex?.kind === 'scramble') {
        const expected = cleanText(ex?.correctOption, completedSentence);
        const tokens = tokenizeSentence(expected);
        const rawWords = Array.isArray(ex?.scrambleWords)
          ? ex.scrambleWords
              .map((w) => cleanText(w))
              .filter((w) => w.length > 0)
          : [];
        const scrambleWords =
          rawWords.length >= 2 &&
          rawWords.length === tokens.length &&
          rawWords.join(' ') !== tokens.join(' ')
            ? rawWords
            : tokens.length >= 2
              ? deterministicScramble(tokens)
              : [];

        if (scrambleWords.length >= 2) {
          normalized.push({
            id: qId,
            grammarId,
            kind: 'scramble',
            promptVi: cleanText(
              ex?.promptVi,
              'Sắp xếp các từ sau thành câu hoàn chỉnh:',
            ),
            promptEn: cleanText(
              ex?.promptEn,
              'Arrange the words to build the correct sentence:',
            ),
            stem: cleanText(ex?.stem, point.examples[0].meaningVi),
            correctOption: tokens.join(' '),
            options: [],
            scrambleWords,
            completedSentence: tokens.join(' '),
            explanationVi: cleanText(ex?.explanationVi, point.explanationVi),
            explanationEn: cleanText(ex?.explanationEn, point.explanationEn),
            isAiGenerated: true,
          });
          return;
        }
      }

      const correctOption = cleanText(ex?.correctOption);
      const rawOptions = Array.isArray(ex?.options)
        ? ex.options.map((o) => cleanText(o)).filter((o) => o.length > 0)
        : [];
      const optionSet = Array.from(
        new Set([...(correctOption ? [correctOption] : []), ...rawOptions]),
      ).slice(0, 4);

      if (!correctOption || optionSet.length < 2) {
        return;
      }

      // Place options consistently while preserving variety when LLM returns all 4
      const orderedOptions = rawOptions.includes(correctOption)
        ? Array.from(new Set(rawOptions)).slice(0, 4)
        : optionSet;

      normalized.push({
        id: qId,
        grammarId,
        kind: 'choice',
        promptVi: cleanText(
          ex?.promptVi,
          'Chọn đáp án phù hợp điền vào chỗ trống:',
        ),
        promptEn: cleanText(
          ex?.promptEn,
          'Pick the best option for the blank:',
        ),
        stem: cleanText(ex?.stem, completedSentence),
        correctOption,
        options: orderedOptions,
        completedSentence,
        explanationVi: cleanText(ex?.explanationVi, point.explanationVi),
        explanationEn: cleanText(ex?.explanationEn, point.explanationEn),
        isAiGenerated: true,
      });
    });

    if (normalized.length === 0) {
      // Safe deterministic scramble fallback from the first valid generated example
      const tokens = tokenizeSentence(point.examples[0].sentence);
      if (tokens.length >= 2) {
        normalized.push({
          id: `${grammarId}-q1`,
          grammarId,
          kind: 'scramble',
          promptVi: 'Sắp xếp các từ sau thành câu hoàn chỉnh:',
          promptEn: 'Arrange the words into a correct sentence:',
          stem: point.examples[0].meaningVi,
          correctOption: tokens.join(' '),
          options: [],
          scrambleWords: deterministicScramble(tokens),
          completedSentence: tokens.join(' '),
          explanationVi: point.explanationVi,
          explanationEn: point.explanationEn,
          isAiGenerated: true,
        });
      }
    }

    return normalized;
  }
}
