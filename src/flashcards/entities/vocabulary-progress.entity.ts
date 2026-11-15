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
import { User } from '../../users/entities/user.entity.js';
import { VocabularyItem } from '../../vocabulary/entities/vocabulary-item.entity.js';
import { ReviewRating, VocabularyProgressStatus } from './flashcard.enums.js';

@Entity({ name: 'vocabulary_progress' })
@Index('UQ_vocab_progress_user_vocab', ['userId', 'vocabularyId'], {
  unique: true,
})
@Index('IDX_vocab_progress_user_next_review', ['userId', 'nextReviewAt'])
@Index('IDX_vocab_progress_user_status', ['userId', 'status'])
export class VocabularyProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'vocabulary_id', type: 'int' })
  vocabularyId: number;

  @ManyToOne(() => VocabularyItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vocabulary_id' })
  vocabulary: VocabularyItem;

  @Column({ type: 'int', default: 0 })
  repetitions: number;

  @Column({ name: 'interval_days', type: 'int', default: 0 })
  intervalDays: number;

  @Column({
    name: 'ease_factor',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 2.5,
  })
  easeFactor: string;

  @Column({
    name: 'last_rating',
    type: 'enum',
    enum: ReviewRating,
    nullable: true,
  })
  lastRating: ReviewRating | null;

  @Column({
    name: 'last_reviewed_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  lastReviewedAt: Date | null;

  @Column({
    name: 'next_review_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  nextReviewAt: Date | null;

  @Column({
    type: 'enum',
    enum: VocabularyProgressStatus,
    default: VocabularyProgressStatus.NEW,
  })
  status: VocabularyProgressStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
