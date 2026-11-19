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
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  EvaluateUnitWritingDto,
  GenerateAiLearningPathDto,
  GenerateUnitStudyGuideDto,
  LearningPathOverviewQueryDto,
  RegenerateAiUnitDto,
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
    @Query() query: LearningPathOverviewQueryDto,
  ) {
    return this.learningPathService.getOverview(
      userId,
      query.band,
      query.languageCode,
    );
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

  @Post('ai/generate')
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Generate a personalized multi-unit learning path + full study materials from a goal or raw notes using AI',
  })
  generateAiPath(
    @CurrentUser('userId') userId: number,
    @Body() dto: GenerateAiLearningPathDto,
  ) {
    return this.learningPathService.generateAiLearningPath(userId, dto);
  }

  @Delete('ai-tracks/:trackId')
  @ApiOperation({
    summary:
      'Delete an AI-generated personal learning path owned by the learner',
  })
  deleteAiTrack(
    @CurrentUser('userId') userId: number,
    @Param('trackId', ParseIntPipe) trackId: number,
  ) {
    return this.learningPathService.deleteAiTrack(userId, trackId);
  }

  @Post('units/:id/ai/study-guide')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Generate or customize an AI study guide (grammar rules, sentence patterns, common mistakes) for any unit',
  })
  generateUnitStudyGuide(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) unitId: number,
    @Body() dto: GenerateUnitStudyGuideDto,
  ) {
    return this.learningPathService.generateUnitStudyGuide(userId, unitId, dto);
  }

  @Post('units/:id/ai/regenerate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Regenerate all AI study materials and 4-skill exercises for a custom AI unit',
  })
  regenerateAiUnit(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) unitId: number,
    @Body() dto: RegenerateAiUnitDto,
  ) {
    return this.learningPathService.regenerateAiUnitMaterials(
      userId,
      unitId,
      dto,
    );
  }
}
