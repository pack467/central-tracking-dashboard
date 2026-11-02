import { IsEnum, IsISO8601, IsOptional, IsString, IsUrl } from 'class-validator';
import { MonitoringResult } from '../../../generated/prisma/enums.js';
import { BigIntId } from '../../../common/validators/bigint-id.js';

export class CreateMonitoringLogDto {
  /** The template that was checked. */
  @BigIntId()
  template_id: string;

  /** The slot that was checked, as an exact instant (ISO 8601), e.g. 2026-11-02T09:00:00+07:00 for 09:00 WIB. Must be one of the template's times, on a day it is active. */
  @IsISO8601()
  scheduled_at: string;

  @IsEnum(MonitoringResult)
  result: MonitoringResult;

  /** What was found. Required when result is NOK. */
  @IsOptional()
  @IsString()
  note?: string | null;

  /** Link to a screenshot or other evidence. */
  @IsOptional()
  @IsUrl()
  evidence_url?: string | null;

  /** Ticket raised for a NOK. */
  @IsOptional()
  @BigIntId()
  ticket_id?: string | null;
}
