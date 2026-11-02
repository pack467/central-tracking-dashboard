// From @nestjs/swagger (not mapped-types) so the OpenAPI schema is inherited
// along with the validators.
import { PartialType } from '@nestjs/swagger';
import { CreateMonitoringTemplateDto } from './create-monitoring-template.dto.js';

export class UpdateMonitoringTemplateDto extends PartialType(CreateMonitoringTemplateDto, {
  skipNullProperties: false,
}) {}
