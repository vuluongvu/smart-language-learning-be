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

@Entity({ name: 'user_daily_activities' })
@Index('UQ_user_daily_activity_user_date', ['userId', 'activityDate'], {
  unique: true,
})
@Index('IDX_user_daily_activity_user_date', ['userId', 'activityDate'])
export class UserDailyActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'activity_date', type: 'date' })
  activityDate: string;

  @Column({ name: 'activity_count', type: 'int', default: 1 })
  activityCount: number;

  @Column({ name: 'quiz_completions', type: 'int', default: 0 })
  quizCompletions: number;

  @Column({ name: 'flashcard_completions', type: 'int', default: 0 })
  flashcardCompletions: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
