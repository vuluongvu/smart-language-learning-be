import { BadGatewayException, Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import {
  UnitReadingListening,
  UnitReadingQuizQuestion,
  UnitStudyGuide,
  UnitStudyGrammarPoint,
  UnitStudyKeyPattern,
  UnitStudyMistake,
  UnitVocabWord,
  UnitWritingPrompt,
} from './entities/learning-path-unit.entity.js';

export interface AiUnitOutlineItem {
  unitNumber: number;
  title: string;
  topicName: string;
  grammarFocus: string;
  icon: string;
  themeColor: string;
  speakingTopicPrompt: string;
}

export interface AiPathOutline {
  trackTitle: string;
  trackSummary: string;
  cefrLevel: string;
  partTitle: string;
  partSubtitle: string;
  units: AiUnitOutlineItem[];
}

export interface AiUnitStudyPack {
  studyGuide: UnitStudyGuide;
  vocabulary: UnitVocabWord[];
  readingListening: UnitReadingListening;
  writing: UnitWritingPrompt;
}

const ALLOWED_ICONS = [
  'home',
  'clock',
  'sparkles',
  'globe',
  'target',
  'book-open',
  'layers',
  'folder',
  'flame',
  'bar-chart',
] as const;

const ALLOWED_TONES = ['green', 'pink', 'lavender', 'cream'] as const;

const BAND_METADATA: Record<string, { bandLabel: string; targetCefr: string }> =
  {
    band_45_55: { bandLabel: 'Band 4.5–5.5', targetCefr: 'B1' },
    band_55_65: { bandLabel: 'Band 5.5–6.5', targetCefr: 'B2' },
    band_65_75: { bandLabel: 'Band 6.5–7.5+', targetCefr: 'C1' },
  };

@Injectable()
export class LearningPathAiService {
  constructor(private readonly aiService: AiService) {}

  resolveBandMetadata(bandCode: string): {
    bandLabel: string;
    targetCefr: string;
  } {
    return BAND_METADATA[bandCode] ?? BAND_METADATA.band_45_55;
  }

  async generatePathOutline(params: {
    goalTopic: string;
    learningFocus?: string;
    targetBand: string;
    currentLevel: string;
    unitCount: number;
    explanationLang: 'vi' | 'en';
  }): Promise<AiPathOutline> {
    const { bandLabel, targetCefr } = this.resolveBandMetadata(
      params.targetBand,
    );
    const explainLangName =
      params.explanationLang === 'en' ? 'English' : 'Vietnamese';
    const focusBlock = params.learningFocus?.trim()
      ? `\nLearning emphasis requested by learner: ${params.learningFocus.trim()}`
      : '';

    const { data } = await this.aiService.chatJson<Record<string, unknown>>(
      [
        {
          role: 'system',
          content:
            `You design a structured English learning path curriculum purely from the learner's need and goal. Output ONLY valid JSON:\n` +
            `{\n` +
            `  "trackTitle": "short English track title <= 50 chars",\n` +
            `  "trackSummary": "1 concise sentence in ${explainLangName} explaining what the learner masters",\n` +
            `  "partTitle": "concise English part title",\n` +
            `  "partSubtitle": "concise subtitle in ${explainLangName}",\n` +
            `  "units": [\n` +
            `    {\n` +
            `      "title": "short English unit title",\n` +
            `      "topicName": "Notebook topic name (2-4 words in English)",\n` +
            `      "grammarFocus": "key English grammar or functional skill",\n` +
            `      "icon": "one of: home|clock|sparkles|globe|target|book-open|layers|folder|flame|bar-chart",\n` +
            `      "themeColor": "one of: green|pink|lavender|cream",\n` +
            `      "speakingTopicPrompt": "clear 1-sentence speaking roleplay/discussion prompt in English"\n` +
            `    }\n` +
            `  ]\n` +
            `}\n` +
            `Rules: Produce exactly ${params.unitCount} progressively ordered units for a learner moving from CEFR ${params.currentLevel} toward ${bandLabel} (CEFR ${targetCefr}).`,
        },
        {
          role: 'user',
          content: `Learner goal / topic: ${params.goalTopic}${focusBlock}`,
        },
      ],
      { temperature: 0.45, maxTokens: 700 },
    );

    const unitsRaw = Array.isArray(data.units) ? data.units : [];
    const units: AiUnitOutlineItem[] = [];
    for (let i = 0; i < Math.min(params.unitCount, unitsRaw.length); i += 1) {
      const raw = unitsRaw[i];
      if (!raw || typeof raw !== 'object') continue;
      const obj = raw as Record<string, unknown>;
      const title = this.cleanString(obj.title, 120);
      const topicName = this.cleanString(obj.topicName, 90);
      const grammarFocus = this.cleanString(obj.grammarFocus, 220);
      const speakingTopicPrompt = this.cleanString(
        obj.speakingTopicPrompt,
        240,
      );
      if (!title || !grammarFocus) continue;

      const rawIcon = this.cleanString(obj.icon, 32) ?? 'sparkles';
      const rawTone = this.cleanString(obj.themeColor, 24) ?? '';
      const icon = (ALLOWED_ICONS as readonly string[]).includes(rawIcon)
        ? rawIcon
        : ALLOWED_ICONS[i % ALLOWED_ICONS.length];
      const themeColor = (ALLOWED_TONES as readonly string[]).includes(rawTone)
        ? rawTone
        : ALLOWED_TONES[i % ALLOWED_TONES.length];

      units.push({
        unitNumber: i + 1,
        title,
        topicName: topicName ?? title,
        grammarFocus,
        icon,
        themeColor,
        speakingTopicPrompt:
          speakingTopicPrompt ?? `Discuss ideas related to ${title}.`,
      });
    }

    if (units.length === 0) {
      throw new BadGatewayException(
        'AI provider failed to generate a valid learning path outline',
      );
    }

    return {
      trackTitle:
        this.cleanString(data.trackTitle, 72) ?? params.goalTopic.slice(0, 72),
      trackSummary:
        this.cleanString(data.trackSummary, 300) ??
        (params.explanationLang === 'vi'
          ? `Lộ trình AI cá nhân hóa theo mục tiêu "${params.goalTopic}" (${bandLabel}).`
          : `Personalized AI curriculum for "${params.goalTopic}" calibrated to ${bandLabel}.`),
      cefrLevel: targetCefr,
      partTitle: this.cleanString(data.partTitle, 110) ?? 'AI Custom Modules',
      partSubtitle:
        this.cleanString(data.partSubtitle, 220) ??
        (params.explanationLang === 'vi'
          ? 'Chủ đề, tài liệu và thực hành 4 kỹ năng tạo bởi AI'
          : 'AI-tailored study guide and 4-skill practice units'),
      units,
    };
  }

  async generateUnitStudyPack(params: {
    goalTopic: string;
    unit: AiUnitOutlineItem;
    targetBand: string;
    learningFocus?: string;
    avoidTerms?: string[];
    explanationLang: 'vi' | 'en';
  }): Promise<AiUnitStudyPack> {
    const { bandLabel, targetCefr } = this.resolveBandMetadata(
      params.targetBand,
    );
    const explainLangName =
      params.explanationLang === 'en' ? 'English' : 'Vietnamese';
    const defLanguageRule =
      params.explanationLang === 'en'
        ? 'concise clear English definition'
        : 'concise Vietnamese definition';
    const focusBlock = params.learningFocus?.trim()
      ? `\nEmphasis / preference: ${params.learningFocus.trim()}`
      : '';
    const avoidBlock =
      params.avoidTerms && params.avoidTerms.length > 0
        ? `\nAvoid repeating these words already covered in earlier units: ${params.avoidTerms.slice(0, 20).join(', ')}`
        : '';

    const { data } = await this.aiService.chatJson<Record<string, unknown>>(
      [
        {
          role: 'system',
          content:
            `Create complete English study materials + 4-skill exercises for ONE unit calibrated to ${bandLabel} (CEFR ${targetCefr}). Explanation language: ${explainLangName}.\n` +
            `Return ONLY valid JSON with exact shape:\n` +
            `{\n` +
            `  "studyGuide": {\n` +
            `    "overview": "concise Markdown/plain overview in ${explainLangName} (2-3 sentences)",\n` +
            `    "grammarPoints": [{"title":"rule title in ${explainLangName}","explanation":"clear explanation in ${explainLangName}","example":"natural English sentence"}],\n` +
            `    "keyPatterns": [{"pattern":"English sentence template","meaning":"meaning in ${explainLangName}","example":"English example"}],\n` +
            `    "commonMistakes": [{"mistake":"common wrong English sentence","correction":"natural corrected version","tip":"why in ${explainLangName}"}],\n` +
            `    "studyTips": ["short practical tip in ${explainLangName}"]\n` +
            `  },\n` +
            `  "vocabulary": [{"term":"word/phrase","pronunciation":"/IPA/","partOfSpeech":"noun|verb|adjective|adverb|phrase","definition":"${defLanguageRule}","example":"English sentence","notes":"usage note in ${explainLangName}"}],\n` +
            `  "readingListening": {\n` +
            `    "title": "short English passage title",\n` +
            `    "audioScript": "natural 85-120 word English passage/dialogue using all unit vocabulary words",\n` +
            `    "translation": "${explainLangName === 'Vietnamese' ? 'natural Vietnamese translation of audioScript' : 'concise English summary'}",\n` +
            `    "questions": [{"prompt":"English comprehension question","options":["A","B","C","D"],"correctIndex":0,"explanation":"short explanation in ${explainLangName}"}]\n` +
            `  },\n` +
            `  "writing": {\n` +
            `    "prompt": "clear writing task in ${explainLangName} telling learner what to write in English",\n` +
            `    "minSentences": 4,\n` +
            `    "targetTerms": ["term1","term2","term3"],\n` +
            `    "sampleAnswer": "well-written 4-6 sentence English model paragraph at ${bandLabel}"\n` +
            `  }\n` +
            `}\n` +
            `Rules: Provide 2 grammarPoints, 3 keyPatterns, 2 commonMistakes, 2 studyTips, 5 vocabulary items, and 3 MCQs each with exactly 4 options.`,
        },
        {
          role: 'user',
          content:
            `Course goal: ${params.goalTopic}\n` +
            `Unit ${params.unit.unitNumber}: ${params.unit.title}\n` +
            `Topic: ${params.unit.topicName}\n` +
            `Grammar focus: ${params.unit.grammarFocus}` +
            `${avoidBlock}${focusBlock}`,
        },
      ],
      { temperature: 0.45, maxTokens: 1550 },
    );

    return this.sanitizeUnitStudyPack(
      data,
      params.unit,
      bandLabel,
      params.explanationLang,
    );
  }

  async generateStudyGuideOnly(params: {
    unitTitle: string;
    grammarFocus: string;
    targetTerms: string[];
    bandLabel: string;
    cefrLevel: string;
    focusGoal?: string;
    explanationLang: 'vi' | 'en';
  }): Promise<UnitStudyGuide> {
    const explainLangName =
      params.explanationLang === 'en' ? 'English' : 'Vietnamese';
    const focusBlock = params.focusGoal?.trim()
      ? `\nLearner's specific goal / emphasis: ${params.focusGoal.trim()}`
      : '';

    const { data } = await this.aiService.chatJson<Record<string, unknown>>(
      [
        {
          role: 'system',
          content:
            `Create a focused English study guide for Unit "${params.unitTitle}" calibrated to ${params.bandLabel} (CEFR ${params.cefrLevel}). Explanation language: ${explainLangName}.\n` +
            `Return ONLY valid JSON:\n` +
            `{\n` +
            `  "overview": "concise summary in ${explainLangName} (2-3 sentences)",\n` +
            `  "grammarPoints": [{"title":"rule title","explanation":"clear rule in ${explainLangName}","example":"natural English example"}],\n` +
            `  "keyPatterns": [{"pattern":"English sentence frame","meaning":"meaning in ${explainLangName}","example":"English sentence"}],\n` +
            `  "commonMistakes": [{"mistake":"typical learner error","correction":"natural correction","tip":"short tip in ${explainLangName}"}],\n` +
            `  "studyTips": ["actionable study tip in ${explainLangName}"]\n` +
            `}\n` +
            `Rules: Include 2-3 grammarPoints, 3 keyPatterns, 2-3 commonMistakes, and 3 studyTips.`,
        },
        {
          role: 'user',
          content:
            `Grammar focus: ${params.grammarFocus}\n` +
            `Core unit vocabulary: ${params.targetTerms.join(', ')}${focusBlock}`,
        },
      ],
      { temperature: 0.45, maxTokens: 900 },
    );

    const sanitized = this.sanitizeStudyGuide(
      data,
      params.unitTitle,
      params.grammarFocus,
      params.explanationLang,
    );
    if (!sanitized.overview && sanitized.grammarPoints.length === 0) {
      throw new BadGatewayException(
        'AI provider failed to generate a valid study guide',
      );
    }
    return sanitized;
  }

  private sanitizeUnitStudyPack(
    raw: Record<string, unknown>,
    unit: AiUnitOutlineItem,
    bandLabel: string,
    lang: 'vi' | 'en',
  ): AiUnitStudyPack {
    const vocabRaw = Array.isArray(raw.vocabulary) ? raw.vocabulary : [];
    const vocabulary: UnitVocabWord[] = [];
    const seenTerms = new Set<string>();

    for (const item of vocabRaw.slice(0, 8)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const term = this.cleanString(obj.term, 140);
      const definition = this.cleanString(obj.definition, 400);
      if (!term || !definition) continue;
      const norm = term.toLowerCase();
      if (seenTerms.has(norm)) continue;
      seenTerms.add(norm);

      vocabulary.push({
        term,
        pronunciation: this.cleanString(obj.pronunciation, 80) ?? '',
        partOfSpeech:
          this.cleanString(obj.partOfSpeech, 48)?.toLowerCase() ?? 'phrase',
        definition,
        example:
          this.cleanString(obj.example, 400) ??
          `Try using "${term}" in a complete sentence.`,
        notes: this.cleanString(obj.notes, 300) ?? '',
      });
    }

    const rlRaw =
      raw.readingListening && typeof raw.readingListening === 'object'
        ? (raw.readingListening as Record<string, unknown>)
        : {};
    const audioScript = this.cleanString(rlRaw.audioScript, 2500);
    const questionsRaw = Array.isArray(rlRaw.questions) ? rlRaw.questions : [];
    const questions: UnitReadingQuizQuestion[] = [];

    for (let i = 0; i < Math.min(5, questionsRaw.length); i += 1) {
      const q = questionsRaw[i];
      if (!q || typeof q !== 'object') continue;
      const obj = q as Record<string, unknown>;
      const prompt = this.cleanString(obj.prompt, 320);
      const options = Array.isArray(obj.options)
        ? obj.options
            .map((opt) => this.cleanString(opt, 220))
            .filter((opt): opt is string => Boolean(opt))
            .slice(0, 4)
        : [];
      if (!prompt || options.length < 2) continue;
      const rawCorrect = Number(obj.correctIndex);
      const correctIndex = Number.isInteger(rawCorrect)
        ? Math.max(0, Math.min(options.length - 1, rawCorrect))
        : 0;
      questions.push({
        id: `q${i + 1}`,
        prompt,
        options,
        correctIndex,
        explanation:
          this.cleanString(obj.explanation, 400) ?? options[correctIndex],
      });
    }

    if (vocabulary.length < 2 || !audioScript || questions.length === 0) {
      throw new BadGatewayException(
        `AI provider returned incomplete study materials for unit "${unit.title}"`,
      );
    }

    const writingRaw =
      raw.writing && typeof raw.writing === 'object'
        ? (raw.writing as Record<string, unknown>)
        : {};
    const rawTargetTerms = Array.isArray(writingRaw.targetTerms)
      ? writingRaw.targetTerms
          .map((t) => this.cleanString(t, 100))
          .filter((t): t is string => Boolean(t))
          .slice(0, 5)
      : [];
    const targetTerms =
      rawTargetTerms.length > 0
        ? rawTargetTerms
        : vocabulary.slice(0, 4).map((w) => w.term);

    const studyGuideRaw =
      raw.studyGuide && typeof raw.studyGuide === 'object'
        ? (raw.studyGuide as Record<string, unknown>)
        : {};
    const studyGuide = this.sanitizeStudyGuide(
      studyGuideRaw,
      unit.title,
      unit.grammarFocus,
      lang,
    );

    const defaultPrompt =
      lang === 'vi'
        ? `Viết 4–5 câu tiếng Anh về chủ đề "${unit.title}", cố gắng sử dụng các từ mục tiêu và cấu trúc ${unit.grammarFocus}.`
        : `Write 4–5 English sentences about "${unit.title}" using the target vocabulary and ${unit.grammarFocus}.`;

    const rawMinSentences = Number(writingRaw.minSentences);
    const minSentences =
      Number.isInteger(rawMinSentences) &&
      rawMinSentences >= 2 &&
      rawMinSentences <= 10
        ? rawMinSentences
        : 4;

    return {
      studyGuide,
      vocabulary,
      readingListening: {
        title: this.cleanString(rlRaw.title, 140) ?? unit.title,
        audioScript,
        translation: this.cleanString(rlRaw.translation, 2500) ?? '',
        questions,
      },
      writing: {
        prompt: this.cleanString(writingRaw.prompt, 500) ?? defaultPrompt,
        minSentences,
        targetBand: bandLabel,
        targetTerms,
        sampleAnswer:
          this.cleanString(writingRaw.sampleAnswer, 1400) ?? audioScript,
      },
    };
  }

  private sanitizeStudyGuide(
    raw: Record<string, unknown>,
    unitTitle: string,
    grammarFocus: string,
    lang: 'vi' | 'en',
  ): UnitStudyGuide {
    const grammarPoints: UnitStudyGrammarPoint[] = [];
    for (const g of (Array.isArray(raw.grammarPoints)
      ? raw.grammarPoints
      : []
    ).slice(0, 4)) {
      if (!g || typeof g !== 'object') continue;
      const obj = g as Record<string, unknown>;
      const title = this.cleanString(obj.title, 140);
      const explanation = this.cleanString(obj.explanation, 500);
      if (title && explanation) {
        grammarPoints.push({
          title,
          explanation,
          example: this.cleanString(obj.example, 300) ?? '',
        });
      }
    }

    const keyPatterns: UnitStudyKeyPattern[] = [];
    for (const k of (Array.isArray(raw.keyPatterns)
      ? raw.keyPatterns
      : []
    ).slice(0, 4)) {
      if (!k || typeof k !== 'object') continue;
      const obj = k as Record<string, unknown>;
      const pattern = this.cleanString(obj.pattern, 180);
      const meaning = this.cleanString(obj.meaning, 240);
      if (pattern && meaning) {
        keyPatterns.push({
          pattern,
          meaning,
          example: this.cleanString(obj.example, 300) ?? '',
        });
      }
    }

    const commonMistakes: UnitStudyMistake[] = [];
    for (const m of (Array.isArray(raw.commonMistakes)
      ? raw.commonMistakes
      : []
    ).slice(0, 4)) {
      if (!m || typeof m !== 'object') continue;
      const obj = m as Record<string, unknown>;
      const mistake = this.cleanString(obj.mistake, 260);
      const correction = this.cleanString(obj.correction, 260);
      if (mistake && correction) {
        commonMistakes.push({
          mistake,
          correction,
          tip: this.cleanString(obj.tip, 300) ?? '',
        });
      }
    }

    const studyTips = (Array.isArray(raw.studyTips) ? raw.studyTips : [])
      .map((tip) => this.cleanString(tip, 280))
      .filter((tip): tip is string => Boolean(tip))
      .slice(0, 4);

    const fallbackOverview =
      lang === 'vi'
        ? `Tài liệu tóm tắt trọng tâm bài "${unitTitle}" xoay quanh điểm ngữ pháp ${grammarFocus}.`
        : `Focused study notes for "${unitTitle}" centering on ${grammarFocus}.`;

    return {
      overview: this.cleanString(raw.overview, 800) ?? fallbackOverview,
      grammarPoints,
      keyPatterns,
      commonMistakes,
      studyTips,
    };
  }

  private cleanString(value: unknown, maxLen: number): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') {
      return null;
    }
    return trimmed.slice(0, maxLen);
  }
}
