import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum ActivitySourceType {
  QUIZ_ATTEMPT = 'quiz_attempt',
  FLASHCARD_SESSION = 'flashcard_session',
}

@Entity({ name: 'learning_activity_events' })
@Index('UQ_learning_activity_event_key', ['eventKey'], { unique: true })
@Index('IDX_learning_activity_events_user_date', ['userId', 'activityDate'])
export class LearningActivityEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'event_key', type: 'varchar', length: 128 })
  eventKey: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: ActivitySourceType,
  })
  sourceType: ActivitySourceType;

  @Column({ name: 'source_id', type: 'int' })
  sourceId: number;

  @Column({ name: 'activity_date', type: 'date' })
  activityDate: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
