import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Login sessions end to end, against the real DB. A temporary VIEWER logs in
// from several "devices": supertest agents keep cookies the way a browser does.
// The tests run in order and share state. Login is limited to 5 per minute.
describe('Login sessions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: bigint | undefined;
  const email = `e2e-session-${Date.now()}@example.test`;
  const password = 'first-pass-123';
  const newPassword = 'second-pass-456';

  const device = () => request.agent(app.getHttpServer());
  type Device = ReturnType<typeof device>;
  const login = (d: Device, pass = password) => d.post('/auth/login').send({ identifier: email, password: pass });
  const cookie = (res: request.Response, name: string) =>
    ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`));

  let laptop: Device;
  let phone: Device;
  let csrf: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    const viewer = await prisma.userRole.findFirstOrThrow({ where: { name: 'VIEWER' } });
    const user = await prisma.user.create({
      data: { name: 'E2E session test', email, role_id: viewer.id, password: await bcrypt.hash(password, 4) },
      select: { id: true },
    });
    userId = user.id;
    laptop = device();
    phone = device();
  });

  afterAll(async () => {
    // Its sessions go with it (ON DELETE CASCADE).
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('rejects a wrong password without starting a session', async () => {
    const res = await login(device(), 'wrong-pass-000').expect(401);
    expect(cookie(res, 'ctd.sid')).toBeUndefined();
  });

  it('refuses a login sent from a page on another site', async () => {
    await device()
      .post('/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ identifier: email, password })
      .expect(403);
  });

  it('logs in: httpOnly session cookie, readable CSRF cookie, the user and the CSRF token', async () => {
    const res = await login(laptop).expect(200);

    expect(cookie(res, 'ctd.sid')).toMatch(/HttpOnly/i);
    expect(cookie(res, 'ctd.sid')).toMatch(/SameSite=Lax/i);
    expect(cookie(res, 'ctd.csrf')).not.toMatch(/HttpOnly/i);
    expect(res.body.user).toMatchObject({ email, role: 'VIEWER' });
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.csrf_token).toMatch(/^[\w-]{43}$/);
    csrf = res.body.csrf_token;
  });

  it('authenticates later requests with the cookie alone', async () => {
    await laptop.get('/auth/me').expect(200).expect((res) => expect(res.body.email).toBe(email));
    await device().get('/auth/me').expect(401);
    await laptop.get('/auth/csrf').expect(200, { csrf_token: csrf });
  });

  it('refuses a write without the right X-CSRF-Token', async () => {
    await laptop.post('/auth/logout').expect(403);
    await laptop.post('/auth/logout').set('X-CSRF-Token', 'not-the-token').expect(403);
    await laptop.get('/auth/me').expect(200); // still logged in
  });

  it('changing the password logs out the other device and keeps this one (new id, same CSRF token)', async () => {
    await login(phone).expect(200);
    await phone.get('/auth/me').expect(200);

    const res = await laptop
      .patch('/auth/password')
      .set('X-CSRF-Token', csrf)
      .send({ current_password: password, new_password: newPassword })
      .expect(204);
    expect(cookie(res, 'ctd.sid')).toBeDefined(); // rotated session id

    await phone.get('/auth/me').expect(401);
    await laptop.get('/auth/me').expect(200);
    await laptop.get('/auth/csrf').expect(200, { csrf_token: csrf });
  });

  it('lists your sessions and ends another device by id', async () => {
    await login(phone, newPassword).expect(200);

    const { body: sessions } = await laptop.get('/auth/sessions').expect(200);
    expect(sessions).toHaveLength(2);
    expect(sessions.filter((s: { current: boolean }) => s.current)).toHaveLength(1);
    expect(sessions[0].sid).toBeUndefined(); // never exposed
    const other = sessions.find((s: { current: boolean }) => !s.current);

    await laptop.delete(`/auth/sessions/${other.id}`).set('X-CSRF-Token', csrf).expect(204);
    await phone.get('/auth/me').expect(401);
    await laptop.get('/auth/me').expect(200);
  });

  it('logout-all ends every session and leaves no rows behind', async () => {
    await login(phone, newPassword).expect(200);

    const res = await laptop.post('/auth/logout-all').set('X-CSRF-Token', csrf).expect(204);
    expect(cookie(res, 'ctd.sid')).toMatch(/Expires=Thu, 01 Jan 1970/);

    await laptop.get('/auth/me').expect(401);
    await phone.get('/auth/me').expect(401);
    expect(await prisma.userSession.count({ where: { user_id: userId } })).toBe(0);
  });
});
