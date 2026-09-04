"use client";

import { lazy, startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserPlus, ArrowRightLeft, Table, Calendar, Search, X } from "lucide-react";
import { RosterStatCards } from "@/app/components/team/RosterStatCards";
import { RosterShiftCoverage } from "@/app/components/team/RosterShiftCoverage";
import { RosterTable } from "@/app/components/team/RosterTable";
import { seedRosterMembers, seedSwapRequests } from "@/app/lib/data";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { getDerivedMemberStatus } from "@/app/lib/shifts";
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
  const activeShift = useActiveShift();
  const [members, setMembers] = useState<RosterMember[]>(seedRosterMembers);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>(seedSwapRequests);

  // Derive real-time member status based on current active shift
  const derivedMembers = useMemo(() => {
    return members.map((m) => ({
      ...m,
      status: getDerivedMemberStatus(m, activeShift),
    }));
  }, [members, activeShift]);

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
  const [loadedOverlays, setLoadedOverlays] = useState({
    memberDetail: false,
    swap: false,
    create: false,
  });

  const primaryPanelRef = useRef<HTMLElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = primaryPanelRef.current;
    if (!el) return;

    const updateHeight = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) {
        setPanelHeight(h);
      }
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateHeight();
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  const markOverlayLoaded = useCallback((overlay: keyof typeof loadedOverlays) => {
    setLoadedOverlays((previous) => (previous[overlay] ? previous : { ...previous, [overlay]: true }));
  }, []);

  const openMemberDetail = useCallback((member: RosterMember) => {
    markOverlayLoaded("memberDetail");
    setSelectedMember(member);
  }, [markOverlayLoaded]);

  const openSwap = useCallback((member: RosterMember | null = null) => {
    markOverlayLoaded("swap");
    setSwapPreselectedMember(member);
    setSwapModalOpen(true);
  }, [markOverlayLoaded]);

  const openMemberCreate = useCallback((member: RosterMember | null = null) => {
    markOverlayLoaded("create");
    setEditingMember(member);
    setCreateModalOpen(true);
  }, [markOverlayLoaded]);

  // Filtered members calculation using derived status
  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return derivedMembers.filter((m) => {
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
        (shiftFilter === "Subuh" && m.currentShift.includes("Subuh")) ||
        (shiftFilter === "Pagi" && m.currentShift.includes("Pagi")) ||
        (shiftFilter === "Malam" && m.currentShift.includes("Malam")) ||
        (shiftFilter === "Leave" && (m.currentShift.includes("Leave") || m.currentShift.includes("Cuti")));

      return matchSearch && matchRole && matchStatus && matchShift;
    });
  }, [derivedMembers, search, roleFilter, statusFilter, shiftFilter]);

  const handleSaveMember = (savedMember: RosterMember) => {
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === savedMember.id);
      if (exists) {
        return prev.map((m) => (m.id === savedMember.id ? savedMember : m));
      }
      return [savedMember, ...prev];
    });
    setSelectedMember((prev) => (prev?.id === savedMember.id ? savedMember : prev));
  };

  const handleOpenSwapForMember = (member: RosterMember) => {
    openSwap(member);
  };

  const handleAddNewMember = () => openMemberCreate(null);

  const activeSelectedMember = useMemo(() => {
    if (!selectedMember) return null;
    return derivedMembers.find((m) => m.id === selectedMember.id) ?? selectedMember;
  }, [selectedMember, derivedMembers]);

  return (
    <>
      {/* 1. Page Header */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> TEAM ROSTER &amp; SHIFT SCHEDULE
          </div>
          <h1>Team Roster</h1>
          <p>Manage shift assignments, team availability, coverage quorum, and shift swap requests.</p>
        </div>

        <div className="page-actions">
          <button
            className="button button-secondary button-swap-badge"
            onClick={() => setSwapModalOpen(true)}
            aria-label="Shift swap requests"
          >
            <ArrowRightLeft size={14} /> Shift Swaps ({swapRequests.filter((r) => r.status === "Pending").length})
          </button>
          <button className="button button-primary" onClick={handleAddNewMember}>
            <span>＋</span> Tambah Anggota
          </button>
        </div>
      </section>

      {/* 2. Top Summary Stat Cards */}
      <RosterStatCards
        members={derivedMembers}
        swapRequests={swapRequests}
        onOpenSwaps={() => openSwap()}
      />

      {/* 3. Main Roster Content (2 columns: Table/Calendar & Shift Coverage Widget) */}
      <div className="roster-main-layout" style={{ marginTop: "20px" }}>
        <div className="roster-primary-column">
          <article ref={primaryPanelRef} className="panel roster-toolbar-panel">
            {/* Toolbar: Search, Filters & View Toggle */}
            <div className="roster-toolbar-row">
              <div className="roster-search-field">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Cari nama, role, employee ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Cari anggota tim"
                />
                {search && (
                  <button className="search-clear" onClick={() => setSearch("")} aria-label="Hapus pencarian">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="roster-filters-group">
                {/* Role Filter */}
                <select
                  className="roster-filter-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filter role"
                >
                  <option value="All">All Roles ({derivedMembers.length})</option>
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
                  <option value="Subuh">Shift Subuh</option>
                  <option value="Pagi">Shift Pagi</option>
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
                  <Table size={13} /> Table
                </button>
                <button
                  className={viewMode === "calendar" ? "selected" : ""}
                  onClick={() => startTransition(() => setViewMode("calendar"))}
                >
                  <Calendar size={13} /> Weekly Calendar
                </button>
              </div>
            </div>

            {/* View Render */}
            <div className="roster-view-body">
              <Suspense fallback={null}>
                {viewMode === "table" ? (
                  <RosterTable
                    members={filteredMembers}
                    onSelectMember={openMemberDetail}
                    onEditMember={openMemberCreate}
                    onRequestSwap={handleOpenSwapForMember}
                  />
                ) : (
                  <RosterCalendarView members={filteredMembers} onSelectMember={openMemberDetail} />
                )}
              </Suspense>
            </div>
          </article>
        </div>

        {/* Side Column: Current Shift Coverage Panel */}
        <div className="side-column">
          <RosterShiftCoverage
            members={derivedMembers}
            onSelectMember={openMemberDetail}
            matchedHeight={panelHeight}
          />
        </div>
      </div>

      {/* Drawers & modals load only when an operator opens them. */}
      <Suspense fallback={null}>
        {loadedOverlays.memberDetail && (
          <MemberDetailDrawer
            member={activeSelectedMember}
            onClose={() => setSelectedMember(null)}
            onUpdateMember={handleSaveMember}
            onRequestSwap={handleOpenSwapForMember}
          />
        )}

        {loadedOverlays.swap && (
          <ShiftSwapModal
            open={swapModalOpen}
            onClose={() => setSwapModalOpen(false)}
            requests={swapRequests}
            members={members}
            onUpdateRequest={setSwapRequests}
            preselectedMember={swapPreselectedMember}
          />
        )}

        {loadedOverlays.create && (
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
