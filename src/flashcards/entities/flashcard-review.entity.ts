import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VocabularyItem } from '../../vocabulary/entities/vocabulary-item.entity.js';
import { FlashcardReviewSession } from './flashcard-review-session.entity.js';
import { ReviewRating } from './flashcard.enums.js';

@Entity({ name: 'flashcard_reviews' })
@Index('IDX_flashcard_reviews_session_vocab', ['sessionId', 'vocabularyId'])
@Index('IDX_flashcard_reviews_vocab', ['vocabularyId'])
export class FlashcardReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id', type: 'int' })
  sessionId: number;

  @ManyToOne(() => FlashcardReviewSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: FlashcardReviewSession;

  @Column({ name: 'vocabulary_id', type: 'int' })
  vocabularyId: number;

  @ManyToOne(() => VocabularyItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vocabulary_id' })
  vocabulary: VocabularyItem;

  @Column({
    type: 'enum',
    enum: ReviewRating,
  })
  rating: ReviewRating;

  @CreateDateColumn({ name: 'reviewed_at' })
  reviewedAt: Date;
}
