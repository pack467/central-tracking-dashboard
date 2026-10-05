import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TicketStatus } from '../../generated/prisma/enums.js';
import { BigIntId } from '../../common/validators/bigint-id.js';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject: string;

  /** Project id. The ticket's tenant is taken from the project unless tenant_id is given. */
  @BigIntId()
  project_id: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  /** Ticket id in the external system, e.g. TS-856290 or HTB-000001. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  third_party_ticket_id?: string | null;

  /** Must match the project's tenant if given. */
  @IsOptional()
  @BigIntId()
  tenant_id?: string | null;

  @IsOptional()
  @BigIntId()
  client_id?: string | null;

  /** Assignee (user id). Defaults to you; null leaves the ticket unassigned (not allowed for AGENT). */
  @IsOptional()
  @BigIntId()
  user_id?: string | null;

  @IsOptional()
  @BigIntId()
  severity_id?: string | null;

  @IsOptional()
  @BigIntId()
  category_id?: string | null;

  /** Free-text name of whoever raised the ticket. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  requester?: string | null;

  /** Defaults to Open. */
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  /** ISO 8601, e.g. 2026-10-06T09:30:00+07:00. Defaults to now. */
  @IsOptional()
  @IsISO8601()
  open_at?: string;

  /** ISO 8601. Set automatically when status becomes Closed. */
  @IsOptional()
  @IsISO8601()
  closed_at?: string | null;
}
