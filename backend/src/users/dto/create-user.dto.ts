import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nik?: string;

  // Accepts "4" or 4; null clears the role. Converted to BigInt in the service.
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : String(value)))
  @Matches(/^\d+$/, { message: 'role_id must be a positive whole number' })
  role_id?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // bcrypt only uses the first 72 bytes of a password.
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  photo_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  department?: string;
}
