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
import { Language } from '../../languages/entities/language.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum VocabularySource {
  MANUAL = 'manual',
  QUIZ = 'quiz',
  IMPORT = 'import',
  AI = 'ai',
}

@Entity({ name: 'vocabulary_items' })
@Index('IDX_vocabulary_user_term', ['userId', 'term'])
@Index('IDX_vocabulary_language_id', ['languageId'])
export class VocabularyItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'language_id', type: 'int' })
  languageId: number;

  @ManyToOne(() => Language, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'language_id' })
  language: Language;

  @Column({ type: 'varchar', length: 255 })
  term: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pronunciation: string | null;

  @Column({
    name: 'part_of_speech',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  partOfSpeech: string | null;

  @Column({ type: 'text' })
  definition: string;

  @Column({ type: 'text', nullable: true })
  example: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'enum',
    enum: VocabularySource,
    default: VocabularySource.MANUAL,
  })
  source: VocabularySource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
