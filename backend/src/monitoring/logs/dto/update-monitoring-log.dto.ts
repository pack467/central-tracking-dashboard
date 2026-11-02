// From @nestjs/swagger (not mapped-types) so the OpenAPI schema is inherited
// along with the validators.
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMonitoringLogDto } from './create-monitoring-log.dto.js';

// The slot (template_id + scheduled_at) identifies the log and can't change;
// the result, note, evidence and ticket can be corrected.
export class UpdateMonitoringLogDto extends PartialType(
  OmitType(CreateMonitoringLogDto, ['template_id', 'scheduled_at'] as const),
  { skipNullProperties: false },
) {}
