import { loadSessionConfig, parseDuration } from './session.config.js';

const SECRET = 'x'.repeat(32);
const env = (vars: Record<string, string>) => (key: string) => vars[key];

describe('session config', () => {
  it('parses durations that have a unit', () => {
    expect(parseDuration('30m', 'X')).toBe(1_800_000);
    expect(parseDuration('12h', 'X')).toBe(43_200_000);
    expect(parseDuration('7d', 'X')).toBe(604_800_000);
    expect(parseDuration(' 90s ', 'X')).toBe(90_000);
  });

  it.each(['12', '', '0h', '-1h', '1.5h', '1w', 'abc'])('rejects the duration %j', (value) => {
    expect(() => parseDuration(value, 'SESSION_MAX_AGE')).toThrow(/SESSION_MAX_AGE/);
  });

  it('defaults to a 12h absolute lifetime, no idle timeout, non-secure cookies outside production', () => {
    expect(loadSessionConfig(env({ SESSION_SECRET: SECRET }))).toEqual({
      secrets: [SECRET],
      maxAgeMs: 43_200_000,
      idleTimeoutMs: null,
      secureCookie: false,
    });
  });

  it('reads the idle timeout, several secrets (rotation) and secure cookies in production', () => {
    const older = 'y'.repeat(40);
    expect(
      loadSessionConfig(
        env({
          SESSION_SECRET: `${SECRET}, ${older}`,
          SESSION_MAX_AGE: '8h',
          SESSION_IDLE_TIMEOUT: '30m',
          NODE_ENV: 'production',
        }),
      ),
    ).toEqual({ secrets: [SECRET, older], maxAgeMs: 28_800_000, idleTimeoutMs: 1_800_000, secureCookie: true });
  });

  it.each([
    ['a missing', {}],
    ['a too short', { SESSION_SECRET: 'short' }],
    ['one too short', { SESSION_SECRET: `${SECRET},short` }],
  ])('refuses to start with %s secret', (_case, vars: Record<string, string>) => {
    expect(() => loadSessionConfig(env(vars))).toThrow(/SESSION_SECRET/);
  });

  it('refuses an idle timeout longer than the max age', () => {
    expect(() =>
      loadSessionConfig(env({ SESSION_SECRET: SECRET, SESSION_MAX_AGE: '1h', SESSION_IDLE_TIMEOUT: '2h' })),
    ).toThrow(/SESSION_IDLE_TIMEOUT/);
  });
});
