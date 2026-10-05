import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;
  // Terminus tries the MongoDB ping first and falls back to SELECT 1 when
  // Prisma rejects it the way a PostgreSQL client does.
  const prisma = { $runCommandRaw: vi.fn(), $queryRawUnsafe: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$runCommandRaw.mockRejectedValue(
      new Error('Use the mongodb provider to run raw commands'),
    );
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('health is ok when the database answers', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' } },
    });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });

  it('health fails with 503 when the database is down', async () => {
    prisma.$queryRawUnsafe.mockRejectedValue(new Error('connection refused'));
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('readiness is ok without touching the database', async () => {
    prisma.$queryRawUnsafe.mockRejectedValue(new Error('connection refused'));
    await expect(controller.ready()).resolves.toMatchObject({ status: 'ok' });
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(prisma.$runCommandRaw).not.toHaveBeenCalled();
  });
});
