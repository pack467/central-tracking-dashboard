import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTicketCategoryDto, UpdateTicketCategoryDto } from './dto/ticket-category.dto.js';

@Injectable()
export class TicketCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.ticketCategory.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: bigint) {
    const category = await this.prisma.ticketCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Ticket category #${id} not found`);
    return category;
  }

  async create(dto: CreateTicketCategoryDto) {
    await this.assertNameFree(dto.name);
    return this.prisma.ticketCategory.create({ data: dto });
  }

  async update(id: bigint, dto: UpdateTicketCategoryDto) {
    await this.findOne(id);
    if (dto.name !== undefined) await this.assertNameFree(dto.name, id);
    return this.prisma.ticketCategory.update({ where: { id }, data: dto });
  }

  async remove(id: bigint) {
    await this.findOne(id);
    const used = await this.prisma.ticketLog.count({ where: { category_id: id } });
    if (used) throw new ConflictException(`Ticket category #${id} is used by ${used} tickets`);
    return this.prisma.ticketCategory.delete({ where: { id } });
  }

  private async assertNameFree(name: string, exceptId?: bigint) {
    const clash = await this.prisma.ticketCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`A ticket category named "${name}" already exists`);
  }
}
