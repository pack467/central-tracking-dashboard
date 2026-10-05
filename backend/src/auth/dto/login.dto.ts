import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  // Email or NIK.
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
