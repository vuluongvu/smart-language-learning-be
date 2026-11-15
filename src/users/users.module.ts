import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshSession } from '../auth/entities/refresh-session.entity.js';
import { UserAuthProvider } from '../auth/entities/user-auth-provider.entity.js';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserAuthProvider, RefreshSession])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
