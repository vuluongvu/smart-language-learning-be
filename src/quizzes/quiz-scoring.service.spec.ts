import { BadRequestException } from '@nestjs/common';
import { QuestionOption } from './entities/question-option.entity.js';
import { QuestionType } from './entities/quiz.enums.js';
import { QuizQuestion } from './entities/quiz-question.entity.js';
import { QuizScoringService } from './quiz-scoring.service.js';

describe('QuizScoringService', () => {
  let service: QuizScoringService;

  beforeEach(() => {
    service = new QuizScoringService();
  });

  function makeQuestion(
    id: number,
    questionType: QuestionType,
    questionText: string,
    explanation: string | null = null,
    vocabularyId: number | null = null,
    vocabularyTerm: string | null = null,
  ): QuizQuestion {
    return {
      id,
      quizId: 1,
      vocabularyId,
      vocabularyTerm,
      questionText,
      questionType,
      explanation,
      orderIndex: id - 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as QuizQuestion;
  }

  function makeOption(
    id: number,
    questionId: number,
    optionText: string,
    isCorrect: boolean,
  ): QuestionOption {
    return {
      id,
      questionId,
      optionText,
      isCorrect,
      orderIndex: 0,
    } as QuestionOption;
  }

  it('normalizes whitespace and case for fill-in-the-blank answers', () => {
    expect(service.normalizeBlankAnswer('  Take   Care  OF  ')).toBe(
      'take care of',
    );
  });

  it('grades multiple_choice, word_meaning, and fill_blank accurately and computes score percentage', () => {
    const q1 = makeQuestion(
      1,
      QuestionType.MULTIPLE_CHOICE,
      'Which word means able to recover quickly?',
      'Resilient describes quick recovery.',
      10,
      'resilient',
    );
    const q2 = makeQuestion(
      2,
      QuestionType.FILL_BLANK,
      'She made a _____ effort.',
      'Common collocation.',
    );
    const q3 = makeQuestion(
      3,
      QuestionType.WORD_MEANING,
      'What does "concise" mean?',
    );

    const optionsByQuestion = new Map<number, QuestionOption[]>([
      [
        1,
        [
          makeOption(101, 1, 'fragile', false),
          makeOption(102, 1, 'resilient', true),
        ],
      ],
      [
        2,
        [
          makeOption(201, 2, 'concerted effort', true),
          makeOption(202, 2, 'joint', true),
        ],
      ],
      [
        3,
        [
          makeOption(301, 3, 'brief and clear', true),
          makeOption(302, 3, 'confusing', false),
        ],
      ],
    ]);

    const result = service.gradeAttempt([q1, q2, q3], optionsByQuestion, [
      { questionId: 1, selectedOptionId: 102 },
      { questionId: 2, answerText: '  CONCERTED   effort ' },
      { questionId: 3, selectedOptionId: 302 },
    ]);

    expect(result.correctCount).toBe(2);
    expect(result.totalQuestions).toBe(3);
    expect(result.score).toBe(66.67);

    expect(result.answers[0]).toMatchObject({
      questionId: 1,
      isCorrect: true,
      answerText: 'resilient',
      correctAnswerSnapshot: 'resilient',
      vocabularyIdSnapshot: 10,
      vocabularyTermSnapshot: 'resilient',
    });
    expect(result.answers[1]).toMatchObject({
      questionId: 2,
      isCorrect: true,
      answerText: 'CONCERTED   effort',
      correctAnswerSnapshot: 'concerted effort / joint',
    });
    expect(result.answers[2]).toMatchObject({
      questionId: 3,
      isCorrect: false,
      answerText: 'confusing',
      correctAnswerSnapshot: 'brief and clear',
    });
  });

  it('marks omitted questions as incorrect and rejects foreign option IDs or invalid question IDs', () => {
    const q1 = makeQuestion(1, QuestionType.MULTIPLE_CHOICE, 'Q1');
    const optionsByQuestion = new Map<number, QuestionOption[]>([
      [1, [makeOption(10, 1, 'Yes', true), makeOption(11, 1, 'No', false)]],
    ]);

    const unanswered = service.gradeAttempt([q1], optionsByQuestion, []);
    expect(unanswered.correctCount).toBe(0);
    expect(unanswered.score).toBe(0);
    expect(unanswered.answers[0].isCorrect).toBe(false);

    expect(() =>
      service.gradeAttempt([q1], optionsByQuestion, [
        { questionId: 1, selectedOptionId: 999 },
      ]),
    ).toThrow(BadRequestException);

    expect(() =>
      service.gradeAttempt([q1], optionsByQuestion, [
        { questionId: 42, selectedOptionId: 10 },
      ]),
    ).toThrow(BadRequestException);
  });
});
