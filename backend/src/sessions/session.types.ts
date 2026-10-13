import 'express-session';

// What we keep in a login session (req.session), on top of express-session's
// own `cookie`. Stored as JSON in user_sessions.data.
declare module 'express-session' {
  interface SessionData {
    userId: string; // the logged-in user's id (BigInt as string)
    csrfToken: string; // expected in X-CSRF-Token on every write
    loginAt: number; // ms since epoch; the absolute expiry counts from here
    userAgent?: string;
    ip?: string;
  }
}
