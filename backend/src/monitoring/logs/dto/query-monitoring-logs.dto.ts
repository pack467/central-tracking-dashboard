import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { MonitoringResult } from '../../../generated/prisma/enums.js';
import { BigIntId } from '../../../common/validators/bigint-id.js';
import { QueryBoolean } from '../../../common/validators/query-boolean.js';

export const MONITORING_LOG_SORT_FIELDS = ['scheduled_at', 'checked_at', 'created_at', 'updated_at', 'id'] as const;

export class QueryMonitoringLogsDto {
  @IsOptional()
  @BigIntId()
  template_id?: string;

  /** The template's project. */
  @IsOptional()
  @BigIntId()
  project_id?: string;

  /** Who did the check (user id). */
  @IsOptional()
  @BigIntId()
  checked_by?: string;

  @IsOptional()
  @IsEnum(MonitoringResult)
  result?: MonitoringResult;

  /** true: reviewed logs only; false: not reviewed yet. */
  @IsOptional()
  @QueryBoolean()
  reviewed?: boolean;

  /** scheduled_at on or after this time (ISO 8601). */
  @IsOptional()
  @IsISO8601()
  scheduled_from?: string;

  /** scheduled_at on or before this time (ISO 8601). */
  @IsOptional()
  @IsISO8601()
  scheduled_to?: string;

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
  @IsIn(MONITORING_LOG_SORT_FIELDS)
  sort?: (typeof MONITORING_LOG_SORT_FIELDS)[number] = 'scheduled_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
