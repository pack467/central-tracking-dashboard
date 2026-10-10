import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTicketSeverityDto {
  /** Short code, e.g. "High". Must be unique (case-insensitive). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code_name: string;

  /** Display name, e.g. "High". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class UpdateTicketSeverityDto extends PartialType(CreateTicketSeverityDto, { skipNullProperties: false }) {}

// Response shape, for documentation only.
export class TicketSeverity {
  @ApiProperty({ example: '3' }) id: string;
  @ApiProperty({ type: String, nullable: true, example: 'High' }) code_name: string | null;
  @ApiProperty({ type: String, nullable: true, example: 'High' }) name: string | null;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}
