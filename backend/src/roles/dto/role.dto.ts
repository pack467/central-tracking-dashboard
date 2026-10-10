import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// Format only; whether a key exists (and isn't obsolete) is checked against the
// permissions table in RolesService.
const PERMISSION_KEY = /^(\*|[a-z][a-z0-9-]*(\.[a-z0-9-]+)+)$/;

export class SetRolePermissionsDto {
  /** Keys from GET /permissions, or ["*"] for everything (including future permissions). */
  @ApiProperty({ type: [String], example: ['tickets.read', 'tickets.write', 'users.read'] })
  @IsArray()
  @ArrayUnique()
  @Matches(PERMISSION_KEY, { each: true, message: 'each value in permissions must be a permission key or "*"' })
  permissions: string[];
}

export class CreateRoleDto extends SetRolePermissionsDto {
  /** Unique (case-insensitive), e.g. SUPERVISOR. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto, { skipNullProperties: false }) {}

// Response shape, for documentation only.
export class Role {
  @ApiProperty({ example: '6' }) id: string;
  @ApiProperty({ example: 'SUPERVISOR' }) name: string;
  @ApiProperty({ type: String, nullable: true, example: 'Shift supervisors' }) description: string | null;

  @ApiProperty({ type: [String], description: 'Granted keys as stored; may be ["*"]', example: ['tickets.read', 'users.read'] })
  permissions: string[];

  @ApiProperty({ type: [String], description: 'What the grants give ("*" expanded, obsolete keys dropped)' })
  effective_permissions: string[];

  @ApiProperty({ example: 4, description: 'Users that have this role' }) user_count: number;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}
