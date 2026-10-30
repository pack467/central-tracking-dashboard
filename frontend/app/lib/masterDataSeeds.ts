/**
 * Central Tracking Dashboard - Initial Master Data Seeds
 *
 * Mengonversi data statis eksisting (clientData.ts, data.ts) menjadi
 * entitas terstruktur (ClientOrganization, ProjectMaster, SystemMaster).
 *
 * PRINSIP:
 * - Data seed = data yang ada SEKARANG persis (klien, proyek, sistem, urutan).
 * - Relasi memakai ID, bukan nama/kode.
 * - Id dibuat sekali (slug + prefix unik), stabil.
 */

import type { ClientOrganization, ProjectMaster, SystemMaster } from "@/app/types/master-data";
import { CLIENT_PROJECTS, CLIENT_SYSTEMS } from "@/app/lib/clientData";

// Helper timestamp ISO 8601 tetap untuk seed
const SEED_TIMESTAMP = "2026-10-15T00:00:00.000Z";

const RAW_CLIENT_SEEDS: Array<{
  id: string;
  name: string;
  shortName: string;
  code: string;
  tagline: string;
  avatarBg: string;
  tier: "Enterprise NOC" | "Mission Critical" | "Dedicated SLA";
}> = [
  { id: "tritronik", name: "PT Tritronik Solusindo", shortName: "Tritronik", code: "TRIT", tagline: "Internal Operations & Service Platform", avatarBg: "linear-gradient(135deg, #0284c7, #0369a1)", tier: "Enterprise NOC" },
  { id: "bni", name: "PT Bank Negara Indonesia (Persero) Tbk", shortName: "BNI", code: "BNI", tagline: "Digital Banking & Enterprise Integration", avatarBg: "linear-gradient(135deg, #f97316, #ea580c)", tier: "Mission Critical" },
  { id: "telkomsel", name: "PT Telekomunikasi Selular", shortName: "Telkomsel", code: "TSEL", tagline: "Mobile Telecommunication Network Operations", avatarBg: "linear-gradient(135deg, #ef4444, #dc2626)", tier: "Mission Critical" },
  { id: "mandiri", name: "PT Bank Mandiri (Persero) Tbk", shortName: "Bank Mandiri", code: "BMRI", tagline: "Wholesale & Digital Banking Services", avatarBg: "linear-gradient(135deg, #0284c7, #1e40af)", tier: "Mission Critical" },
  { id: "bca", name: "PT Bank Central Asia Tbk", shortName: "BCA", code: "BCA", tagline: "Transaction Banking & Settlement Systems", avatarBg: "linear-gradient(135deg, #2563eb, #1d4ed8)", tier: "Mission Critical" },
  { id: "indosat", name: "PT Indosat Tbk", shortName: "Indosat Ooredoo Hutchison", code: "ISAT", tagline: "Mobile & Enterprise Network Operations", avatarBg: "linear-gradient(135deg, #eab308, #ca8a04)", tier: "Dedicated SLA" },
  { id: "xl", name: "PT XL Axiata Tbk", shortName: "XL Axiata", code: "EXCL", tagline: "Convergence & Enterprise Network Services", avatarBg: "linear-gradient(135deg, #06b6d4, #0891b2)", tier: "Dedicated SLA" },
  { id: "pertamina", name: "PT Pertamina Patra Niaga", shortName: "Pertamina Patra Niaga", code: "PERT", tagline: "Downstream Energy Distribution Monitoring", avatarBg: "linear-gradient(135deg, #10b981, #059669)", tier: "Dedicated SLA" },
];

export const SEED_MASTER_CLIENTS: ClientOrganization[] = RAW_CLIENT_SEEDS.map((c) => {
  // Mapping PIC dan info default untuk klien eksisting
  const picMap: Record<string, { picName: string; picEmail: string; picPhone: string; desc: string }> = {
    tritronik: {
      picName: "Mhd. Galih Khairi",
      picEmail: "pic.contoh@example.com",
      picPhone: "+62 811-0000-0010",
      desc: "Telecommunications & Digital Services Operations Platform",
    },
    bni: {
      picName: "Kristina Marbun",
      picEmail: "kristina.marbun@bni.co.id",
      picPhone: "+62 811-0000-0022",
      desc: "Core Banking, Payment Switcher & OpenBanking API Network",
    },
    telkomsel: {
      picName: "Muhammad Ihsanul Arifin",
      picEmail: "ihsanul.arifin@telkomsel.co.id",
      picPhone: "+62 811-0000-0036",
      desc: "OCS Billing, Core 5G Edge & Digital Subscriber Network Infrastructure",
    },
    mandiri: {
      picName: "Agnes Siahaan",
      picEmail: "agnes.siahaan@bankmandiri.co.id",
      picPhone: "+62 811-0000-0044",
      desc: "Core Banking, Livin' Financial Superapp & Wholesale Kopra",
    },
    bca: {
      picName: "Pangondian Kurniawan",
      picEmail: "pangondian.k@bca.co.id",
      picPhone: "+62 811-0000-0051",
      desc: "High-Volume Switcher, myBCA & Real-Time Settlement Network",
    },
    indosat: {
      picName: "Dimas Pratama",
      picEmail: "dimas.pratama@ioh.co.id",
      picPhone: "+62 811-0000-0068",
      desc: "National 4G/5G Transport & Enterprise Data Services",
    },
    xl: {
      picName: "Rian Hidayat",
      picEmail: "rian.hidayat@xl.co.id",
      picPhone: "+62 811-0000-0071",
      desc: "Mobile Convergence, Fiber Backbone & B2B Solutions",
    },
    pertamina: {
      picName: "Budi Santoso",
      picEmail: "budi.santoso@pertamina.com",
      picPhone: "+62 811-0000-0086",
      desc: "Industrial SCADA, Downstream Fuel IoT & Enterprise Cloud",
    },
  };

  const pic = picMap[c.id] || {
    picName: "Operator NOC",
    picEmail: `noc@${c.id}.internal`,
    picPhone: "+62 811-0000-0000",
    desc: c.tagline || "Enterprise Managed Service",
  };

  return {
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    code: c.code,
    tagline: c.tagline,
    avatarBg: c.avatarBg,
    tier: c.tier as ClientOrganization["tier"],
    status: "active",
    picName: pic.picName,
    picEmail: pic.picEmail,
    picPhone: pic.picPhone,
    description: pic.desc,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    systemsCount: 0,
  };
});

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Generate project masters from existing CLIENT_PROJECTS
export const SEED_MASTER_PROJECTS: ProjectMaster[] = (() => {
  const result: ProjectMaster[] = [];

  for (const [clientId, projList] of Object.entries(CLIENT_PROJECTS)) {
    for (const p of projList) {
      const code = p.name.split(" ")[0].toUpperCase();
      result.push({
        id: `proj-${clientId}-${slugify(p.name)}`,
        clientId,
        name: p.name,
        fullName: p.detail ? `${p.name} - ${p.detail}` : p.name,
        code: code.slice(0, 10),
        detail: p.detail || "Operational Service",
        leadEngineer: "NOC Lead Specialist",
        healthDefault: p.tone === "warning" ? "degraded" : "healthy",
        status: "active",
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      });
    }
  }

  return result;
})();

// Generate system masters from existing CLIENT_SYSTEMS
export const SEED_MASTER_SYSTEMS: SystemMaster[] = (() => {
  const result: SystemMaster[] = [];

  for (const [clientId, sysList] of Object.entries(CLIENT_SYSTEMS)) {
    for (const sysName of sysList) {
      // Find matching project in this client or fallback to first project
      const matchingProject =
        SEED_MASTER_PROJECTS.find(
          (p) => p.clientId === clientId && (p.name.includes(sysName) || sysName.includes(p.name)),
        ) ||
        SEED_MASTER_PROJECTS.find((p) => p.clientId === clientId) ||
        SEED_MASTER_PROJECTS[0];

      result.push({
        id: `sys-${clientId}-${matchingProject.id}-${slugify(sysName)}`,
        clientId,
        projectId: matchingProject.id,
        name: sysName,
        criticality: "high",
        environment: "Production",
        status: "active",
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      });
    }
  }

  return result;
})();
