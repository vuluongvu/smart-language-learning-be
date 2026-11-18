import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  EvaluateUnitWritingDto,
  SaveUnitWordsDto,
  StartUnitSpeakingDto,
  SubmitUnitQuizDto,
  UpdateLearningGoalDto,
} from './dto/learning-path.dto.js';
import { LearningPathService } from './learning-path.service.js';

@ApiTags('Learning Path')
@ApiBearerAuth()
@Controller('learning-path')
export class LearningPathController {
  constructor(private readonly learningPathService: LearningPathService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get goal-based learning path skill tree (tracks, parts, units, and progress)',
  })
  getOverview(
    @CurrentUser('userId') userId: number,
    @Query('band') band?: string,
  ) {
    return this.learningPathService.getOverview(userId, band);
  }

  @Patch('goal')
  @ApiOperation({
    summary:
      'Update learner target Band, current CEFR level, and daily study goal',
  })
  updateGoal(
    @CurrentUser('userId') userId: number,
    @Body() dto: UpdateLearningGoalDto,
  ) {
    return this.learningPathService.updateGoal(userId, dto);
  }

  @Get('units/:id')
  @ApiOperation({
    summary:
      'Get unit detail with curated vocabulary, listening/reading quiz, writing & speaking prompts',
  })
  getUnitDetail(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) unitId: number,
  ) {
    return this.learningPathService.getUnitDetail(userId, unitId);
  }

  @Post('units/:id/vocab/sync')
  @ApiOperation({
    summary:
      'Save unit core vocabulary into learner notebook and unit topic (0 AI tokens)',
  })
  syncUnitVocab(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) unitId: number,
  ) {
    return this.learningPathService.syncUnitVocabToNotebook(userId, unitId);
  }

  @Post('units/:id/quiz/submit')
  @ApiOperation({
    summary:
      'Submit and grade unit listening/reading comprehension quiz deterministically (0 AI tokens)',
  })
  submitUnitQuiz(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) unitId: number,
    @Body() dto: SubmitUnitQuizDto,
  ) {
    return this.learningPathService.submitUnitQuiz(userId, unitId, dto);
  }

  @Post('units/:id/writing/evaluate')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Evaluate learner writing paragraph calibrated strictly to unit target Band via AI',
  })
  evaluateUnitWriting(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) unitId: number,
    @Body() dto: EvaluateUnitWritingDto,
  ) {
    return this.learningPathService.evaluateUnitWriting(userId, unitId, dto);
  }

  @Post('units/:id/speaking/start')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Start or resume an AI guided voice/text speaking session tailored to this unit',
  })
  startUnitSpeaking(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) unitId: number,
    @Body() dto: StartUnitSpeakingDto,
  ) {
    return this.learningPathService.startUnitSpeaking(userId, unitId, dto);
  }

  @Post('units/:id/speaking/complete')
  @ApiOperation({
    summary: 'Mark unit speaking practice step as completed',
  })
  completeUnitSpeaking(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) unitId: number,
  ) {
    return this.learningPathService.completeUnitSpeaking(userId, unitId);
  }

  @Post('units/:id/notebook/save-words')
  @ApiOperation({
    summary:
      'Save AI suggested words from writing/speaking feedback into unit notebook topic',
  })
  saveWordsToNotebook(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) unitId: number,
    @Body() dto: SaveUnitWordsDto,
  ) {
    return this.learningPathService.saveWordsToUnitNotebook(
      userId,
      unitId,
      dto,
    );
  }
}
