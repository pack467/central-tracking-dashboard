import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { BigIntId } from '../../../common/validators/bigint-id.js';
import { QueryBoolean } from '../../../common/validators/query-boolean.js';
import { TIME_OF_DAY } from '../../monitoring-schedule.js';

export const MONITORING_TEMPLATE_SORT_FIELDS = ['times', 'name', 'created_at', 'updated_at', 'id'] as const;

export class QueryMonitoringTemplatesDto {
  @IsOptional()
  @BigIntId()
  project_id?: string;

  /** Project name contains this (case-insensitive), e.g. "mediation". */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  project?: string;

  @IsOptional()
  @BigIntId()
  client_id?: string;

  /** Only templates due at this time ("HH:mm"). */
  @IsOptional()
  @Matches(TIME_OF_DAY, { message: 'times must be a time of day as HH:mm, e.g. 09:00' })
  times?: string;

  /** true: switched-on templates only; false: switched-off ones. */
  @IsOptional()
  @QueryBoolean()
  is_active?: boolean;

  @IsOptional()
  @QueryBoolean()
  is_temporary?: boolean;

  /** Case-insensitive search in name and instructions. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

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

  /** Default times: in order of the day, then by name. */
  @IsOptional()
  @IsIn(MONITORING_TEMPLATE_SORT_FIELDS)
  sort?: (typeof MONITORING_TEMPLATE_SORT_FIELDS)[number] = 'times';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';
}
