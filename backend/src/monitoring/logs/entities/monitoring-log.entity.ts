import { ApiProperty } from '@nestjs/swagger';
import { MonitoringResult, TicketStatus } from '../../../generated/prisma/enums.js';
import {
  MonitoringNamedRef,
  MonitoringPageMeta,
  MonitoringProjectRef,
  MonitoringUserRef,
} from '../../templates/entities/monitoring-template.entity.js';

// Response shapes, for documentation only. BigInt ids are serialised as strings.

class MonitoringTemplateRef extends MonitoringNamedRef {
  @ApiProperty({ example: 'Asia/Jakarta' }) timezone: string;
  @ApiProperty({ type: MonitoringProjectRef }) project: MonitoringProjectRef;
}

class MonitoringTicketRef {
  @ApiProperty({ example: '3650' }) id: string;
  @ApiProperty({ type: String, nullable: true, example: 'TS-856290' }) third_party_ticket_id: string | null;
  @ApiProperty() subject: string;
  @ApiProperty({ enum: TicketStatus }) status: TicketStatus;
}

export class MonitoringLog {
  @ApiProperty({ example: '501' })
  id: string;

  @ApiProperty({ example: '12' }) template_id: string;
  @ApiProperty({ description: 'The slot that was checked, as an instant' }) scheduled_at: Date;
  @ApiProperty({ description: 'When the check was recorded' }) checked_at: Date;
  @ApiProperty({ example: '7', description: 'Who did the check' }) checked_by: string;
  @ApiProperty({ enum: MonitoringResult }) result: MonitoringResult;
  @ApiProperty({ type: String, nullable: true }) note: string | null;
  @ApiProperty({ type: String, nullable: true }) evidence_url: string | null;
  @ApiProperty({ type: String, nullable: true }) ticket_id: string | null;
  @ApiProperty({ type: String, nullable: true }) reviewed_by: string | null;
  @ApiProperty({ type: Date, nullable: true }) reviewed_at: Date | null;
  @ApiProperty({ type: String, nullable: true }) review_note: string | null;
  @ApiProperty() created_at: Date;
  @ApiProperty({ description: 'Last correction' }) updated_at: Date;

  @ApiProperty({ type: MonitoringTemplateRef }) template: MonitoringTemplateRef;
  @ApiProperty({ type: MonitoringUserRef }) checker: MonitoringUserRef;
  @ApiProperty({ type: MonitoringUserRef, nullable: true }) reviewer: MonitoringUserRef | null;
  @ApiProperty({ type: MonitoringTicketRef, nullable: true }) ticket: MonitoringTicketRef | null;
}

export class MonitoringLogPage {
  @ApiProperty({ type: [MonitoringLog] }) data: MonitoringLog[];
  @ApiProperty() meta: MonitoringPageMeta;
}
