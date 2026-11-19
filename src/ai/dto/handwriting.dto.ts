import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export type HandwritingExplanationLang = 'en' | 'vi';
export type HandwritingRecognitionMode = 'recognize' | 'evaluate';

export class RecognizeHandwritingDto {
  @ApiPropertyOptional({
    example: '안녕하세요',
    description:
      'Optional expected Korean Hangul target used to grade handwriting accuracy',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  expectedText?: string;

  @ApiPropertyOptional({ enum: ['en', 'vi'], default: 'vi' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(['en', 'vi'])
  explanationLang?: HandwritingExplanationLang;

  @ApiPropertyOptional({
    enum: ['recognize', 'evaluate'],
    default: 'recognize',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(['recognize', 'evaluate'])
  mode?: HandwritingRecognitionMode;
}
