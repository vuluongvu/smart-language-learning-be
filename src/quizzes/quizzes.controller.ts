import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { DraftFromVocabularyDto } from './dto/draft-from-vocabulary.dto.js';
import { QuizQueryDto } from './dto/quiz-query.dto.js';
import { SaveVocabularyFromQuizDto } from './dto/save-vocabulary-from-quiz.dto.js';
import { StartAttemptDto } from './dto/start-attempt.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { QuizzesService } from './quizzes.service.js';

@ApiTags('Quizzes')
@ApiBearerAuth()
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  @ApiOperation({ summary: 'List quizzes owned by current learner' })
  findAll(@CurrentUser('userId') userId: number, @Query() query: QuizQueryDto) {
    return this.quizzesService.findAll(userId, query);
  }

  @Post('draft-from-vocabulary')
  @ApiOperation({
    summary:
      'Generate editable quiz question drafts deterministically from learner vocabulary (zero AI)',
  })
  draftFromVocabulary(
    @CurrentUser('userId') userId: number,
    @Body() dto: DraftFromVocabularyDto,
  ) {
    return this.quizzesService.draftFromVocabulary(userId, dto);
  }

  @Post('save-vocabulary')
  @ApiOperation({
    summary:
      'Save a vocabulary item from quiz results or attach an existing item to topics',
  })
  saveVocabularyFromQuiz(
    @CurrentUser('userId') userId: number,
    @Body() dto: SaveVocabularyFromQuizDto,
  ) {
    return this.quizzesService.saveVocabularyFromQuiz(userId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new manual quiz with questions' })
  create(@CurrentUser('userId') userId: number, @Body() dto: CreateQuizDto) {
    return this.quizzesService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get owned quiz detail for editing/reviewing' })
  findOne(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quizzesService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update owned quiz metadata and/or questions' })
  update(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.quizzesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned quiz and its questions/attempts' })
  remove(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quizzesService.remove(userId, id);
  }

  @Post(':id/attempts')
  @ApiOperation({
    summary:
      'Start a new quiz attempt or resume an existing in-progress attempt',
  })
  startAttempt(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StartAttemptDto,
  ) {
    return this.quizzesService.startAttempt(userId, id, dto);
  }

  @Get(':id/attempts')
  @ApiOperation({ summary: 'List attempts for a specific owned quiz' })
  listQuizAttempts(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.quizzesService.listQuizAttempts(userId, id, query);
  }
}
