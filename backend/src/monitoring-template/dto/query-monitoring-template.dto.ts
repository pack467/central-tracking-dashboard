import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Matches,
  IsDate,
  IsInt,
  Min,
  Max,
  MaxLength, IsIn
} from 'class-validator';


export const MONITORING_SORT_FIELDS = ['times','created_at','updated_at','id'] as const;

export class MonitoringTemplateFiltersDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'project_id harus berupa angka' })
  project_id: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'tenant_id harus berupa angka' })
  tenant_id?: string | null;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  instructions?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'setiap item monitoring harus berformat HH:mm (contoh: 08:30)',
  })
  times: string;

  @IsOptional()
  @IsString()
  timezone: string;

  @IsOptional()
  @IsBoolean()
  is_temporary: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  active_from: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  active_until?: Date | null;

  @IsOptional()
  @IsBoolean()
  is_active: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'client_id harus berupa angka' })
  client_id?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'user_creator_id harus berupa angka' })
  user_creator_id?: string | null;

  @IsOptional()
  @IsISO8601()
  created_at?: string | null;

  @IsOptional()
  @IsISO8601()
  updated_at?: string | null;
}

export class QueryMonitoringTemplateDto extends MonitoringTemplateFiltersDto{
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  project?: string;

  @IsOptional()
  @IsIn(MONITORING_SORT_FIELDS)
  sort?: (typeof MONITORING_SORT_FIELDS)[number] = 'times';

  @IsOptional()
  @IsIn(['asc','desc'])
  order?: 'asc' | 'desc' = 'asc';
}