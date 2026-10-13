import { parseOrigins, parseTrustProxy } from './http-env.js';

describe('HTTP env settings', () => {
  it('splits CORS_ORIGIN on commas and drops blanks', () => {
    expect(parseOrigins(' http://a.test , http://b.test,,')).toEqual(['http://a.test', 'http://b.test']);
    expect(parseOrigins(undefined)).toEqual([]);
  });

  it.each([
    [undefined, undefined],
    ['', undefined],
    ['false', undefined],
    ['true', true],
    ['1', 1],
    ['loopback', 'loopback'],
    ['10.0.0.0/8, 127.0.0.1', '10.0.0.0/8, 127.0.0.1'],
  ])('maps TRUST_PROXY=%j to %j', (value, expected) => {
    expect(parseTrustProxy(value)).toEqual(expected);
  });
});
