import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { GlobalExceptionFilter } from './filters/global-exception.filter.js';
import { UpdateUserDto } from '../users/dto/update-user.dto.js';
import { UpdateTicketDto } from '../tickets/dto/update-ticket.dto.js';
import { UpdateTicketCategoryDto } from '../tickets/categories/dto/ticket-category.dto.js';
import { UpdateTicketSeverityDto } from '../tickets/severities/dto/ticket-severity.dto.js';
import { UpdateRoleDto } from '../roles/dto/role.dto.js';

// Update DTOs use PartialType(..., { skipNullProperties: false }) so that null
// for a column that is NOT NULL in the database is a 400, not a DB error (500).
const errorsFor = async (cls: new () => object, body: object) =>
  (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe('required fields reject null on update', () => {
  it.each([
    [UpdateUserDto, { name: null }, 'name'],
    [UpdateUserDto, { email: null }, 'email'],
    [UpdateTicketDto, { subject: null }, 'subject'],
    [UpdateTicketDto, { project_id: null }, 'project_id'],
    [UpdateTicketCategoryDto, { name: null }, 'name'],
    [UpdateTicketSeverityDto, { code_name: null }, 'code_name'],
    [UpdateRoleDto, { name: null }, 'name'],
  ])('%o rejects %o', async (cls, body, field) => {
    expect(await errorsFor(cls as new () => object, body)).toContain(field);
  });

  it.each([
    [UpdateUserDto, { role_id: null, department: null }],
    [UpdateTicketDto, { description: null, closed_at: null, user_id: null }],
    [UpdateTicketCategoryDto, { description: null }],
    [UpdateRoleDto, { description: null }],
  ])('%o still allows clearing optional fields with %o', async (cls, body) => {
    expect(await errorsFor(cls as new () => object, body)).toEqual([]);
  });

  it('still allows omitting required fields (partial update)', async () => {
    expect(await errorsFor(UpdateTicketDto, {})).toEqual([]);
    expect(await errorsFor(UpdateUserDto, { department: 'QA' })).toEqual([]);
  });
});

describe('GlobalExceptionFilter', () => {
  it('turns a unique-constraint violation (P2002) into 409', () => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    const filter = new GlobalExceptionFilter(logger as never);
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({ status }) }),
    };

    filter.catch(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
      host as never,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({ statusCode: 409, message: 'A record with this value already exists' });
    expect(logger.warn.mock.calls[0][0].err).toBeInstanceOf(ConflictException);
  });
});

describe('email normalisation', () => {
  it('lowercases and trims emails on create and update', () => {
    expect(plainToInstance(UpdateUserDto, { email: '  Dimas.Yudistira@HutaByte.com ' }).email).toBe(
      'dimas.yudistira@hutabyte.com',
    );
  });
});
