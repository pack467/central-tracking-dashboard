import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTicketCategoryDto {
  /** Must be unique (case-insensitive). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateTicketCategoryDto extends PartialType(CreateTicketCategoryDto, { skipNullProperties: false }) {}

// Response shape, for documentation only.
export class TicketCategory {
  @ApiProperty({ example: '3' }) id: string;
  @ApiProperty({ type: String, nullable: true, example: 'Incident & Issue Handling' }) name: string | null;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}
