/**
 * Runbooks DTO (NestJS Ready)
 */

import type {
  SopEntry,
  SopCategory,
  SopStep,
  SopAttachment,
} from "@/app/lib/types";

export interface SopEntryDto {
  id: string;
  title: string;
  category: SopCategory;
  project?: string;
  description?: string;
  steps?: SopStep[];
  attachments?: SopAttachment[];
  externalLinks?: { label: string; url: string }[];
  updatedAt: string; // ISO 8601 string
  updatedBy: string;
}

export interface CredentialEntryDto {
  id: string;
  project: string;
  environment: "Production" | "Staging" | "Development";
  system: string;
  url: string;
  username: string;
  authType: "Password" | "SSH Key" | "Token" | "MFA";
  credentialRef: string;
  lastRotated: string;
}

export interface QuickLinkDto {
  id: string;
  title: string;
  category: "Monitoring" | "Documentation" | "Portal" | "Tool";
  url: string;
  project?: string;
  description: string;
}

export interface EscalationContactDto {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
  tier: "tier1" | "tier2" | "tier3";
  isPrimary?: boolean;
}

export function sopDtoToModel(dto: SopEntryDto): SopEntry {
  return { ...dto };
}
