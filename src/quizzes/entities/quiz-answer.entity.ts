import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuestionOption } from './question-option.entity.js';
import { QuizAttempt } from './quiz-attempt.entity.js';
import { QuestionType } from './quiz.enums.js';
import { QuizQuestion } from './quiz-question.entity.js';

@Entity({ name: 'quiz_answers' })
@Index('UQ_quiz_answers_attempt_question', ['attemptId', 'questionId'], {
  unique: true,
})
@Index('IDX_quiz_answers_question_id', ['questionId'])
export class QuizAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'attempt_id', type: 'int' })
  attemptId: number;

  @ManyToOne(() => QuizAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttempt;

  @Column({ name: 'question_id', type: 'int', nullable: true })
  questionId: number | null;

  @ManyToOne(() => QuizQuestion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion | null;

  @Column({ name: 'selected_option_id', type: 'int', nullable: true })
  selectedOptionId: number | null;

  @ManyToOne(() => QuestionOption, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'selected_option_id' })
  selectedOption: QuestionOption | null;

  @Column({ name: 'answer_text', type: 'text', nullable: true })
  answerText: string | null;

  @Column({ name: 'question_text_snapshot', type: 'text' })
  questionTextSnapshot: string;

  @Column({
    name: 'question_type_snapshot',
    type: 'enum',
    enum: QuestionType,
  })
  questionTypeSnapshot: QuestionType;

  @Column({ name: 'correct_answer_snapshot', type: 'text' })
  correctAnswerSnapshot: string;

  @Column({ name: 'explanation_snapshot', type: 'text', nullable: true })
  explanationSnapshot: string | null;

  @Column({ name: 'vocabulary_id_snapshot', type: 'int', nullable: true })
  vocabularyIdSnapshot: number | null;

  @Column({
    name: 'vocabulary_term_snapshot',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  vocabularyTermSnapshot: string | null;

  @Column({ name: 'is_correct', type: 'boolean', default: false })
  isCorrect: boolean;

  @CreateDateColumn({ name: 'answered_at' })
  answeredAt: Date;
}
