import { ApiProperty } from '@nestjs/swagger';

// Response shape of a user, as returned by /users and /auth/me.
// Documentation only: the password hash is never returned. BigInt ids are
// serialised as strings (see common/bigint-json.ts).
export class User {
  @ApiProperty({ type: String, example: '10' })
  id: string;

  @ApiProperty({ type: String, nullable: true, example: 'Dimas Yudistira' })
  name: string | null;

  @ApiProperty({ type: String, nullable: true, example: '2026-8027' })
  nik: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'name@hutabyte.com' })
  email: string | null;

  @ApiProperty({ type: String, nullable: true, example: '4' })
  role_id: string | null;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ type: String, nullable: true })
  photo_url: string | null;

  @ApiProperty({ type: String, nullable: true })
  department: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
