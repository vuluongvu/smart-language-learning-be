import { BadGatewayException, Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import {
  getLearningLanguageDisplayName,
  type LearningLanguageCode,
  normalizeLearningLanguage,
} from '../common/constants/learning-languages.js';
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
    topik_1_2: { bandLabel: 'TOPIK I (1–2급)', targetCefr: 'A2' },
    topik_3_4: { bandLabel: 'TOPIK II (3–4급)', targetCefr: 'B1' },
    topik_5_6: { bandLabel: 'TOPIK II (5–6급)', targetCefr: 'C1' },
  };

@Injectable()
export class LearningPathAiService {
  constructor(private readonly aiService: AiService) {}

  resolveBandMetadata(
    bandCode: string,
    languageCode: LearningLanguageCode = 'en',
  ): {
    bandLabel: string;
    targetCefr: string;
  } {
    if (BAND_METADATA[bandCode]) {
      return BAND_METADATA[bandCode];
    }
    return languageCode === 'ko'
      ? BAND_METADATA.topik_1_2
      : BAND_METADATA.band_45_55;
  }

  async generatePathOutline(params: {
    goalTopic: string;
    learningFocus?: string;
    targetBand: string;
    currentLevel: string;
    unitCount: number;
    explanationLang: 'vi' | 'en';
    languageCode?: LearningLanguageCode;
  }): Promise<AiPathOutline> {
    const targetLang = normalizeLearningLanguage(params.languageCode);
    const targetLangName = getLearningLanguageDisplayName(targetLang);
    const { bandLabel, targetCefr } = this.resolveBandMetadata(
      params.targetBand,
      targetLang,
    );
    const explainLangName =
      params.explanationLang === 'en' ? 'English' : 'Vietnamese';
    const focusBlock = params.learningFocus?.trim()
      ? `\nLearning emphasis requested by learner: ${params.learningFocus.trim()}`
      : '';
    const koreanNote =
      targetLang === 'ko'
        ? ` Write unit/track titles naturally for Korean learners (can pair Korean Hangul with short ${explainLangName} subtitle) and include Korean grammar points like particles or verb endings.`
        : '';

    const { data } = await this.aiService.chatJson<Record<string, unknown>>(
      [
        {
          role: 'system',
          content:
            `You design a structured ${targetLangName} learning path curriculum purely from the learner's need and goal. Output ONLY valid JSON:\n` +
            `{\n` +
            `  "trackTitle": "short ${targetLangName} track title <= 50 chars",\n` +
            `  "trackSummary": "1 concise sentence in ${explainLangName} explaining what the learner masters",\n` +
            `  "partTitle": "concise part title",\n` +
            `  "partSubtitle": "concise subtitle in ${explainLangName}",\n` +
            `  "units": [\n` +
            `    {\n` +
            `      "title": "short unit title",\n` +
            `      "topicName": "Notebook topic name (2-4 words)",\n` +
            `      "grammarFocus": "key ${targetLangName} grammar or functional skill",\n` +
            `      "icon": "one of: home|clock|sparkles|globe|target|book-open|layers|folder|flame|bar-chart",\n` +
            `      "themeColor": "one of: green|pink|lavender|cream",\n` +
            `      "speakingTopicPrompt": "clear 1-sentence speaking roleplay/discussion prompt in ${explainLangName} or ${targetLangName}"\n` +
            `    }\n` +
            `  ]\n` +
            `}\n` +
            `Rules: Produce exactly ${params.unitCount} progressively ordered units for a learner moving from CEFR ${params.currentLevel} toward ${bandLabel} (CEFR ${targetCefr}).${koreanNote}`,
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
    languageCode?: LearningLanguageCode;
  }): Promise<AiUnitStudyPack> {
    const targetLang = normalizeLearningLanguage(params.languageCode);
    const targetLangName = getLearningLanguageDisplayName(targetLang);
    const { bandLabel, targetCefr } = this.resolveBandMetadata(
      params.targetBand,
      targetLang,
    );
    const explainLangName =
      params.explanationLang === 'en' ? 'English' : 'Vietnamese';
    const defLanguageRule =
      params.explanationLang === 'en'
        ? 'concise clear English definition'
        : 'concise Vietnamese definition';
    const pronRule =
      targetLang === 'ko' ? '[Korean reading / Romanization]' : '/IPA/';
    const posRule =
      targetLang === 'ko'
        ? 'noun|verb|adjective|adverb|phrase|particle|ending'
        : 'noun|verb|adjective|adverb|phrase';
    const focusBlock = params.learningFocus?.trim()
      ? `\nEmphasis / preference: ${params.learningFocus.trim()}`
      : '';
    const avoidBlock =
      params.avoidTerms && params.avoidTerms.length > 0
        ? `\nAvoid repeating these words already covered in earlier units: ${params.avoidTerms.slice(0, 20).join(', ')}`
        : '';

    const messages = [
      {
        role: 'system' as const,
        content:
          `Create complete ${targetLangName} study materials + 4-skill exercises for ONE unit calibrated to ${bandLabel} (CEFR ${targetCefr}). Explanation language: ${explainLangName}.\n` +
          `Return ONLY valid JSON with exact shape:\n` +
          `{\n` +
          `  "studyGuide": {\n` +
          `    "overview": "concise Markdown/plain overview in ${explainLangName} (2-3 sentences)",\n` +
          `    "grammarPoints": [{"title":"rule title in ${explainLangName}","explanation":"clear explanation in ${explainLangName}","example":"natural ${targetLangName} sentence"}],\n` +
          `    "keyPatterns": [{"pattern":"${targetLangName} sentence template","meaning":"meaning in ${explainLangName}","example":"${targetLangName} example"}],\n` +
          `    "commonMistakes": [{"mistake":"common wrong ${targetLangName} sentence","correction":"natural corrected version","tip":"why in ${explainLangName}"}],\n` +
          `    "studyTips": ["short practical tip in ${explainLangName}"]\n` +
          `  },\n` +
          `  "vocabulary": [{"term":"word/phrase in ${targetLangName}","pronunciation":"${pronRule}","partOfSpeech":"${posRule}","definition":"${defLanguageRule}","example":"natural ${targetLangName} sentence","notes":"usage note in ${explainLangName}"}],\n` +
          `  "readingListening": {\n` +
          `    "title": "short ${targetLangName} passage title",\n` +
          `    "audioScript": "natural 80-110 ${targetLang === 'ko' ? 'syllable/word Korean Hangul' : 'word English'} passage/dialogue using the unit vocabulary words",\n` +
          `    "translation": "${explainLangName === 'Vietnamese' ? 'natural Vietnamese translation of audioScript' : 'concise English translation/summary'}",\n` +
          `    "questions": [{"prompt":"comprehension question in ${explainLangName}","options":["A","B","C","D"],"correctIndex":0,"explanation":"short explanation in ${explainLangName}"}]\n` +
          `  },\n` +
          `  "writing": {\n` +
          `    "prompt": "clear writing task in ${explainLangName} telling learner what to write in ${targetLangName}",\n` +
          `    "minSentences": 4,\n` +
          `    "targetTerms": ["term1","term2","term3"],\n` +
          `    "sampleAnswer": "well-written 4-5 sentence ${targetLangName} model paragraph at ${bandLabel}"\n` +
          `  }\n` +
          `}\n` +
          `Rules: Provide 2 grammarPoints, 3 keyPatterns, 2 commonMistakes, 2 studyTips, 5 vocabulary items, and 3 MCQs each with 4 concise options.${targetLang === 'ko' ? ' All Korean terms, examples, audioScript, and sampleAnswer MUST be written in Korean Hangul.' : ''}`,
      },
      {
        role: 'user' as const,
        content:
          `Course goal: ${params.goalTopic}\n` +
          `Unit ${params.unit.unitNumber}: ${params.unit.title}\n` +
          `Topic: ${params.unit.topicName}\n` +
          `Grammar focus: ${params.unit.grammarFocus}` +
          `${avoidBlock}${focusBlock}`,
      },
    ];

    let data: Record<string, unknown> = {};
    try {
      const response = await this.aiService.chatJson<Record<string, unknown>>(
        messages,
        { temperature: 0.4, maxTokens: 2600 },
      );
      data = response.data;
    } catch {
      const retryResponse = await this.aiService.chatJson<
        Record<string, unknown>
      >(messages, { temperature: 0.35, maxTokens: 2800 });
      data = retryResponse.data;
    }

    return this.sanitizeUnitStudyPack(
      data,
      params.unit,
      bandLabel,
      params.explanationLang,
      targetLang,
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
    languageCode?: LearningLanguageCode;
  }): Promise<UnitStudyGuide> {
    const targetLang = normalizeLearningLanguage(params.languageCode);
    const targetLangName = getLearningLanguageDisplayName(targetLang);
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
            `Create a focused ${targetLangName} study guide for Unit "${params.unitTitle}" calibrated to ${params.bandLabel} (CEFR ${params.cefrLevel}). Explanation language: ${explainLangName}.\n` +
            `Return ONLY valid JSON:\n` +
            `{\n` +
            `  "overview": "concise summary in ${explainLangName} (2-3 sentences)",\n` +
            `  "grammarPoints": [{"title":"rule title","explanation":"clear rule in ${explainLangName}","example":"natural ${targetLangName} example"}],\n` +
            `  "keyPatterns": [{"pattern":"${targetLangName} sentence frame","meaning":"meaning in ${explainLangName}","example":"${targetLangName} sentence"}],\n` +
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
      targetLang,
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
    targetLang: LearningLanguageCode = 'en',
  ): AiUnitStudyPack {
    const vocabSource =
      raw.vocabulary ?? raw.words ?? raw.vocab ?? raw.terms ?? [];
    const vocabRaw = Array.isArray(vocabSource) ? vocabSource : [];
    const vocabulary: UnitVocabWord[] = [];
    const seenTerms = new Set<string>();

    for (const item of vocabRaw.slice(0, 8)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const term = this.cleanString(obj.term ?? obj.word ?? obj.phrase, 140);
      const definition = this.cleanString(
        obj.definition ?? obj.meaning ?? obj.translation,
        400,
      );
      if (!term || !definition) continue;
      const norm = term.toLowerCase();
      if (seenTerms.has(norm)) continue;
      seenTerms.add(norm);

      vocabulary.push({
        term,
        pronunciation: this.cleanString(obj.pronunciation ?? obj.ipa, 80) ?? '',
        partOfSpeech:
          this.cleanString(
            obj.partOfSpeech ?? obj.pos ?? obj.type,
            48,
          )?.toLowerCase() ?? 'phrase',
        definition,
        example:
          this.cleanString(obj.example ?? obj.sentence, 400) ??
          (targetLang === 'ko'
            ? `"${term}" 표현을 일상 대화에서 자연스럽게 사용해 보세요.`
            : `In discussions on ${unit.topicName}, "${term}" helps express a precise point.`),
        notes: this.cleanString(obj.notes ?? obj.note ?? obj.tip, 300) ?? '',
      });
    }

    if (vocabulary.length < 4) {
      const fallbackEntries = this.buildFallbackUnitVocabulary(
        unit,
        lang,
        targetLang,
      );
      for (const entry of fallbackEntries) {
        if (vocabulary.length >= 4) break;
        const norm = entry.term.toLowerCase();
        if (seenTerms.has(norm)) continue;
        seenTerms.add(norm);
        vocabulary.push(entry);
      }
    }

    const rlCandidate =
      raw.readingListening ??
      raw.reading_listening ??
      raw.reading ??
      raw.passage;
    const rlRaw =
      rlCandidate && typeof rlCandidate === 'object'
        ? (rlCandidate as Record<string, unknown>)
        : {};

    const audioScript =
      this.cleanString(
        rlRaw.audioScript ??
          rlRaw.audio_script ??
          rlRaw.script ??
          rlRaw.passage ??
          rlRaw.text ??
          raw.audioScript ??
          raw.passage,
        2500,
      ) ?? this.buildFallbackAudioScript(unit, vocabulary, targetLang);

    const questionsCandidate =
      rlRaw.questions ?? rlRaw.quiz ?? raw.questions ?? raw.quiz ?? [];
    const questionsRaw = Array.isArray(questionsCandidate)
      ? questionsCandidate
      : [];
    const questions: UnitReadingQuizQuestion[] = [];

    for (let i = 0; i < Math.min(5, questionsRaw.length); i += 1) {
      const q = questionsRaw[i];
      if (!q || typeof q !== 'object') continue;
      const obj = q as Record<string, unknown>;
      const prompt = this.cleanString(
        obj.prompt ?? obj.question ?? obj.text,
        320,
      );
      const rawOptions = obj.options ?? obj.choices ?? obj.answers;
      const options = Array.isArray(rawOptions)
        ? rawOptions
            .map((opt) => this.cleanString(opt, 220))
            .filter((opt): opt is string => Boolean(opt))
            .slice(0, 4)
        : [];
      if (!prompt || options.length < 2) continue;
      const rawCorrect = Number(
        obj.correctIndex ?? obj.answerIndex ?? obj.correct,
      );
      const correctIndex = Number.isInteger(rawCorrect)
        ? Math.max(0, Math.min(options.length - 1, rawCorrect))
        : 0;
      questions.push({
        id: `q${questions.length + 1}`,
        prompt,
        options,
        correctIndex,
        explanation:
          this.cleanString(obj.explanation, 400) ?? options[correctIndex],
      });
    }

    if (questions.length < 2) {
      const fallbackQuestions = this.buildFallbackReadingQuestions(
        unit,
        vocabulary,
        lang,
      );
      for (const fq of fallbackQuestions) {
        if (questions.length >= 3) break;
        questions.push({
          ...fq,
          id: `q${questions.length + 1}`,
        });
      }
    }

    const writingCandidate = raw.writing ?? raw.writingTask ?? raw.writing_task;
    const writingRaw =
      writingCandidate && typeof writingCandidate === 'object'
        ? (writingCandidate as Record<string, unknown>)
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

    const studyGuideCandidate =
      raw.studyGuide ?? raw.study_guide ?? raw.guide ?? raw;
    const studyGuideRaw =
      studyGuideCandidate && typeof studyGuideCandidate === 'object'
        ? (studyGuideCandidate as Record<string, unknown>)
        : {};
    const studyGuide = this.sanitizeStudyGuide(
      studyGuideRaw,
      unit.title,
      unit.grammarFocus,
      lang,
      targetLang,
    );

    const targetLangVi = targetLang === 'ko' ? 'tiếng Hàn' : 'tiếng Anh';
    const targetLangEn = targetLang === 'ko' ? 'Korean' : 'English';
    const defaultPrompt =
      lang === 'vi'
        ? `Viết 4–5 câu ${targetLangVi} về chủ đề "${unit.title}", cố gắng sử dụng các từ mục tiêu và cấu trúc ${unit.grammarFocus}.`
        : `Write 4–5 ${targetLangEn} sentences about "${unit.title}" using the target vocabulary and ${unit.grammarFocus}.`;

    const rawMinSentences = Number(writingRaw.minSentences);
    const minSentences =
      Number.isInteger(rawMinSentences) &&
      rawMinSentences >= 2 &&
      rawMinSentences <= 10
        ? rawMinSentences
        : 4;

    const translationText =
      this.cleanString(
        rlRaw.translation ??
          rlRaw.vietnameseTranslation ??
          rlRaw.vietnamese ??
          rlRaw.summary ??
          raw.translation,
        2500,
      ) ?? '';

    return {
      studyGuide,
      vocabulary,
      readingListening: {
        title: this.cleanString(rlRaw.title, 140) ?? unit.title,
        audioScript,
        translation: translationText,
        questions,
      },
      writing: {
        prompt: this.cleanString(writingRaw.prompt, 500) ?? defaultPrompt,
        minSentences,
        targetBand: bandLabel,
        targetTerms,
        sampleAnswer:
          this.cleanString(
            writingRaw.sampleAnswer ?? writingRaw.sample_answer,
            1400,
          ) ?? audioScript,
      },
    };
  }

  private buildFallbackUnitVocabulary(
    unit: AiUnitOutlineItem,
    lang: 'vi' | 'en',
    targetLang: LearningLanguageCode = 'en',
  ): UnitVocabWord[] {
    const isVi = lang === 'vi';
    if (targetLang === 'ko') {
      return [
        {
          term: '표현하다',
          pronunciation: '[표현하다 / pyohyeonhada]',
          partOfSpeech: 'verb',
          definition: isVi
            ? 'Diễn đạt, thể hiện suy nghĩ hoặc cảm xúc'
            : 'To express ideas or feelings clearly',
          example: '자기 생각을 한국어로 자연스럽게 표현해 보세요.',
          notes: isVi ? 'Chia lịch sự: 표현해요.' : 'Polite form: 표현해요.',
        },
        {
          term: '상황',
          pronunciation: '[상황 / sanghwang]',
          partOfSpeech: 'noun',
          definition: isVi ? 'Tình huống, hoàn cảnh' : 'Situation or context',
          example: '상황에 맞는 높임말을 사용하는 것이 중요해요.',
          notes: isVi
            ? 'Cụm hay gặp: 상황에 따라 (tùy theo tình huống).'
            : 'Common phrase: 상황에 따라.',
        },
        {
          term: '경험',
          pronunciation: '[경험 / gyeongheom]',
          partOfSpeech: 'noun',
          definition: isVi ? 'Trải nghiệm, kinh nghiệm' : 'Personal experience',
          example: '한국에서 생활해 본 경험이 정말 도움이 되었어요.',
          notes: isVi
            ? 'Đi kèm động từ 하다 hoặc -(으)ㄴ 적이 있다.'
            : 'Often used with -(으)ㄴ 적이 있다.',
        },
        {
          term: '자연스럽다',
          pronunciation: '[자연스럽따 / jayeonseureopda]',
          partOfSpeech: 'adjective',
          definition: isVi
            ? 'Tự nhiên, trôi chảy'
            : 'Natural and fluent in expression',
          example: '자주 연습하면 발음이 훨씬 자연스러워져요.',
          notes: isVi
            ? 'Bất quy tắc ㅂ -> 자연스러워요.'
            : 'ㅂ-irregular: 자연스러워요.',
        },
      ];
    }
    return [
      {
        term: 'perspective',
        pronunciation: '/pərˈspektɪv/',
        partOfSpeech: 'noun',
        definition: isVi
          ? 'Góc nhìn, quan điểm cá nhân về một vấn đề'
          : 'A particular attitude toward or way of regarding something',
        example: `Exploring ${unit.topicName} from a new perspective strengthens your argument.`,
        notes: isVi
          ? 'Thường đi với "from my perspective" hoặc "a balanced perspective".'
          : 'Often used in "from my perspective" or "a balanced perspective".',
      },
      {
        term: 'articulate',
        pronunciation: '/ɑːrˈtɪkjuleɪt/',
        partOfSpeech: 'verb',
        definition: isVi
          ? 'Diễn đạt ý tưởng rõ ràng, mạch lạc'
          : 'To express an idea or feeling fluently and coherently',
        example: `Learners practice how to articulate ideas in "${unit.title}" using ${unit.grammarFocus}.`,
        notes: isVi
          ? 'Rất hữu ích trong Speaking và Writing học thuật.'
          : 'Useful in both academic speaking and writing contexts.',
      },
      {
        term: 'nuanced',
        pronunciation: '/ˈnuːɑːnst/',
        partOfSpeech: 'adjective',
        definition: isVi
          ? 'Tinh tế, có chiều sâu và phân biệt rõ các sắc thái'
          : 'Characterized by subtle shades of meaning or expression',
        example: `A nuanced discussion of ${unit.topicName} avoids oversimplified claims.`,
        notes: isVi
          ? 'Dùng để nâng cấp câu trả lời khi nêu ý kiến phức tạp.'
          : 'Ideal for expressing balanced, high-band opinions.',
      },
      {
        term: 'substantiate',
        pronunciation: '/səbˈstænʃieɪt/',
        partOfSpeech: 'verb',
        definition: isVi
          ? 'Chứng minh, đưa ra dẫn chứng cụ thể cho luận điểm'
          : 'To provide evidence to support or prove the truth of a claim',
        example: `Always substantiate your main point with a clear real-world example.`,
        notes: isVi
          ? 'Đi kèm với "substantiate a claim / argument".'
          : 'Commonly paired with "substantiate a claim or argument".',
      },
    ];
  }

  private buildFallbackAudioScript(
    unit: AiUnitOutlineItem,
    vocabulary: UnitVocabWord[],
    targetLang: LearningLanguageCode = 'en',
  ): string {
    if (targetLang === 'ko') {
      const terms = vocabulary.slice(0, 4).map((v) => v.term);
      return (
        `이번 단원에서는 "${unit.title}" 주제로 한국어 표현을 연습합니다. ` +
        `${terms.join(', ')} 같은 핵심 어휘와 ${unit.grammarFocus} 문법을 함께 사용하면 다양한 상황에서 자신의 생각을 자연스럽게 표현할 수 있습니다. ` +
        `짧은 문장부터 소리 내어 읽고 반복해 보세요.`
      );
    }
    const terms = vocabulary.slice(0, 4).map((v) => v.term);
    const t0 = terms[0] ?? 'perspective';
    const t1 = terms[1] ?? 'articulate';
    const t2 = terms[2] ?? 'nuanced';
    const t3 = terms[3] ?? 'substantiate';
    return (
      `In this unit on ${unit.title}, we explore how to discuss ${unit.topicName} with clarity and confidence. ` +
      `When speakers share their ${t0}, they can use ${unit.grammarFocus} to ${t1} complex ideas naturally. ` +
      `Rather than making one-sided statements, strong communicators build a ${t2} view and ${t3} each point with practical examples. ` +
      `Consistent practice with these patterns makes everyday and academic conversations much more persuasive.`
    );
  }

  private buildFallbackReadingQuestions(
    unit: AiUnitOutlineItem,
    vocabulary: UnitVocabWord[],
    lang: 'vi' | 'en',
  ): UnitReadingQuizQuestion[] {
    const firstWord = vocabulary[0] ?? {
      term: 'perspective',
      definition:
        lang === 'vi'
          ? 'Góc nhìn, quan điểm cá nhân về một vấn đề'
          : 'A particular way of regarding a topic',
    };
    const secondWord = vocabulary[1] ?? {
      term: 'articulate',
      definition:
        lang === 'vi'
          ? 'Diễn đạt ý tưởng rõ ràng, mạch lạc'
          : 'To express ideas clearly and effectively',
    };

    return [
      {
        id: 'q1',
        prompt: `What is the primary focus of the passage in "${unit.title}"?`,
        options: [
          `Communicating effectively about ${unit.topicName} using ${unit.grammarFocus}`,
          'Memorizing isolated word lists without context',
          'Avoiding examples when presenting an opinion',
          'Replacing all grammar rules with informal slang',
        ],
        correctIndex: 0,
        explanation:
          lang === 'vi'
            ? `Bài đọc tập trung vào cách vận dụng ${unit.grammarFocus} trong chủ đề ${unit.topicName}.`
            : `The passage focuses on applying ${unit.grammarFocus} to ${unit.topicName}.`,
      },
      {
        id: 'q2',
        prompt: `Which meaning best matches the key term "${firstWord.term}" in this unit?`,
        options: [
          firstWord.definition,
          secondWord.definition,
          lang === 'vi'
            ? 'Một lỗi ngữ pháp cần tránh trong văn viết'
            : 'A grammatical error to avoid in formal writing',
          lang === 'vi'
            ? 'Cách kết thúc cuộc hội thoại đột ngột'
            : 'An abrupt way to end a conversation',
        ],
        correctIndex: 0,
        explanation: `"${firstWord.term}": ${firstWord.definition}`,
      },
    ];
  }

  private sanitizeStudyGuide(
    raw: Record<string, unknown>,
    unitTitle: string,
    grammarFocus: string,
    lang: 'vi' | 'en',
    targetLang: LearningLanguageCode = 'en',
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

    if (grammarPoints.length === 0) {
      grammarPoints.push({
        title: grammarFocus,
        explanation:
          lang === 'vi'
            ? `Áp dụng ${grammarFocus} để diễn đạt ý chính rõ ràng và chính xác trong bài "${unitTitle}".`
            : `Apply ${grammarFocus} to express key ideas clearly and accurately in "${unitTitle}".`,
        example:
          targetLang === 'ko'
            ? `${grammarFocus} 문법을 활용하여 "${unitTitle}" 주제의 문장을 자연스럽게 만들어 보세요.`
            : `When discussing ${unitTitle.toLowerCase()}, structure each sentence around ${grammarFocus.toLowerCase()}.`,
      });
    }

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
