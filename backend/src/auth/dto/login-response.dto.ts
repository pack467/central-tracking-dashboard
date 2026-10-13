import { ApiProperty } from '@nestjs/swagger';
import { MeResponseDto } from './me-response.dto.js';

// POST /auth/login. The session itself travels in the httpOnly ctd.sid cookie.
export class LoginResponseDto {
  @ApiProperty({ type: MeResponseDto })
  user: MeResponseDto;

  @ApiProperty({
    example: 'q7o1Kx3l8Yv2u0bQm5n6Zr4tWc9sEaHfJdGkLpViXyU',
    description: 'Send as the X-CSRF-Token header on every POST/PATCH/PUT/DELETE. Same as GET /auth/csrf.',
  })
  csrf_token: string;
}
