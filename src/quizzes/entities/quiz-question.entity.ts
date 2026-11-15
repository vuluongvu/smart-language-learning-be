import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VocabularyItem } from '../../vocabulary/entities/vocabulary-item.entity.js';
import { QuestionType } from './quiz.enums.js';
import { Quiz } from './quiz.entity.js';

@Entity({ name: 'quiz_questions' })
@Index('IDX_quiz_questions_quiz_order', ['quizId', 'orderIndex'])
@Index('IDX_quiz_questions_vocabulary_id', ['vocabularyId'])
export class QuizQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quiz_id', type: 'int' })
  quizId: number;

  @ManyToOne(() => Quiz, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @Column({ name: 'vocabulary_id', type: 'int', nullable: true })
  vocabularyId: number | null;

  @ManyToOne(() => VocabularyItem, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vocabulary_id' })
  vocabulary: VocabularyItem | null;

  @Column({
    name: 'vocabulary_term',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  vocabularyTerm: string | null;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({
    name: 'question_type',
    type: 'enum',
    enum: QuestionType,
  })
  questionType: QuestionType;

  @Column({ type: 'text', nullable: true })
  explanation: string | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
