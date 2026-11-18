import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Topic } from '../../topics/entities/topic.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  FlashcardSessionMode,
  FlashcardSessionStatus,
} from './flashcard.enums.js';

@Entity({ name: 'flashcard_review_sessions' })
@Index('IDX_flashcard_sessions_user_status', ['userId', 'status', 'startedAt'])
export class FlashcardReviewSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'topic_id', type: 'int', nullable: true })
  topicId: number | null;

  @ManyToOne(() => Topic, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic | null;

  @Column({ name: 'language_code', type: 'varchar', length: 16, default: 'en' })
  languageCode: string;

  @Column({
    type: 'enum',
    enum: FlashcardSessionMode,
    default: FlashcardSessionMode.DUE_AND_NEW,
  })
  mode: FlashcardSessionMode;

  @Column({ name: 'card_ids_json', type: 'json' })
  cardIds: number[];

  @Column({ name: 'target_count', type: 'int', default: 0 })
  targetCount: number;

  @Column({ name: 'reviewed_count', type: 'int', default: 0 })
  reviewedCount: number;

  @Column({ name: 'is_streak_eligible', type: 'boolean', default: false })
  isStreakEligible: boolean;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  completedAt: Date | null;

  @Column({
    type: 'enum',
    enum: FlashcardSessionStatus,
    default: FlashcardSessionStatus.IN_PROGRESS,
  })
  status: FlashcardSessionStatus;
}
