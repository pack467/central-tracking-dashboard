import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [UsersModule, SessionsModule],
  controllers: [AuthController],
  providers: [AuthService],
  // AuthGuard (registered globally in AppModule) loads the user through AuthService.
  exports: [AuthService],
})
export class AuthModule {}
