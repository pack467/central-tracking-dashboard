import { applyDecorators } from '@nestjs/common';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { BigIntId } from '../../../common/validators/bigint-id.js';
import { DATE_ONLY, TIME_OF_DAY } from '../../monitoring-schedule.js';

// Optional, but never null: these columns are NOT NULL (with a default).
const IfSent = () => ValidateIf((_object, value) => value !== undefined);

// A calendar day, "YYYY-MM-DD", in the template's time zone.
const DateOnly = () =>
  applyDecorators(
    Matches(DATE_ONLY, { message: ({ property }) => `${property} must be a date as YYYY-MM-DD` }),
    IsISO8601({ strict: true }, { message: ({ property }) => `${property} must be a valid date` }),
  );

export class CreateMonitoringTemplateDto {
  /** Project id. The tenant comes from the project. */
  @BigIntId()
  project_id: string;

  /** What to check, e.g. "Check node lastcoll on smng232". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /** How to check and what counts as OK. */
  @IsOptional()
  @IsString()
  instructions?: string | null;

  /** Local times of day ("HH:mm", in `timezone`) when the check is due, every day, e.g. ["09:00", "13:00", "17:00"]. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Matches(TIME_OF_DAY, { each: true, message: 'each value in times must be a time of day as HH:mm, e.g. 09:00' })
  times: string[];

  /** IANA time zone of `times`. Defaults to Asia/Jakarta (WIB). */
  @IfSent()
  @IsString()
  @IsTimeZone()
  @MaxLength(64)
  timezone?: string;

  /** A temporary (e.g. client-requested) check, usually limited by active_from/active_until. Defaults to false. */
  @IfSent()
  @IsBoolean()
  is_temporary?: boolean;

  /** First day it is due (YYYY-MM-DD). Null: from creation. */
  @IsOptional()
  @DateOnly()
  active_from?: string | null;

  /** Last day it is due (YYYY-MM-DD). Null: open-ended. */
  @IsOptional()
  @DateOnly()
  active_until?: string | null;

  /** Defaults to true. false switches it off: no longer due, and its logs are kept. */
  @IfSent()
  @IsBoolean()
  is_active?: boolean;

  /** The client who asked for it. */
  @IsOptional()
  @BigIntId()
  client_id?: string | null;
}
