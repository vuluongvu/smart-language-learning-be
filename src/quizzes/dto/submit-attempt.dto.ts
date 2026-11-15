import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AttemptAnswerInputDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  questionId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  selectedOptionId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  answerText?: string | null;
}

export class SubmitAttemptDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AttemptAnswerInputDto)
  answers: AttemptAnswerInputDto[];
}
