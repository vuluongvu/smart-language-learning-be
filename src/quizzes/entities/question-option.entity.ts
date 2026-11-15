import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity.js';

@Entity({ name: 'question_options' })
@Index('IDX_question_options_question_order', ['questionId', 'orderIndex'])
export class QuestionOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'question_id', type: 'int' })
  questionId: number;

  @ManyToOne(() => QuizQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion;

  @Column({ name: 'option_text', type: 'text' })
  optionText: string;

  @Column({ name: 'is_correct', type: 'boolean', default: false })
  isCorrect: boolean;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;
}
