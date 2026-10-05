import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TicketCategoriesService } from './categories/ticket-categories.service.js';
import { TicketSeveritiesService } from './severities/ticket-severities.service.js';

describe('Ticket categories and severities', () => {
  let categories: TicketCategoriesService;
  let severities: TicketSeveritiesService;
  const model = () => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  });
  const prisma = { ticketCategory: model(), ticketSeverity: model(), ticketLog: { count: vi.fn() } };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketCategoriesService,
        TicketSeveritiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    categories = module.get(TicketCategoriesService);
    severities = module.get(TicketSeveritiesService);
  });

  it('rejects a duplicate category name, case-insensitively', async () => {
    prisma.ticketCategory.findFirst.mockResolvedValue({ id: 3n });
    await expect(categories.create({ name: 'others' })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.ticketCategory.findFirst.mock.calls[0][0].where.name).toEqual({
      equals: 'others',
      mode: 'insensitive',
    });
  });

  it('allows renaming a category to its own name', async () => {
    prisma.ticketCategory.findUnique.mockResolvedValue({ id: 3n });
    prisma.ticketCategory.findFirst.mockResolvedValue(null);
    await categories.update(3n, { name: 'Others' });
    expect(prisma.ticketCategory.findFirst.mock.calls[0][0].where.id).toEqual({ not: 3n });
    expect(prisma.ticketCategory.update).toHaveBeenCalled();
  });

  it('refuses to delete a category still used by tickets', async () => {
    prisma.ticketCategory.findUnique.mockResolvedValue({ id: 3n });
    prisma.ticketLog.count.mockResolvedValue(42);
    await expect(categories.remove(3n)).rejects.toThrow('used by 42 tickets');
    expect(prisma.ticketCategory.delete).not.toHaveBeenCalled();
  });

  it('deletes an unused category', async () => {
    prisma.ticketCategory.findUnique.mockResolvedValue({ id: 8n });
    prisma.ticketLog.count.mockResolvedValue(0);
    await categories.remove(8n);
    expect(prisma.ticketCategory.delete).toHaveBeenCalledWith({ where: { id: 8n } });
  });

  it('returns 404 for a missing severity', async () => {
    prisma.ticketSeverity.findUnique.mockResolvedValue(null);
    await expect(severities.findOne(9n)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a duplicate severity code', async () => {
    prisma.ticketSeverity.findFirst.mockResolvedValue({ id: 3n });
    await expect(severities.create({ code_name: 'HIGH', name: 'High' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('refuses to delete a severity still used by tickets', async () => {
    prisma.ticketSeverity.findUnique.mockResolvedValue({ id: 2n });
    prisma.ticketLog.count.mockResolvedValue(5);
    await expect(severities.remove(2n)).rejects.toBeInstanceOf(ConflictException);
  });
});
