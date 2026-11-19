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
import type { LearningLanguageCode } from '../../common/constants/learning-languages.js';

export type ConversationLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ExplanationLanguage = 'vi' | 'en';
export type ConversationSessionStatus = 'active' | 'completed';

export interface ConversationCommonMistake {
  pattern: string;
  example: string;
  suggestion: string;
}

export interface ConversationSummaryVocabItem {
  term: string;
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
}

export interface ConversationSummary {
  overallRemark: string;
  commonMistakes: ConversationCommonMistake[];
  newVocabulary: ConversationSummaryVocabItem[];
  improvementTips: string[];
}

@Entity({ name: 'ai_conversation_sessions' })
@Index('IDX_ai_conv_sessions_user_status', ['userId', 'status', 'createdAt'])
@Index('IDX_ai_conv_sessions_user_language', ['userId', 'languageCode'])
export class AiConversationSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'language_code', type: 'varchar', length: 16, default: 'en' })
  languageCode: LearningLanguageCode;

  @Column({ type: 'varchar', length: 160 })
  topic: string;

  @Column({ type: 'varchar', length: 8, default: 'B1' })
  level: ConversationLevel;

  @Column({
    name: 'explanation_lang',
    type: 'varchar',
    length: 8,
    default: 'vi',
  })
  explanationLang: ExplanationLanguage;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: ConversationSessionStatus;

  @Column({ name: 'turn_count', type: 'int', default: 0 })
  turnCount: number;

  @Column({ name: 'summary_json', type: 'json', nullable: true })
  summaryJson: ConversationSummary | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    name: 'ended_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  endedAt: Date | null;
}
