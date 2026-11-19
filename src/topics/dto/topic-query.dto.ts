import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class TopicQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}
