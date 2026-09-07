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
  const shiftAccent: StatAccentColor = activeShift.id === "subuh" ? "gray" : activeShift.id === "pagi" ? "amber" : "purple";
  const total         = members.length;
  const activeNow     = members.filter((m) => m.status === "Active" || m.status === "On Break").length;
  const onLeaveCount  = members.filter((m) => m.status === "On Leave").length;
  const offDutyCount  = members.filter((m) => m.status === "Off Duty").length;
  const onLeaveOrOff  = onLeaveCount + offDutyCount;
  const pendingSwaps  = swapRequests.filter((s) => s.status === "Pending").length;

  const operatorCount    = members.filter((m) => m.role === "Operator NOC").length;
  const leadCount        = members.filter((m) => m.role === "Shift Lead" || m.role === "Incident Coordinator").length;
  const specialistCount  = members.filter((m) => m.role === "L2 Specialist" || m.role === "Infrastructure Engineer").length;

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
    <section className="roster-metrics-grid" aria-label="Ringkasan statistik tim">

      {/* 1. TOTAL MEMBERS */}
      <StatCard
        label="TOTAL MEMBERS"
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
        badgeText="Full NOC Roster"
        badgeTone="blue"
      />

      {/* 2. ACTIVE ON SHIFT */}
      <StatCard
        label="ACTIVE ON SHIFT"
        value={activeNow}
        accentColor={shiftAccent}
        icon={<Activity size={15} strokeWidth={2} />}
        subtitle={`${activeShift.label} · ${activeShift.period}`}
        progress={{ value: quorumPct, color: activeShift.color }}
        badgeText={quorumPct >= 100 ? "100% Minimum Quorum" : `${quorumPct}% Quorum`}
        badgeTone={shiftAccent}
      />

      {/* 3. OFF / ON LEAVE TODAY */}
      <StatCard
        label="OFF / ON LEAVE TODAY"
        value={onLeaveOrOff}
        accentColor="amber"
        icon={<Coffee size={15} strokeWidth={2} />}
        subtitle={`${onLeaveCount} On Leave · ${offDutyCount} Off Duty`}
        progress={{
          value: leavePct,
          segments: [
            { label: "On Leave", percentage: leavePct, color: "#fbbf24" },
            { label: "Off Duty", percentage: offPct,   color: "#475569" },
          ],
        }}
        badgeText={onLeaveCount > 0 ? `${onLeaveCount} Planned Leave` : "Resting & Standby"}
        badgeTone="amber"
      />

      {/* 4. SHIFT SWAPS */}
      <StatCard
        label="SHIFT SWAPS (NEXT 24H)"
        value={pendingSwaps}
        accentColor={pendingSwaps > 0 ? "rose" : "blue"}
        icon={<ArrowRightLeft size={15} strokeWidth={2} />}
        subtitle={pendingSwaps > 0 ? `${pendingSwaps} request pending review` : "Semua shift terkonfirmasi"}
        badgeText={pendingSwaps > 0 ? "Needs Approval" : "Roster Sync OK"}
        badgeTone={pendingSwaps > 0 ? "rose" : "neutral"}
        isClickable
        onClick={onOpenSwaps}
        ariaLabel="Lihat permintaan tukar shift"
      />

    </section>
  );
}
