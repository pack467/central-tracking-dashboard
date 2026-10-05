import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TicketStatus } from '../../generated/prisma/enums.js';
import { BigIntId } from '../../common/validators/bigint-id.js';

export const TICKET_SORT_FIELDS = ['open_at', 'closed_at', 'created_at', 'updated_at', 'id'] as const;

// Filters shared by the list and the summary.
export class TicketFiltersDto {
  /** One or more statuses, comma-separated: `Open,Pending`. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()) : value))
  @IsEnum(TicketStatus, { each: true })
  status?: TicketStatus[];

  @IsOptional()
  @BigIntId()
  project_id?: string;

  @IsOptional()
  @BigIntId()
  tenant_id?: string;

  @IsOptional()
  @BigIntId()
  client_id?: string;

  /** Assignee. */
  @IsOptional()
  @BigIntId()
  user_id?: string;

  @IsOptional()
  @BigIntId()
  severity_id?: string;

  @IsOptional()
  @BigIntId()
  category_id?: string;

  /** Case-insensitive search in subject, description and third_party_ticket_id. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  /** open_at on or after this time (ISO 8601). */
  @IsOptional()
  @IsISO8601()
  open_from?: string;

  /** open_at on or before this time (ISO 8601). */
  @IsOptional()
  @IsISO8601()
  open_to?: string;
}

export class QueryTicketsDto extends TicketFiltersDto {
  /** Starts at 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** 1–100. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(TICKET_SORT_FIELDS)
  sort?: (typeof TICKET_SORT_FIELDS)[number] = 'open_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
