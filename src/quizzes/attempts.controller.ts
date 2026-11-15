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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AttemptQueryDto } from './dto/attempt-query.dto.js';
import { SubmitAttemptDto } from './dto/submit-attempt.dto.js';
import { QuizzesService } from './quizzes.service.js';

@ApiTags('Quiz Attempts')
@ApiBearerAuth()
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  @ApiOperation({
    summary: 'List quiz attempts across all quizzes for learner',
  })
  listAllAttempts(
    @CurrentUser('userId') userId: number,
    @Query() query: AttemptQueryDto,
  ) {
    return this.quizzesService.listAllAttempts(userId, query);
  }

  @Get(':attemptId')
  @ApiOperation({
    summary: 'Get an attempt in progress (sanitized) or completed result',
  })
  getAttempt(
    @CurrentUser('userId') userId: number,
    @Param('attemptId', ParseIntPipe) attemptId: number,
  ) {
    return this.quizzesService.getAttempt(userId, attemptId);
  }

  @Patch(':attemptId/progress')
  @ApiOperation({ summary: 'Save partial answers during an active attempt' })
  saveProgress(
    @CurrentUser('userId') userId: number,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.quizzesService.saveProgress(userId, attemptId, dto);
  }

  @Post(':attemptId/submit')
  @ApiOperation({ summary: 'Submit answers and grade an active quiz attempt' })
  submitAttempt(
    @CurrentUser('userId') userId: number,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.quizzesService.submitAttempt(userId, attemptId, dto);
  }
}
