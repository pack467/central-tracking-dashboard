import { ApiProperty } from '@nestjs/swagger';

// Response shapes, for documentation only. BigInt ids are serialised as strings.
// Class names are prefixed so they don't clash with other modules' schemas.

export class MonitoringNamedRef {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;
}

export class MonitoringProjectRef extends MonitoringNamedRef {
  @ApiProperty({ type: String, nullable: true, example: 'SM' })
  code_prefix: string | null;
}

export class MonitoringUserRef extends MonitoringNamedRef {
  @ApiProperty({ type: String, nullable: true })
  email: string | null;
}

export class MonitoringTemplate {
  @ApiProperty({ example: '12' })
  id: string;

  @ApiProperty({ example: '1' }) project_id: string;
  @ApiProperty({ example: 'Check node lastcoll on smng232' }) name: string;
  @ApiProperty({ type: String, nullable: true }) instructions: string | null;

  @ApiProperty({ example: '09:00', description: 'Local time of day (HH:mm) in `timezone`' })
  times: string;

  @ApiProperty({ example: 'Asia/Jakarta' }) timezone: string;
  @ApiProperty() is_temporary: boolean;
  @ApiProperty({ type: Date, nullable: true, description: 'First day it is due (date part)' }) active_from: Date | null;
  @ApiProperty({ type: Date, nullable: true, description: 'Last day it is due (date part)' }) active_until: Date | null;
  @ApiProperty() is_active: boolean;
  @ApiProperty({ type: String, nullable: true }) client_id: string | null;
  @ApiProperty({ type: String, nullable: true }) user_creator_id: string | null;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;

  @ApiProperty({ type: MonitoringProjectRef }) project: MonitoringProjectRef;
  @ApiProperty({ type: MonitoringNamedRef, nullable: true }) client: MonitoringNamedRef | null;
  @ApiProperty({ type: MonitoringUserRef, nullable: true, description: 'Who created it' }) creator: MonitoringUserRef | null;
}

export class MonitoringPageMeta {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 42 }) total: number;
  @ApiProperty({ example: 3 }) total_pages: number;
}

export class MonitoringTemplatePage {
  @ApiProperty({ type: [MonitoringTemplate] }) data: MonitoringTemplate[];
  @ApiProperty() meta: MonitoringPageMeta;
}
