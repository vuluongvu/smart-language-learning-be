import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateFlashcardSessionDto } from './dto/create-session.dto.js';
import { DueFlashcardsQueryDto } from './dto/due-query.dto.js';
import { RecordFlashcardReviewDto } from './dto/record-review.dto.js';
import { FlashcardSessionQueryDto } from './dto/session-query.dto.js';
import { FlashcardsService } from './flashcards.service.js';

@ApiTags('Flashcards & Review')
@ApiBearerAuth()
@Controller()
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Get('flashcards/due')
  @ApiOperation({
    summary:
      'Get due, new, or hard vocabulary flashcards and queue summary counts',
  })
  getDueQueue(
    @CurrentUser('userId') userId: number,
    @Query() query: DueFlashcardsQueryDto,
  ) {
    return this.flashcardsService.getDueQueue(userId, query);
  }

  @Get('flashcard-sessions')
  @ApiOperation({
    summary: 'List flashcard review sessions for current learner',
  })
  listSessions(
    @CurrentUser('userId') userId: number,
    @Query() query: FlashcardSessionQueryDto,
  ) {
    return this.flashcardsService.listSessions(userId, query);
  }

  @Post('flashcard-sessions')
  @ApiOperation({
    summary:
      'Create a flashcard review session from a topic, mode, or card IDs',
  })
  createSession(
    @CurrentUser('userId') userId: number,
    @Body() dto: CreateFlashcardSessionDto,
  ) {
    return this.flashcardsService.createSession(userId, dto);
  }

  @Get('flashcard-sessions/:id')
  @ApiOperation({
    summary: 'Get flashcard review session detail, cards, and rating progress',
  })
  getSession(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.flashcardsService.getSession(userId, id);
  }

  @Post('flashcard-sessions/:id/reviews')
  @ApiOperation({
    summary:
      'Record a rating (again/hard/good/easy) for a card and update SRS schedule',
  })
  recordReview(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordFlashcardReviewDto,
  ) {
    return this.flashcardsService.recordReview(
      userId,
      id,
      dto.vocabularyId,
      dto.rating,
    );
  }

  @Post('flashcard-sessions/:id/complete')
  @ApiOperation({
    summary:
      'Finish a flashcard review session and evaluate Streak completion threshold',
  })
  completeSession(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.flashcardsService.completeSession(userId, id);
  }
}
