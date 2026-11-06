"use client";

import { Users, Activity, Coffee, ArrowRightLeft } from "lucide-react";
import { StatCard, type StatAccentColor } from "@/app/components/ui/StatCard";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import type { RosterMember, ShiftSwapRequest } from "@/app/lib/types";

interface RosterStatCardsProps {
  members: RosterMember[];
  swapRequests: ShiftSwapRequest[];
  onOpenSwaps: () => void;
}

export function RosterStatCards({ members, swapRequests, onOpenSwaps }: RosterStatCardsProps) {
  const activeShift = useActiveShift();
  const shiftAccent: StatAccentColor = activeShift.id === "subuh" ? "blue" : activeShift.id === "pagi" ? "amber" : "purple";
  const total         = members.length;
  const activeNow     = members.filter((m) => m.status === "Active" || m.status === "On Break").length;
  const onLeaveCount  = members.filter((m) => m.status === "On Leave").length;
  const offDutyCount  = members.filter((m) => m.status === "Off Duty").length;
  const onLeaveOrOff  = onLeaveCount + offDutyCount;
  const pendingSwaps  = swapRequests.filter((s) => s.status === "Pending").length;

  // Statistics compare the stable role key, so renaming a role's display name never changes the counts.
  const roleOf = (m: RosterMember) => m.roleKey ?? m.role;
  const operatorCount    = members.filter((m) => roleOf(m) === "Operator NOC").length;
  const leadCount        = members.filter((m) => roleOf(m) === "Shift Lead" || roleOf(m) === "Incident Coordinator").length;
  const specialistCount  = members.filter((m) => roleOf(m) === "L2 Specialist" || roleOf(m) === "Infrastructure Engineer").length;

  // Quorum: minimum required = 4
  const minQuorum  = 4;
  const quorumPct  = Math.min(100, Math.round((activeNow / minQuorum) * 100));

  // Role breakdown percentages (for segment bar)
  const opPct    = total > 0 ? Math.round((operatorCount   / total) * 100) : 60;
  const leadPct  = total > 0 ? Math.round((leadCount       / total) * 100) : 20;
  const specPct  = Math.max(0, 100 - opPct - leadPct);

  // Leave / off split
  const leavePct = onLeaveOrOff > 0 ? Math.round((onLeaveCount / onLeaveOrOff) * 100) : 0;
  const offPct   = 100 - leavePct;

  return (
    <section
      className="grid grid-cols-2 gap-3 min-[1140px]:grid-cols-4 min-[1140px]:gap-4 [&_.sc]:h-full [&_.sc-footer]:mt-auto max-sm:gap-2 max-sm:[&_.sc]:p-3 max-sm:[&_.sc]:gap-1.5 max-sm:[&_.sc-subtitle]:hidden max-sm:[&_.sc-value]:text-[26px] max-sm:[&_.sc-icon]:size-6 max-sm:[&_.sc-label]:text-[9px] max-sm:[&_.sc-label]:tracking-[0.5px] max-sm:[&_.sc-hint]:hidden"
      aria-label="Ringkasan statistik tim"
    >

      {/* 1. TOTAL MEMBERS */}
      <StatCard
        label="TOTAL ANGGOTA"
        value={total}
        accentColor="blue"
        icon={<Users size={15} strokeWidth={2} />}
        subtitle={`${operatorCount} Ops · ${leadCount} Leads · ${specialistCount} Specialists`}
        progress={{
          value: opPct,
          segments: [
            { label: "Ops",         percentage: opPct,   color: "#38bdf8" },
            { label: "Leads",       percentage: leadPct, color: "#3b82f6" },
            { label: "Specialists", percentage: specPct, color: "#a855f7" },
          ],
        }}
        badgeText={`${total} orang`}
        badgeTone="blue"
      />

      {/* 2. ACTIVE ON SHIFT */}
      <StatCard
        label="SEDANG BERTUGAS"
        value={activeNow}
        accentColor={shiftAccent}
        icon={<Activity size={15} strokeWidth={2} />}
        subtitle={`${activeShift.label} · ${activeShift.period}`}
        progress={{ value: quorumPct, color: activeShift.color }}
        badgeText={`${quorumPct}% kuorum`}
        badgeTone={shiftAccent}
      />

      {/* 3. OFF / ON LEAVE TODAY */}
      <StatCard
        label="LIBUR / CUTI"
        value={onLeaveOrOff}
        accentColor="amber"
        icon={<Coffee size={15} strokeWidth={2} />}
        subtitle={`${onLeaveCount} cuti · ${offDutyCount} libur hari ini`}
        progress={{
          value: leavePct,
          segments: [
            { label: "On Leave", percentage: leavePct, color: "#fbbf24" },
            { label: "Off Duty", percentage: offPct,   color: "#475569" },
          ],
        }}
        badgeText={onLeaveCount > 0 ? `${onLeaveCount} cuti` : "Standby"}
        badgeTone="amber"
      />

      {/* 4. SHIFT SWAPS */}
      <StatCard
        label="TUKAR SHIFT"
        value={pendingSwaps}
        accentColor={pendingSwaps > 0 ? "rose" : "blue"}
        icon={<ArrowRightLeft size={15} strokeWidth={2} />}
        subtitle={pendingSwaps > 0 ? `${pendingSwaps} permintaan menunggu persetujuan` : "Semua shift terkonfirmasi"}
        badgeText={pendingSwaps > 0 ? "Perlu review" : "Sinkron"}
        badgeTone={pendingSwaps > 0 ? "rose" : "neutral"}
        isClickable
        onClick={onOpenSwaps}
        ariaLabel="Lihat permintaan tukar shift"
      />

    </section>
  );
}
