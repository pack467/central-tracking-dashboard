// From @nestjs/swagger (not mapped-types) so the OpenAPI schema is inherited
// along with the validators.
import { PartialType } from '@nestjs/swagger';
import { CreateTicketDto } from './create-ticket.dto.js';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {}
