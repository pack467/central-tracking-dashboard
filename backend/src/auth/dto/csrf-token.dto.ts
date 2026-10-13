import { ApiProperty } from '@nestjs/swagger';

export class CsrfTokenDto {
  @ApiProperty({
    example: 'q7o1Kx3l8Yv2u0bQm5n6Zr4tWc9sEaHfJdGkLpViXyU',
    description: "The session's CSRF token: send it as X-CSRF-Token on every POST/PATCH/PUT/DELETE",
  })
  csrf_token: string;
}
