import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ChangePasswordDto } from '../auth/dto/change-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { UpdateLeaderboardVisibilityDto } from './dto/update-leaderboard-visibility.dto.js';
import { UpdateTimezoneDto } from './dto/update-timezone.dto.js';
import { UpdateProfileDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated learner profile' })
  getMe(@CurrentUser('userId') userId: number) {
    return this.usersService.getMyProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update authenticated learner profile' })
  updateMe(
    @CurrentUser('userId') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMyProfile(userId, dto);
  }

  @Patch('me/timezone')
  @ApiOperation({ summary: 'Update authenticated learner timezone' })
  updateTimezone(
    @CurrentUser('userId') userId: number,
    @Body() dto: UpdateTimezoneDto,
  ) {
    return this.usersService.updateTimezone(userId, dto.timezone);
  }

  @Patch('me/leaderboard-visibility')
  @ApiOperation({ summary: 'Toggle leaderboard visibility for current user' })
  updateLeaderboardVisibility(
    @CurrentUser('userId') userId: number,
    @Body() dto: UpdateLeaderboardVisibilityDto,
  ) {
    return this.usersService.updateLeaderboardVisibility(
      userId,
      dto.isLeaderboardVisible,
    );
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change or set password for current user' })
  changePassword(
    @CurrentUser('userId') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete current learner account permanently' })
  deleteMe(
    @CurrentUser('userId') userId: number,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.usersService.deleteMyAccount(userId, dto);
  }
}
