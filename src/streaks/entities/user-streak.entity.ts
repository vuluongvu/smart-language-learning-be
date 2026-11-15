import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity({ name: 'user_streaks' })
@Index('UQ_user_streaks_user', ['userId'], { unique: true })
@Index('IDX_user_streaks_ranking', [
  'currentStreak',
  'longestStreak',
  'streakAchievedAt',
])
export class UserStreak {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak: number;

  @Column({ name: 'last_activity_date', type: 'date', nullable: true })
  lastActivityDate: string | null;

  @Column({ name: 'current_streak_started_at', type: 'date', nullable: true })
  currentStreakStartedAt: string | null;

  @Column({
    name: 'streak_achieved_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  streakAchievedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
