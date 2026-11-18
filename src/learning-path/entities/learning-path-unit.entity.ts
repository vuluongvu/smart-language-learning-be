import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LearningPathPart } from './learning-path-part.entity.js';

export interface UnitVocabWord {
  term: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  notes: string;
}

export interface UnitReadingQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface UnitReadingListening {
  title: string;
  audioScript: string;
  translation: string;
  questions: UnitReadingQuizQuestion[];
}

export interface UnitWritingPrompt {
  prompt: string;
  minSentences: number;
  targetBand: string;
  targetTerms: string[];
  sampleAnswer: string;
}

@Entity({ name: 'learning_path_units' })
export class LearningPathUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'part_id', type: 'int' })
  partId: number;

  @ManyToOne(() => LearningPathPart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'part_id' })
  part: LearningPathPart;

  @Column({ name: 'unit_number', type: 'int' })
  unitNumber: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 140 })
  title: string;

  @Column({ name: 'topic_name', type: 'varchar', length: 120 })
  topicName: string;

  @Column({ type: 'varchar', length: 32, default: 'compass' })
  icon: string;

  @Column({ name: 'theme_color', type: 'varchar', length: 24, default: 'pink' })
  themeColor: string;

  @Column({ name: 'grammar_focus', type: 'varchar', length: 255 })
  grammarFocus: string;

  @Column({ name: 'vocabulary_json', type: 'json' })
  vocabularyJson: UnitVocabWord[];

  @Column({ name: 'reading_passage_json', type: 'json' })
  readingPassageJson: UnitReadingListening;

  @Column({ name: 'writing_prompt_json', type: 'json' })
  writingPromptJson: UnitWritingPrompt;

  @Column({ name: 'speaking_topic_prompt', type: 'varchar', length: 255 })
  speakingTopicPrompt: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
