import { IsBoolean } from 'class-validator';

export class UpdateLeaderboardVisibilityDto {
  @IsBoolean()
  isLeaderboardVisible: boolean;
}
