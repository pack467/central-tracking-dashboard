import { BadRequestException } from '@nestjs/common';
import { ParseBigIntPipe } from './parse-bigint.pipe.js';

describe('ParseBigIntPipe', () => {
  const pipe = new ParseBigIntPipe();

  it('parses ids beyond Number.MAX_SAFE_INTEGER exactly', () => {
    expect(pipe.transform('9007199254740993')).toBe(9007199254740993n);
  });

  it.each(['abc', '-1', '1.5', '', '1e3'])('rejects "%s"', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
