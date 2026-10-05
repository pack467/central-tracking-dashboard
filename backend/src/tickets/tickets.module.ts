import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { TicketCategoriesController } from './categories/ticket-categories.controller.js';
import { TicketCategoriesService } from './categories/ticket-categories.service.js';
import { TicketSeveritiesController } from './severities/ticket-severities.controller.js';
import { TicketSeveritiesService } from './severities/ticket-severities.service.js';

@Module({
  controllers: [TicketsController, TicketCategoriesController, TicketSeveritiesController],
  providers: [TicketsService, TicketCategoriesService, TicketSeveritiesService],
})
export class TicketsModule {}
