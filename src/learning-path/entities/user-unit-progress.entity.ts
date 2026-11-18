import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import {
  LearningPathUnit,
  UnitStudyGuide,
} from './learning-path-unit.entity.js';

export interface UnitWritingError {
  original: string;
  correction: string;
  reason: string;
}

export interface UnitWritingSuggestedWord {
  term: string;
  partOfSpeech: string | null;
  definition: string;
  example: string;
}

export interface UnitWritingFeedback {
  estimatedBand: string;
  summary: string;
  usedTargetTerms: string[];
  missedTargetTerms: string[];
  notableErrors: UnitWritingError[];
  upgradedVersion: string;
  explanation: string;
  suggestedWords: UnitWritingSuggestedWord[];
}

@Entity({ name: 'user_unit_progress' })
export class UserUnitProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'unit_id', type: 'int' })
  unitId: number;

  @ManyToOne(() => LearningPathUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: LearningPathUnit;

  @Column({ name: 'vocab_completed', type: 'boolean', default: false })
  vocabCompleted: boolean;

  @Column({ name: 'quiz_completed', type: 'boolean', default: false })
  quizCompleted: boolean;

  @Column({ name: 'quiz_score', type: 'int', nullable: true })
  quizScore: number | null;

  @Column({ name: 'writing_completed', type: 'boolean', default: false })
  writingCompleted: boolean;

  @Column({ name: 'writing_submission', type: 'text', nullable: true })
  writingSubmission: string | null;

  @Column({ name: 'writing_feedback_json', type: 'json', nullable: true })
  writingFeedbackJson: UnitWritingFeedback | null;

  @Column({ name: 'speaking_completed', type: 'boolean', default: false })
  speakingCompleted: boolean;

  @Column({ name: 'speaking_session_id', type: 'int', nullable: true })
  speakingSessionId: number | null;

  @Column({ name: 'topic_id', type: 'int', nullable: true })
  topicId: number | null;

  @Column({ name: 'ai_study_guide_json', type: 'json', nullable: true })
  aiStudyGuideJson: UnitStudyGuide | null;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
