import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity.js';

// GET /auth/me: the user plus what they may do, so a client can show or hide
// actions. The server still enforces every permission itself.
export class MeResponseDto extends User {
  @ApiProperty({ type: String, nullable: true, example: 'AGENT', description: 'Role name, for display' })
  role: string | null;

  @ApiProperty({
    type: [String],
    example: ['tickets.read', 'tickets.write', 'users.read'],
    description: 'Effective permissions ("*" already expanded); see GET /permissions for the catalogue',
  })
  permissions: string[];
}
