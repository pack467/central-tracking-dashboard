import { apiModuleEnabled, getApiConfig } from "@/app/lib/config";
import { paths } from "@/app/lib/routes";
import { peopleFromBackend, rolesFromBackend } from "@/app/services/backend-team";

const LOCAL_ONLY = "hanya tersimpan di browser ini, tidak dibagikan ke operator lain, dan hilang kalau data browser dibersihkan.";

/**
 * While the app is partly connected to the backend, the pages that are not connected keep their data in this browser. They look the same as
 * connected pages, so each one says so. Returns null for connected pages, and for an app that is fully mock (nothing is connected) or
 * fully connected (nothing to warn about).
 */
export function localDataNotice(pathname: string): string | null {
  if (!apiModuleEnabled("auth") || !getApiConfig().useMock) return null;
  const page = `/${pathname.split("/")[1] ?? ""}`;
  switch (page) {
    case paths.masterData: {
      const connected = [peopleFromBackend() && "Personel", rolesFromBackend() && "Peran"].filter(Boolean).join(" dan ");
      return `${connected ? `Selain ${connected}, ` : ""}Master Data belum tersambung ke backend: datanya ${LOCAL_ONLY}`;
    }
    case paths.dashboard: return `Memo & Catatan Shift dan List Monitoring Shift belum tersambung ke backend: ${LOCAL_ONLY}`;
    case paths.monitoring: return `Data monitoring belum tersambung ke backend: ${LOCAL_ONLY}`;
    case paths.shiftLog: return `Shift Log dan handover belum tersambung ke backend: ${LOCAL_ONLY}`;
    default: return null;
  }
}
