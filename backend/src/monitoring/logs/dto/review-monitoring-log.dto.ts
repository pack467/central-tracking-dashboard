import { IsOptional, IsString } from 'class-validator';

export class ReviewMonitoringLogDto {
  /** Optional remark from the reviewer. */
  @IsOptional()
  @IsString()
  review_note?: string | null;
}
