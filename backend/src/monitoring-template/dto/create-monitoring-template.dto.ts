import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Matches,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMonitoringTemplateDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'project_id harus berupa angka' })
  project_id: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'tenant_id harus berupa angka' })
  tenant_id?: string | null;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  instructions?: string | null;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'setiap item monitoring harus berformat HH:mm (contoh: 08:30)',
  })
  times: string;

  @IsNotEmpty()
  @IsString()
  timezone: string;

  @IsNotEmpty()
  @IsBoolean()
  is_temporary: boolean;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  active_from: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  active_until?: Date | null;

  @IsNotEmpty()
  @IsBoolean()
  is_active: boolean;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'client_id harus berupa angka' })
  client_id?: string | null;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]+$/, { message: 'created_by harus berupa angka' })
  created_by?: string | null;

  @IsOptional()
  @IsISO8601()
  created_at?: string | null;

  @IsOptional()
  @IsISO8601()
  updated_at?: string | null;
}
