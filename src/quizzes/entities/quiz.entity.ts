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
import { Topic } from '../../topics/entities/topic.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { QuizDifficulty, QuizStatus } from './quiz.enums.js';

@Entity({ name: 'quizzes' })
@Index('IDX_quizzes_user_status', ['userId', 'status'])
@Index('IDX_quizzes_topic_id', ['topicId'])
export class Quiz {
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

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: QuizDifficulty,
    nullable: true,
  })
  difficulty: QuizDifficulty | null;

  @Column({
    type: 'enum',
    enum: QuizStatus,
    default: QuizStatus.DRAFT,
  })
  status: QuizStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
