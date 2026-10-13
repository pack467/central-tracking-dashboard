import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaSessionStore } from './prisma-session.store.js';
import { loadSessionConfig, SESSION_CONFIG } from './session.config.js';
import { SessionsService } from './sessions.service.js';

// Login sessions: the express-session store on user_sessions and the service
// that starts, rotates and ends sessions. SessionMiddleware itself is applied in
// AppModule (it resolves the store and config exported here).
@Module({
  providers: [
    {
      provide: SESSION_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => loadSessionConfig((key) => config.get<string>(key)),
    },
    PrismaSessionStore,
    SessionsService,
  ],
  exports: [SESSION_CONFIG, PrismaSessionStore, SessionsService],
})
export class SessionsModule {}
