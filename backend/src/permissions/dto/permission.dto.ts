import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;
}

class RoleRef {
  @ApiProperty({ example: '2' }) id: string;
  @ApiProperty({ example: 'ADMIN' }) name: string;
}

// Response shape, for documentation only.
export class PermissionInfo {
  @ApiProperty({ example: 'tickets.read' }) key: string;
  @ApiProperty({ type: String, nullable: true, example: 'Read tickets, the ticket summary, categories and severities' })
  description: string | null;

  @ApiProperty({ description: 'True when the running code no longer defines this key; it then grants nothing' })
  obsolete: boolean;

  @ApiProperty({ type: Date, nullable: true }) obsolete_at: Date | null;
  @ApiProperty({ type: [RoleRef], description: 'Roles granted this permission directly (not through "*")' })
  roles: RoleRef[];

  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}
