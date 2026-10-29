/**
 * Runbooks Service (NestJS Ready with Mock Adapter)
 */

import { isMockMode } from "@/app/lib/config";
import { apiClient } from "@/app/lib/api/client";
import { mockAdapter } from "./mock-adapter";
import type { SopEntry, CredentialEntry, QuickLink, EscalationContact } from "@/app/lib/types";

export const runbooksService = {
  async getAll(signal?: AbortSignal) {
    if (isMockMode()) {
      return mockAdapter.getRunbooksData(signal);
    }

    const [sopsRes, credsRes, linksRes, escRes] = await Promise.all([
      apiClient.get<{ data: SopEntry[] }>("/runbooks/sops", { signal }),
      apiClient.get<{ data: CredentialEntry[] }>("/runbooks/credentials", { signal }),
      apiClient.get<{ data: QuickLink[] }>("/runbooks/quick-links", { signal }),
      apiClient.get<{ data: EscalationContact[] }>("/runbooks/escalations", { signal }),
    ]);

    return {
      sops: sopsRes.data || [],
      credentials: credsRes.data || [],
      quickLinks: linksRes.data || [],
      escalations: escRes.data || [],
    };
  },
};
