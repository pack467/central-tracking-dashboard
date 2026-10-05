import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTicketSeverityDto, UpdateTicketSeverityDto } from './dto/ticket-severity.dto.js';

@Injectable()
export class TicketSeveritiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.ticketSeverity.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: bigint) {
    const severity = await this.prisma.ticketSeverity.findUnique({ where: { id } });
    if (!severity) throw new NotFoundException(`Ticket severity #${id} not found`);
    return severity;
  }

  async create(dto: CreateTicketSeverityDto) {
    await this.assertCodeFree(dto.code_name);
    return this.prisma.ticketSeverity.create({ data: dto });
  }

  async update(id: bigint, dto: UpdateTicketSeverityDto) {
    await this.findOne(id);
    if (dto.code_name !== undefined) await this.assertCodeFree(dto.code_name, id);
    return this.prisma.ticketSeverity.update({ where: { id }, data: dto });
  }

  async remove(id: bigint) {
    await this.findOne(id);
    const used = await this.prisma.ticketLog.count({ where: { severity_id: id } });
    if (used) throw new ConflictException(`Ticket severity #${id} is used by ${used} tickets`);
    return this.prisma.ticketSeverity.delete({ where: { id } });
  }

  private async assertCodeFree(codeName: string, exceptId?: bigint) {
    const clash = await this.prisma.ticketSeverity.findFirst({
      where: {
        code_name: { equals: codeName, mode: 'insensitive' },
        ...(exceptId && { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`A ticket severity with code "${codeName}" already exists`);
  }
}
