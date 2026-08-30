"use client";

import { lazy, startTransition, Suspense, useMemo, useState } from "react";
import { UserPlus, ArrowRightLeft, Table, Calendar, Search, X } from "lucide-react";
import { RosterStatCards } from "@/app/components/team/RosterStatCards";
import { RosterShiftCoverage } from "@/app/components/team/RosterShiftCoverage";
import { RosterTable } from "@/app/components/team/RosterTable";
import { seedRosterMembers, seedSwapRequests } from "@/app/lib/data";
import type { RosterMember, ShiftSwapRequest } from "@/app/lib/types";

const RosterCalendarView = lazy(() =>
  import("@/app/components/team/RosterCalendarView").then((module) => ({ default: module.RosterCalendarView })),
);
const ShiftSwapModal = lazy(() =>
  import("@/app/components/team/ShiftSwapModal").then((module) => ({ default: module.ShiftSwapModal })),
);
const MemberDetailDrawer = lazy(() =>
  import("@/app/components/team/MemberDetailDrawer").then((module) => ({ default: module.MemberDetailDrawer })),
);
const MemberCreateModal = lazy(() =>
  import("@/app/components/team/MemberCreateModal").then((module) => ({ default: module.MemberCreateModal })),
);

export function TeamRosterView() {
  const [members, setMembers] = useState<RosterMember[]>(seedRosterMembers);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>(seedSwapRequests);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  // Modal / Drawer states
  const [selectedMember, setSelectedMember] = useState<RosterMember | null>(null);
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapPreselectedMember, setSwapPreselectedMember] = useState<RosterMember | null>(null);

  // Filtered members calculation
  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return members.filter((m) => {
      const matchSearch =
        !needle ||
        m.name.toLowerCase().includes(needle) ||
        m.employeeId.toLowerCase().includes(needle) ||
        m.email.toLowerCase().includes(needle) ||
        m.role.toLowerCase().includes(needle);

      const matchRole = roleFilter === "All" || m.role === roleFilter;
      const matchStatus = statusFilter === "All" || m.status === statusFilter;
      const matchShift =
        shiftFilter === "All" ||
        (shiftFilter === "Pagi" && m.currentShift.includes("Pagi")) ||
        (shiftFilter === "Sore" && m.currentShift.includes("Sore")) ||
        (shiftFilter === "Malam" && m.currentShift.includes("Malam")) ||
        (shiftFilter === "Leave" && m.currentShift.includes("Leave"));

      return matchSearch && matchRole && matchStatus && matchShift;
    });
  }, [members, search, roleFilter, statusFilter, shiftFilter]);

  const handleSaveMember = (savedMember: RosterMember) => {
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === savedMember.id);
      if (exists) {
        return prev.map((m) => (m.id === savedMember.id ? savedMember : m));
      }
      return [savedMember, ...prev];
    });
  };

  const handleOpenSwapForMember = (member: RosterMember) => {
    setSwapPreselectedMember(member);
    setSwapModalOpen(true);
  };

  return (
    <>
      {/* 1. Page Header */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> OPERATIONS · NOC PERSONNEL ROSTER
          </div>
          <h1>Team Roster</h1>
          <p>Manage shift assignments, team availability, coverage quorum, and shift swap requests.</p>
        </div>

        <div className="page-actions">
          <button
            className="button button-secondary"
            onClick={() => {
              setSwapPreselectedMember(null);
              setSwapModalOpen(true);
            }}
          >
            <ArrowRightLeft size={14} /> Shift Swaps ({swapRequests.filter((r) => r.status === "Pending").length})
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              setEditingMember(null);
              setCreateModalOpen(true);
            }}
          >
            <UserPlus size={14} /> Add Team Member
          </button>
        </div>
      </section>

      {/* 2. Top Summary Stat Cards */}
      <RosterStatCards
        members={members}
        swapRequests={swapRequests}
        onOpenSwaps={() => {
          setSwapPreselectedMember(null);
          setSwapModalOpen(true);
        }}
      />

      {/* 3. Main Roster Content (2 columns: Table/Calendar & Shift Coverage Widget) */}
      <div className="dashboard-grid" style={{ marginTop: "20px" }}>
        <div className="main-column">
          <article className="panel roster-main-panel">
            {/* Toolbar: Search, Filters & View Toggle */}
            <div className="panel-heading roster-toolbar-heading">
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
                {/* Search input */}
                <div className="search-field roster-search-field">
                  <Search size={14} style={{ color: "var(--accent-blue)" }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search member name, ID, or role…"
                    aria-label="Cari anggota tim"
                  />
                  {search && (
                    <button className="search-clear" onClick={() => setSearch("")} aria-label="Hapus pencarian">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Role Filter */}
                <select
                  className="roster-filter-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filter role"
                >
                  <option value="All">All Roles ({members.length})</option>
                  <option value="Operator NOC">Operator NOC</option>
                  <option value="Shift Lead">Shift Lead</option>
                  <option value="Incident Coordinator">Incident Coordinator</option>
                  <option value="L2 Specialist">L2 Specialist</option>
                  <option value="Infrastructure Engineer">Infrastructure Engineer</option>
                </select>

                {/* Shift Filter */}
                <select
                  className="roster-filter-select"
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  aria-label="Filter shift"
                >
                  <option value="All">All Shifts</option>
                  <option value="Pagi">Shift Pagi</option>
                  <option value="Sore">Shift Sore</option>
                  <option value="Malam">Shift Malam</option>
                </select>

                {/* Status Filter */}
                <select
                  className="roster-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter status"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active (On Duty)</option>
                  <option value="On Break">On Break</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              {/* View Mode Switcher */}
              <div className="filter-tabs roster-view-tabs" aria-label="Pilihan tampilan roster">
                <button
                  className={viewMode === "table" ? "selected" : ""}
                  onClick={() => startTransition(() => setViewMode("table"))}
                >
                  <Table size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} /> Table
                </button>
                <button
                  className={viewMode === "calendar" ? "selected" : ""}
                  onClick={() => startTransition(() => setViewMode("calendar"))}
                >
                  <Calendar size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} /> Weekly Calendar
                </button>
              </div>
            </div>

            {/* View Render */}
            <div className="roster-view-body">
              <Suspense fallback={null}>
                {viewMode === "table" ? (
                  <RosterTable
                    members={filteredMembers}
                    onSelectMember={setSelectedMember}
                    onEditMember={(m) => {
                      setEditingMember(m);
                      setCreateModalOpen(true);
                    }}
                    onRequestSwap={handleOpenSwapForMember}
                  />
                ) : (
                  <RosterCalendarView members={filteredMembers} onSelectMember={setSelectedMember} />
                )}
              </Suspense>
            </div>
          </article>
        </div>

        {/* Side Column: Current Shift Coverage Panel */}
        <div className="side-column">
          <RosterShiftCoverage
            members={members}
            onSelectMember={setSelectedMember}
          />
        </div>
      </div>

      {/* Drawers & modals load only when an operator opens them. */}
      <Suspense fallback={null}>
        {selectedMember && (
          <MemberDetailDrawer
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            onUpdateMember={handleSaveMember}
            onRequestSwap={handleOpenSwapForMember}
          />
        )}

        {swapModalOpen && (
          <ShiftSwapModal
            open={swapModalOpen}
            onClose={() => setSwapModalOpen(false)}
            requests={swapRequests}
            members={members}
            onUpdateRequest={setSwapRequests}
            preselectedMember={swapPreselectedMember}
          />
        )}

        {createModalOpen && (
          <MemberCreateModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onSaveMember={handleSaveMember}
            editingMember={editingMember}
          />
        )}
      </Suspense>
    </>
  );
}
