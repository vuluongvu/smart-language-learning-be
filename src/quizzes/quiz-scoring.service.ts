import { BadRequestException, Injectable } from '@nestjs/common';
import { QuestionOption } from './entities/question-option.entity.js';
import { QuestionType } from './entities/quiz.enums.js';
import { QuizQuestion } from './entities/quiz-question.entity.js';

export interface AnswerSubmissionInput {
  questionId: number;
  selectedOptionId?: number | null;
  answerText?: string | null;
}

export interface GradedQuestionResult {
  questionId: number;
  selectedOptionId: number | null;
  answerText: string | null;
  questionTextSnapshot: string;
  questionTypeSnapshot: QuestionType;
  correctAnswerSnapshot: string;
  explanationSnapshot: string | null;
  vocabularyIdSnapshot: number | null;
  vocabularyTermSnapshot: string | null;
  isCorrect: boolean;
}

export interface GradedAttemptResult {
  correctCount: number;
  totalQuestions: number;
  score: number;
  answers: GradedQuestionResult[];
}

@Injectable()
export class QuizScoringService {
  normalizeBlankAnswer(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  gradeAttempt(
    questions: QuizQuestion[],
    optionsByQuestionId: Map<number, QuestionOption[]>,
    submissions: AnswerSubmissionInput[],
  ): GradedAttemptResult {
    const questionIds = new Set(questions.map((q) => q.id));
    const submissionByQuestion = new Map<number, AnswerSubmissionInput>();

    for (const sub of submissions) {
      if (!questionIds.has(sub.questionId)) {
        throw new BadRequestException(
          `Question #${sub.questionId} does not belong to this quiz`,
        );
      }
      if (submissionByQuestion.has(sub.questionId)) {
        throw new BadRequestException(
          `Duplicate answer submitted for question #${sub.questionId}`,
        );
      }
      submissionByQuestion.set(sub.questionId, sub);
    }

    const gradedAnswers: GradedQuestionResult[] = [];
    let correctCount = 0;

    for (const question of questions) {
      const options = optionsByQuestionId.get(question.id) ?? [];
      const input = submissionByQuestion.get(question.id);
      const graded = this.gradeQuestion(question, options, input);
      if (graded.isCorrect) {
        correctCount += 1;
      }
      gradedAnswers.push(graded);
    }

    const totalQuestions = questions.length;
    const score =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 10_000) / 100
        : 0;

    return {
      correctCount,
      totalQuestions,
      score,
      answers: gradedAnswers,
    };
  }

  gradeQuestion(
    question: QuizQuestion,
    options: QuestionOption[],
    input?: { selectedOptionId?: number | null; answerText?: string | null },
  ): GradedQuestionResult {
    if (question.questionType === QuestionType.FILL_BLANK) {
      const acceptedOptions = options.filter((opt) => opt.isCorrect);
      const correctAnswerSnapshot = acceptedOptions
        .map((opt) => opt.optionText)
        .join(' / ');

      const rawText = input?.answerText?.trim() ?? '';
      const answerText = rawText.length > 0 ? rawText : null;
      const normalizedUser = answerText
        ? this.normalizeBlankAnswer(answerText)
        : '';

      const isCorrect =
        normalizedUser.length > 0 &&
        acceptedOptions.some(
          (opt) => this.normalizeBlankAnswer(opt.optionText) === normalizedUser,
        );

      return {
        questionId: question.id,
        selectedOptionId: null,
        answerText,
        questionTextSnapshot: question.questionText,
        questionTypeSnapshot: question.questionType,
        correctAnswerSnapshot,
        explanationSnapshot: question.explanation,
        vocabularyIdSnapshot: question.vocabularyId,
        vocabularyTermSnapshot: question.vocabularyTerm,
        isCorrect,
      };
    }

    const correctOption = options.find((opt) => opt.isCorrect);
    const correctAnswerSnapshot = correctOption?.optionText ?? '';

    const selectedOptionId = input?.selectedOptionId ?? null;
    if (selectedOptionId !== null) {
      const matched = options.find((opt) => opt.id === selectedOptionId);
      if (!matched) {
        throw new BadRequestException(
          `Option #${selectedOptionId} does not belong to question #${question.id}`,
        );
      }

      return {
        questionId: question.id,
        selectedOptionId: matched.id,
        answerText: matched.optionText,
        questionTextSnapshot: question.questionText,
        questionTypeSnapshot: question.questionType,
        correctAnswerSnapshot,
        explanationSnapshot: question.explanation,
        vocabularyIdSnapshot: question.vocabularyId,
        vocabularyTermSnapshot: question.vocabularyTerm,
        isCorrect: Boolean(matched.isCorrect),
      };
    }

    return {
      questionId: question.id,
      selectedOptionId: null,
      answerText: null,
      questionTextSnapshot: question.questionText,
      questionTypeSnapshot: question.questionType,
      correctAnswerSnapshot,
      explanationSnapshot: question.explanation,
      vocabularyIdSnapshot: question.vocabularyId,
      vocabularyTermSnapshot: question.vocabularyTerm,
      isCorrect: false,
    };
  }
}
