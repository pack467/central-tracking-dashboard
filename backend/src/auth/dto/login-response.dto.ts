import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT to send as `Authorization: Bearer <token>`' })
  access_token: string;

  @ApiProperty({ example: 'Bearer' })
  token_type: 'Bearer';
}
