import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

// For boolean query parameters: they arrive as the strings "true"/"false",
// which @IsBoolean() alone rejects. Anything else is left as is and fails.
export function QueryBoolean() {
  return applyDecorators(
    Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value)),
    IsBoolean({ message: ({ property }) => `${property} must be true or false` }),
  );
}
