import { MASTER_STORAGE_KEY, isMasterV2, matchesLegacyProject, safeHref } from "./master-data-model";
import { SAMPLE_LINKS_BY_CLIENT } from "./monitoring-links-sample";

/**
 * The sample catalog names hosts of our own and our clients' networks, and everything in the browser bundle can be downloaded without a login.
 * So a normal production build leaves it out: the check is written in a form the bundler can evaluate, as for the demo accounts (lib/auth.tsx).
 * Such a build only offers the links it was given explicitly and the reference URLs of the systems in Master Data.
 */
const SAMPLE_CATALOG = process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN !== "true" ? null : SAMPLE_LINKS_BY_CLIENT;

export type MonitoringCategory =
  | "Grafana"
  | "ActiveMQ"
  | "Kafka"
  | "Graylog"
  | "APM"
  | "Network"
  | "Console"
  | "Storage"
  | "Portal"
  | "Other";

export interface MonitoringLinkItem {
  id: string;
  title: string;
  url: string;
  category: MonitoringCategory;
  description: string;
  isPrimary?: boolean;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "service";
}

function resolveMasterSystemLinks(
  project: string,
  task?: string,
  clientId?: string,
): MonitoringLinkItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MASTER_STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!isMasterV2(data)) return [];

    const cid = (clientId || "tritronik").toLowerCase();
    const matchedProjects = data.projects.filter(
      (p) =>
        (!clientId || p.organizationId.toLowerCase() === cid) &&
        (matchesLegacyProject(project, p.legacyKey) ||
          matchesLegacyProject(project, p.name) ||
          matchesLegacyProject(project, p.code)),
    );

    const candidateSystems = data.systems.filter((s) => {
      const href = safeHref(s.referenceUrl);
      if (!href || s.status === "archived") return false;
      if (matchedProjects.some((p) => p.id === s.projectId)) return true;
      return (
        matchesLegacyProject(project, s.name) ||
        (task ? task.toLowerCase().includes(s.name.toLowerCase()) : false)
      );
    });

    return candidateSystems.map((s, idx) => {
      let href = safeHref(s.referenceUrl) || "";
      if (href.startsWith("/") && typeof window !== "undefined") {
        href = `${window.location.origin}${href}`;
      }
      return {
        id: `master-sys-${s.id}`,
        title: `${s.name} (Master Data)`,
        url: href,
        category: "Portal" as const,
        description: s.description || `Sistem referensi ${s.name} di bawah proyek ${project}.`,
        isPrimary: idx === 0,
      };
    });
  } catch {
    return [];
  }
}

export function getMonitoringLinks(
  project: string,
  task?: string,
  clientId?: string,
  explicitUrl?: string,
): MonitoringLinkItem[] {
  const cid = (clientId || "tritronik").toLowerCase().trim();
  const projNorm = (project || "").toLowerCase().trim();
  const taskNorm = (task || "").toLowerCase().trim();

  const links: MonitoringLinkItem[] = [];
  const seenUrls = new Set<string>();

  // 1. Explicit URL passed directly
  const cleanUrl = safeHref(explicitUrl);
  if (cleanUrl) {
    links.push({
      id: "explicit-link-1",
      title: `${project} Dashboard`,
      url: cleanUrl,
      category: "Grafana",
      description: `Dashboard monitoring operasional untuk ${project}.`,
      isPrimary: true,
    });
    seenUrls.add(cleanUrl.toLowerCase());
  }

  // 2. Master Data Systems reference URLs
  const masterLinks = resolveMasterSystemLinks(project, task, clientId);
  for (const item of masterLinks) {
    if (!seenUrls.has(item.url.toLowerCase())) {
      seenUrls.add(item.url.toLowerCase());
      links.push(item);
    }
  }

  // 3. Predefined rich multi-website catalog
  const clientCatalog: Record<string, MonitoringLinkItem[]> = SAMPLE_CATALOG ? SAMPLE_CATALOG[cid] || SAMPLE_CATALOG.tritronik : {};

  // Direct exact project match
  let matchedCatalog = clientCatalog[projNorm];

  // If not exact, find by partial / aliases
  if (!matchedCatalog) {
    for (const [key, items] of Object.entries(clientCatalog)) {
      if (matchesLegacyProject(projNorm, key) || matchesLegacyProject(key, projNorm)) {
        matchedCatalog = items;
        break;
      }
    }
  }

  // If still not found, check other client catalogs as fallback
  if (!matchedCatalog) {
    for (const cat of Object.values(SAMPLE_CATALOG ?? {})) {
      if (cat[projNorm]) {
        matchedCatalog = cat[projNorm];
        break;
      }
    }
  }

  if (matchedCatalog && matchedCatalog.length > 0) {
    // If task specifies keywords (e.g. "Kafka" or "Disk" or "ActiveMQ"), prioritize that link
    const matchesKeyword = (item: MonitoringLinkItem) => {
      if (!taskNorm) return false;
      const text = `${item.title} ${item.description} ${item.category}`.toLowerCase();
      const keywords = taskNorm.split(/[\s/·,-]+/).filter((w) => w.length >= 3);
      return keywords.some((kw) => text.includes(kw));
    };

    const sortedCatalog = [...matchedCatalog].sort((a, b) => {
      const aMatchesTask = matchesKeyword(a);
      const bMatchesTask = matchesKeyword(b);
      if (aMatchesTask && !bMatchesTask) return -1;
      if (!aMatchesTask && bMatchesTask) return 1;
      return 0;
    });

    sortedCatalog.forEach((item, idx) => {
      if (!seenUrls.has(item.url.toLowerCase())) {
        seenUrls.add(item.url.toLowerCase());
        links.push({
          ...item,
          isPrimary: idx === 0,
        });
      }
    });
  }

  // 4. Sample fallback if nothing was resolved (a real build shows "no links yet" instead of an address that does not exist)
  if (links.length === 0 && SAMPLE_CATALOG) {
    const clientSlug = slugify(cid);
    const projectSlug = slugify(project);
    const fallbackUrl = `https://monitoring.${clientSlug}.internal/d/${projectSlug}`;
    links.push({
      id: `fallback-${projectSlug}`,
      title: `${project} Monitoring Dashboard`,
      url: fallbackUrl,
      category: "Grafana",
      description: `Dashboard monitoring default untuk proyek ${project}.`,
      isPrimary: true,
    });
  }

  // Ensure exactly one is marked primary if not yet
  if (links.length > 0 && !links.some((l) => l.isPrimary)) {
    links[0].isPrimary = true;
  }

  return links;
}

export function getMonitoringWebsiteUrl(
  project: string,
  task?: string,
  clientId?: string,
  explicitUrl?: string,
): string {
  const links = getMonitoringLinks(project, task, clientId, explicitUrl);
  return links[0]?.url ?? "";
}
