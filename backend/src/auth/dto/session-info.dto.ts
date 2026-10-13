import { ApiProperty } from '@nestjs/swagger';

// One of your login sessions (GET /auth/sessions).
export class SessionInfoDto {
  @ApiProperty({ example: '42', description: 'Session id, for DELETE /auth/sessions/:id' })
  id: string;

  @ApiProperty({ description: 'True for the session making this request' })
  current: boolean;

  @ApiProperty({ type: String, nullable: true, example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) …' })
  user_agent: string | null;

  @ApiProperty({ type: String, nullable: true, example: '10.20.30.40' })
  ip: string | null;

  @ApiProperty({ description: 'Login time' })
  created_at: Date;

  @ApiProperty({ description: 'Last request (updated at most once a minute)' })
  last_used_at: Date;

  @ApiProperty({ description: 'When the session ends on its own' })
  expires_at: Date;
}
