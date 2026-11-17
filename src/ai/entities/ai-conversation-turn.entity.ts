import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AiConversationSession } from './ai-conversation-session.entity.js';

export type ErrorCategory = 'grammar' | 'vocabulary' | 'phrasing' | 'tone';
export type AppropriatenessRating = 'great' | 'good' | 'needs_work';

export interface ConversationFeedbackError {
  original: string;
  correction: string;
  category: ErrorCategory;
  reason: string;
}

export interface ConversationSuggestedWord {
  term: string;
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
}

export interface ConversationTurnFeedback {
  appropriateness: AppropriatenessRating;
  assessment: string;
  notableErrors: ConversationFeedbackError[];
  improvedVersion: string;
  explanation: string;
  suggestedWords: ConversationSuggestedWord[];
}

@Entity({ name: 'ai_conversation_turns' })
@Unique('UQ_ai_conv_turns_session_number', ['sessionId', 'turnNumber'])
export class AiConversationTurn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id', type: 'int' })
  sessionId: number;

  @ManyToOne(() => AiConversationSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: AiConversationSession;

  @Column({ name: 'turn_number', type: 'int' })
  turnNumber: number;

  @Column({ name: 'ai_prompt', type: 'text' })
  aiPrompt: string;

  @Column({ name: 'user_answer', type: 'text', nullable: true })
  userAnswer: string | null;

  @Column({ name: 'feedback_json', type: 'json', nullable: true })
  feedbackJson: ConversationTurnFeedback | null;

  @Column({
    name: 'answered_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  answeredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
