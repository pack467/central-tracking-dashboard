// From @nestjs/swagger (not mapped-types) so the OpenAPI schema is inherited
// along with the validators.
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(CreateUserDto, { skipNullProperties: false }) {}
