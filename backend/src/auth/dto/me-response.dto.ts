import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity.js';
import { ALL_PERMISSIONS, type Permission } from '../permissions.js';

// GET /auth/me: the user plus what they may do, so a client can show or hide
// actions. The server still enforces every permission itself.
export class MeResponseDto extends User {
  @ApiProperty({ type: String, nullable: true, example: 'AGENT', description: 'Role name, for display' })
  role: string | null;

  @ApiProperty({ enum: ALL_PERMISSIONS, isArray: true, example: ['tickets.read', 'tickets.write', 'users.read'] })
  permissions: Permission[];
}
