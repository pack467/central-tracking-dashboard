import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

// For BigInt id fields in DTOs (body or query). Accepts "4" or 4 and keeps it
// as a digit string (convert with BigInt() in the service); null/undefined pass
// through so @IsOptional() and "null clears it" still work.
export function BigIntId() {
  return applyDecorators(
    Transform(({ value }) => (value === null || value === undefined ? value : String(value))),
    Matches(/^\d+$/, { message: ({ property }) => `${property} must be a positive whole number` }),
  );
}

export const toBigInt = (id: string | null | undefined) =>
  id === undefined ? undefined : id === null ? null : BigInt(id);
