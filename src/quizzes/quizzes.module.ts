import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguagesModule } from '../languages/languages.module.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { TopicsModule } from '../topics/topics.module.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import { VocabularyModule } from '../vocabulary/vocabulary.module.js';
import { AttemptsController } from './attempts.controller.js';
import { QuestionOption } from './entities/question-option.entity.js';
import { QuizAnswer } from './entities/quiz-answer.entity.js';
import { QuizAttempt } from './entities/quiz-attempt.entity.js';
import { QuizQuestion } from './entities/quiz-question.entity.js';
import { Quiz } from './entities/quiz.entity.js';
import { QuizScoringService } from './quiz-scoring.service.js';
import { QuizzesController } from './quizzes.controller.js';
import { QuizzesService } from './quizzes.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      QuizQuestion,
      QuestionOption,
      QuizAttempt,
      QuizAnswer,
      Topic,
      TopicVocabulary,
      VocabularyItem,
    ]),
    TopicsModule,
    VocabularyModule,
    LanguagesModule,
  ],
  controllers: [QuizzesController, AttemptsController],
  providers: [QuizzesService, QuizScoringService],
  exports: [QuizzesService, QuizScoringService],
})
export class QuizzesModule {}
