import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, Res } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { MeResponseDto } from './dto/me-response.dto.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CsrfTokenDto } from './dto/csrf-token.dto.js';
import { SessionInfoDto } from './dto/session-info.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthUser } from './auth.types.js';

const NOT_LOGGED_IN = 'Not logged in (no or expired session), or the user is inactive';
const BAD_CSRF = 'Missing or invalid X-CSRF-Token, or sent from a page on another site';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in with email or NIK',
    description:
      'Starts a session: sets the httpOnly ctd.sid cookie, which the browser sends from then on, and replaces any session this browser had. ' +
      'Send csrf_token as X-CSRF-Token on every POST/PATCH/PUT/DELETE (Swagger UI does this for you). Limited to 5 requests per minute per IP.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials (unknown user, wrong password or inactive account)' })
  @ApiForbiddenResponse({ description: 'Sent from a browser page on an origin that is not allowed' })
  @ApiTooManyRequestsResponse({ description: 'More than 5 attempts in a minute' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const user = await this.auth.verifyCredentials(dto);
    const csrfToken = await this.sessions.start(req, user.id);
    this.sessions.setCsrfCookie(res, csrfToken);
    return { user: await this.auth.profile(user), csrf_token: csrfToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Log out (end this session)' })
  @ApiNoContentResponse({ description: 'Session ended and cookies cleared' })
  @ApiUnauthorizedResponse({ description: NOT_LOGGED_IN })
  @ApiForbiddenResponse({ description: BAD_CSRF })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.sessions.end(req, 'logout');
    this.sessions.clearCookies(res);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Log out everywhere (end all your sessions, this one included)' })
  @ApiNoContentResponse({ description: 'All your sessions ended and cookies cleared' })
  @ApiUnauthorizedResponse({ description: NOT_LOGGED_IN })
  @ApiForbiddenResponse({ description: BAD_CSRF })
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.sessions.endAll(req, user.id);
    this.sessions.clearCookies(res);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the logged-in user, with their role and permissions' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: NOT_LOGGED_IN })
  me(@CurrentUser() user: AuthUser): Promise<MeResponseDto> {
    return this.auth.profile(user);
  }

  @Get('csrf')
  @ApiCookieAuth()
  @ApiOperation({
    summary: "Get this session's CSRF token",
    description: 'Same token as the login response; it stays the same for the whole session. Also sets the ctd.csrf cookie.',
  })
  @ApiOkResponse({ type: CsrfTokenDto })
  @ApiUnauthorizedResponse({ description: NOT_LOGGED_IN })
  async csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<CsrfTokenDto> {
    const csrfToken = await this.sessions.csrfToken(req);
    this.sessions.setCsrfCookie(res, csrfToken);
    return { csrf_token: csrfToken };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Change your own password',
    description:
      'Ends all your other sessions (other devices are logged out) and gives this session a new id; the CSRF token stays the same. Limited to 5 requests per minute per IP.',
  })
  @ApiNoContentResponse({ description: 'Password changed' })
  @ApiUnauthorizedResponse({ description: 'Not logged in, or the current password is wrong' })
  @ApiForbiddenResponse({ description: BAD_CSRF })
  @ApiTooManyRequestsResponse({ description: 'More than 5 attempts in a minute' })
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto, @Req() req: Request) {
    await this.auth.changePassword(user.id, dto, req.sessionID);
    await this.sessions.rotate(req);
  }

  @Get('sessions')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'List your active sessions (devices)', description: 'Most recently used first.' })
  @ApiOkResponse({ type: [SessionInfoDto] })
  @ApiUnauthorizedResponse({ description: NOT_LOGGED_IN })
  listSessions(@CurrentUser() user: AuthUser, @Req() req: Request): Promise<SessionInfoDto[]> {
    return this.sessions.list(user.id, req.sessionID) as unknown as Promise<SessionInfoDto[]>;
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'End one of your sessions',
    description: 'That device is logged out on its next request. Ending the current session is the same as logging out.',
  })
  @ApiParam({ name: 'id', type: String, example: '42', description: 'Session id from GET /auth/sessions' })
  @ApiNoContentResponse({ description: 'Session ended' })
  @ApiUnauthorizedResponse({ description: NOT_LOGGED_IN })
  @ApiForbiddenResponse({ description: BAD_CSRF })
  @ApiNotFoundResponse({ description: 'No such session of yours' })
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseBigIntPipe) id: bigint,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { current } = await this.sessions.revoke(req, user.id, id);
    if (current) this.sessions.clearCookies(res);
  }
}
