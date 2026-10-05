import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '../../generated/prisma/enums.js';

// Response shapes, for documentation only. BigInt ids are serialised as strings.

class Ref {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;
}

class ProjectRef extends Ref {
  @ApiProperty({ type: String, nullable: true, example: 'EPC' })
  code_prefix: string | null;
}

class UserRef extends Ref {
  @ApiProperty({ type: String, nullable: true })
  email: string | null;
}

class SeverityRef extends Ref {
  @ApiProperty({ type: String, nullable: true, example: 'High' })
  code_name: string | null;
}

export class Ticket {
  @ApiProperty({ example: '3650' })
  id: string;

  @ApiProperty({ type: String, nullable: true, example: 'TS-856290' })
  third_party_ticket_id: string | null;

  @ApiProperty({ type: String, nullable: true }) project_id: string | null;
  @ApiProperty({ type: String, nullable: true }) tenant_id: string | null;
  @ApiProperty({ type: String, nullable: true }) client_id: string | null;
  @ApiProperty({ type: String, nullable: true }) user_id: string | null;
  @ApiProperty({ type: String, nullable: true }) severity_id: string | null;
  @ApiProperty({ type: String, nullable: true }) category_id: string | null;
  @ApiProperty({ type: String, nullable: true }) requester: string | null;
  @ApiProperty({ type: String, nullable: true }) subject: string | null;
  @ApiProperty({ type: String, nullable: true }) description: string | null;

  @ApiProperty({ enum: TicketStatus, nullable: true })
  status: TicketStatus | null;

  @ApiProperty({ type: Date, nullable: true }) open_at: Date | null;
  @ApiProperty({ type: Date, nullable: true }) closed_at: Date | null;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;

  @ApiProperty({ type: ProjectRef, nullable: true }) project: ProjectRef | null;
  @ApiProperty({ type: Ref, nullable: true }) tenant: Ref | null;
  @ApiProperty({ type: Ref, nullable: true }) client: Ref | null;
  @ApiProperty({ type: UserRef, nullable: true, description: 'Assignee' }) user: UserRef | null;
  @ApiProperty({ type: SeverityRef, nullable: true }) severity: SeverityRef | null;
  @ApiProperty({ type: Ref, nullable: true }) category: Ref | null;
}

class PageMeta {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 3649 }) total: number;
  @ApiProperty({ example: 183 }) total_pages: number;
}

export class TicketPage {
  @ApiProperty({ type: [Ticket] }) data: Ticket[];
  @ApiProperty() meta: PageMeta;
}

export class TicketSummary {
  @ApiProperty({ example: 3649 })
  total: number;

  @ApiProperty({
    description: 'Count per status; every status is present, 0 if none',
    example: { Open: 12, Closed: 3500, Activity: 100, Meeting: 20, Pending: 10, ReOpen: 7 },
  })
  by_status: Record<TicketStatus, number>;
}
