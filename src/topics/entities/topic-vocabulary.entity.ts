import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { VocabularyItem } from '../../vocabulary/entities/vocabulary-item.entity.js';
import { Topic } from './topic.entity.js';

@Entity({ name: 'topic_vocabulary' })
@Index('IDX_topic_vocabulary_vocabulary_id', ['vocabularyId'])
export class TopicVocabulary {
  @PrimaryColumn({ name: 'topic_id', type: 'int' })
  topicId: number;

  @PrimaryColumn({ name: 'vocabulary_id', type: 'int' })
  vocabularyId: number;

  @ManyToOne(() => Topic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

  @ManyToOne(() => VocabularyItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vocabulary_id' })
  vocabulary: VocabularyItem;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
