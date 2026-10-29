"use client";

import { Select } from "@/app/components/ui/Select";
import { DetailNotFound } from "@/app/components/routing/RouteEffects";

import { useRouter } from "next/navigation";
import { useUrlQuery, useUrlSearch } from "@/app/hooks/useUrlQuery";
import { rosterSchema, slug } from "@/app/lib/query-state";
import { paths, routes, detailId } from "@/app/lib/routes";

import { lazy, startTransition, Suspense, useCallback, useMemo, useState } from "react";
import { ArrowRightLeft, Table, Calendar, Search, X, Users, Clock, Activity } from "lucide-react";
import { RosterStatCards } from "@/app/components/team/RosterStatCards";
import { RosterTable } from "@/app/components/team/RosterTable";
import { seedSwapRequests } from "@/app/lib/data";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { getDerivedMemberStatus } from "@/app/lib/shifts";
import type { RosterMember, ShiftSwapRequest } from "@/app/lib/types";
import { useResource } from "@/app/hooks/useResource";
import { usePeople, useRoles } from "@/app/hooks/useMasterData";
import { peopleToRosterMembers } from "@/app/lib/people-roster";
import { isMockMode } from "@/app/lib/config";
import { useAuth } from "@/app/lib/auth";
import { canMaster, masterRole } from "@/app/lib/permissions";
import { useToast } from "@/app/components/ui/Toast";
import type { Person } from "@/app/types/master-data";
import { rosterService } from "@/app/services/roster";
import { PanelSkeletonWrapper, TeamRosterSkeleton } from "@/app/components/ui/skeleton";

const RosterCalendarView = lazy(() =>
  import("@/app/components/team/RosterCalendarView").then((module) => ({ default: module.RosterCalendarView })),
);
const ShiftSwapModal = lazy(() =>
  import("@/app/components/team/ShiftSwapModal").then((module) => ({ default: module.ShiftSwapModal })),
);
const MemberDetailDrawer = lazy(() =>
  import("@/app/components/team/MemberDetailDrawer").then((module) => ({ default: module.MemberDetailDrawer })),
);
// The same person form as Master Data: people are owned by Master Data, the roster only schedules them.
const PersonFormModal = lazy(() =>
  import("@/app/components/master-data/PersonFormModal").then((module) => ({ default: module.PersonFormModal })),
);

export function TeamRosterView({ members: propMembers, onMembersChange: setMembers }: {
  members: RosterMember[];
  onMembersChange: React.Dispatch<React.SetStateAction<RosterMember[]>>;
}) {
  const {
    data: fetchedMembers,
    isLoading,
    isStale,
    error,
    refetch,
  } = useResource(
    "team-roster-members",
    (signal) => rosterService.listMembers(signal),
  );

  const people = usePeople();
  const roles = useRoles();
  const notify = useToast();
  const { user } = useAuth();
  const access = masterRole(user || undefined);
  const [includeInactive, setIncludeInactive] = useState(false);
  const hasInactive = people.some((person) => person.status !== "active");
  const liveMembers = useMemo(
    () => peopleToRosterMembers(people, roles, includeInactive),
    [people, roles, includeInactive],
  );
  // Mock mode reads people straight from Master Data (live: a new person appears at once); API mode keeps the fetched list.
  const members = useMemo(
    () => (isMockMode() ? (isLoading ? [] : liveMembers) : fetchedMembers ?? (isLoading ? [] : propMembers)),
    [isLoading, liveMembers, fetchedMembers, propMembers],
  );
  const url = useUrlQuery(rosterSchema, paths.teamRoster);
  const router = useRouter();
  const activeShift = useActiveShift();
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>(seedSwapRequests);

  // Derive real-time member status based on current active shift
  const derivedMembers = useMemo(() => {
    return members.map((m) => ({
      ...m,
      status: getDerivedMemberStatus(m, activeShift),
    }));
  }, [members, activeShift]);

  // Filter & Search states
  const searchDraft = useUrlSearch(url.values.q, url.field("q"));
  const search = searchDraft.effective;
  const setSearch = searchDraft.set;
  const roleFilter = url.values.role;
  const setRoleFilter = url.field("role", "replace");
  const statusFilter = url.values.status;
  const setStatusFilter = url.field("status", "replace");
  const shiftFilter = url.values.shift;
  const setShiftFilter = url.field("shift", "replace");
  const viewMode = url.values.view === "table" ? "table" : "calendar";
  const setViewMode = (mode: "table" | "calendar") => url.update({ view: mode === "table" ? "table" : "weekly", page: 1 }, "push");

  // Modal / Drawer states
  const selectedId = detailId(url.pathname, paths.teamRoster);
  const selectedMember = derivedMembers.find(m => m.id.toLowerCase() === selectedId?.toLowerCase()) ?? null;
  const closeMember = () => router.push(routes.teamRoster(url.query), { scroll: false });
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapPreselectedMember, setSwapPreselectedMember] = useState<RosterMember | null>(null);
  const [loadedOverlays, setLoadedOverlays] = useState({
    memberDetail: false,
    swap: false,
    create: false,
  });

  const markOverlayLoaded = useCallback((overlay: keyof typeof loadedOverlays) => {
    setLoadedOverlays((previous) => (previous[overlay] ? previous : { ...previous, [overlay]: true }));
  }, []);

  const openMemberDetail = useCallback((member: RosterMember) => {
    markOverlayLoaded("memberDetail");
    router.push(routes.member(member.id, url.query), { scroll: false });
  }, [markOverlayLoaded, router, url.query]);

  const openSwap = useCallback((member: RosterMember | null = null) => {
    markOverlayLoaded("swap");
    setSwapPreselectedMember(member);
    setSwapModalOpen(true);
  }, [markOverlayLoaded]);

  const openMemberCreate = useCallback((member: RosterMember | null = null) => {
    if (!canMaster(access, "person", member ? "update" : "create")) {
      notify.info("Hanya Pengelola Master Data yang dapat mengubah personel.", { id: "member-permission" });
      return;
    }
    markOverlayLoaded("create");
    setEditingPerson(member ? people.find((person) => person.id === member.id) ?? null : null);
    setCreateModalOpen(true);
  }, [access, markOverlayLoaded, notify, people]);

  // Role filter value: the URL carries a slug, the Select works with the stable role key.
  const roleFilterKey = roleFilter === "All" ? "All" : roles.find((role) => slug(role.key) === slug(String(roleFilter)))?.key ?? "All";
  const visibleRoles = roles.filter((role) => role.active || derivedMembers.some((member) => (member.roleKey ?? member.role) === role.key));

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

      const matchRole = roleFilterKey === "All" || (m.roleKey ?? m.role) === roleFilterKey;
      const matchStatus = statusFilter === "All" || m.status === statusFilter;
      const matchShift =
        shiftFilter === "All" ||
        (shiftFilter === "Subuh" && m.currentShift.includes("Subuh")) ||
        (shiftFilter === "Pagi" && m.currentShift.includes("Pagi")) ||
        (shiftFilter === "Malam" && m.currentShift.includes("Malam")) ||
        (shiftFilter === "Leave" && (m.currentShift.includes("Leave") || m.currentShift.includes("Cuti")));

      return matchSearch && matchRole && matchStatus && matchShift;
    });
  }, [derivedMembers, search, roleFilterKey, statusFilter, shiftFilter]);

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
      <section className="page-heading flex justify-between items-end mb-[22px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[12px] max-[640px]:mb-0">
        <div>
          <div className="flex items-center gap-[8px] text-[var(--ink-muted)] text-[10px] tracking-[1px] font-bold font-mono uppercase">
            <span className="live-dot live-dot-pulse" /> TEAM ROSTER
          </div>
          <h1 className="m-[6px_0_4px] text-[var(--ink-primary)] text-[24px] leading-[1.2] tracking-[-0.4px] font-bold">Team Roster</h1>
        </div>

        <div className="page-actions flex gap-[9px]">
          <button
            className="button button-secondary button-swap-badge disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setSwapModalOpen(true)}
            aria-label="Shift swap requests"
            disabled={isLoading}
          >
            <ArrowRightLeft size={14} /> Shift Swaps ({swapRequests.filter((r) => r.status === "Pending").length})
          </button>
          {canMaster(access, "person", "create") && (
            <button className="button button-primary disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleAddNewMember} disabled={isLoading}>
              <span>＋</span> Tambah Anggota
            </button>
          )}
        </div>
      </section>

      <PanelSkeletonWrapper
        isLoading={isLoading}
        isStale={isStale}
        error={error}
        onRetry={refetch}
        minHeight={560}
        skeleton={<TeamRosterSkeleton />}
        liveRegionText="Memuat daftar anggota tim..."
      >
      {/* 2. Top Summary Stat Cards */}
      <RosterStatCards
        members={derivedMembers}
        swapRequests={swapRequests}
        onOpenSwaps={() => openSwap()}
      />

      {/* 3. Main Roster Content (2 columns: Table/Calendar & Shift Coverage Widget) */}
      <div className="block w-full mt-[20px] pb-24 lg:pb-16">
        <div className="min-w-0 w-full flex flex-col gap-[20px]">
          <article className="mb-0 overflow-hidden bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] shadow-[var(--shadow-panel)]">
            {/* Toolbar: Search, Filters & View Toggle */}
            <div className="flex items-center gap-[10px] p-[12px_16px] border-b border-[var(--line)] flex-wrap bg-[var(--panel-bg)]">
              {/* Search Field */}
              <div className="group relative flex items-center w-full min-[900px]:w-auto min-[900px]:flex-[1_1_200px] min-[900px]:max-w-[280px] h-[40px] min-[900px]:h-[36px] px-[10px] border border-[var(--panel-border)] rounded-[8px] bg-[var(--input-bg,#0f172a)] transition-[border-color,box-shadow] duration-150 ease gap-[8px] box-border focus-within:border-[rgba(56,189,248,0.4)] focus-within:bg-[#141f33] ">
                <Search size={14} className="text-[var(--ink-muted)] shrink-0 transition-colors duration-150 ease group-focus-within:text-[var(--accent-blue)]" />
                <input
                  type="text"
                  placeholder="Cari nama, role, employee ID..."
                  value={searchDraft.input}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Cari anggota tim"
                  className="flex-1 min-w-0 h-full border-none outline-none bg-transparent text-[var(--ink-primary)] text-[12px] font-sans placeholder:text-[var(--ink-muted)]"
                />
                {search && (
                  <button className="flex items-center justify-center p-0 border-none bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer" onClick={() => setSearch("")} aria-label="Hapus pencarian">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filter Group */}
              <div className="flex items-center gap-[8px] flex-wrap w-full min-[900px]:w-auto min-[900px]:flex-initial flex-1">
                {/* Role Filter */}
                <div className="group relative inline-flex items-center w-full min-[560px]:flex-1 min-[560px]:min-w-[140px] min-[900px]:w-auto min-[900px]:flex-initial">
                  
                  <Select icon={<Users size={16}  />}
                    className={`w-full min-[900px]:w-auto h-[40px] min-[900px]:h-[36px] box-border pl-[30px] pr-[28px] py-0 text-[var(--ink-primary)] border border-[var(--panel-border)] rounded-[8px] bg-[var(--input-bg,#0f172a)] text-[12px] font-medium font-sans cursor-pointer inline-flex items-center appearance-none -webkit-appearance-none transition-[border-color,box-shadow,background-color,color] duration-150 ease shrink-0 [color-scheme:dark] hover:border-[rgba(148,163,184,0.35)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] focus:outline-none ${
                      roleFilterKey !== "All"
                        ? "border-[rgba(56,189,248,0.4)] bg-[rgba(56,189,248,0.08)] text-[var(--accent-blue,#38bdf8)] font-semibold"
                        : ""
                    }`}
                    value={roleFilterKey}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    aria-label="Filter role"
                  >
                    <option value="All">All Roles ({derivedMembers.length})</option>
                    {visibleRoles.map((role) => (
                      <option key={role.key} value={role.key}>{role.name}</option>
                    ))}
                  </Select>
                  
                </div>

                {/* Shift Filter */}
                <div className="group relative inline-flex items-center w-full min-[560px]:flex-1 min-[560px]:min-w-[140px] min-[900px]:w-auto min-[900px]:flex-initial">
                  
                  <Select icon={<Clock size={16}  />}
                    className={`w-full min-[900px]:w-auto h-[40px] min-[900px]:h-[36px] box-border pl-[30px] pr-[28px] py-0 text-[var(--ink-primary)] border border-[var(--panel-border)] rounded-[8px] bg-[var(--input-bg,#0f172a)] text-[12px] font-medium font-sans cursor-pointer inline-flex items-center appearance-none -webkit-appearance-none transition-[border-color,box-shadow,background-color,color] duration-150 ease shrink-0 [color-scheme:dark] hover:border-[rgba(148,163,184,0.35)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] focus:outline-none ${
                      shiftFilter !== "All"
                        ? "border-[rgba(56,189,248,0.4)] bg-[rgba(56,189,248,0.08)] text-[var(--accent-blue,#38bdf8)] font-semibold"
                        : ""
                    }`}
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value)}
                    aria-label="Filter shift"
                  >
                    <option value="All">All Shifts</option>
                    <option value="Subuh">Shift Subuh</option>
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Malam">Shift Malam</option>
                  </Select>
                  
                </div>

                {/* Status Filter */}
                <div className="group relative inline-flex items-center w-full min-[560px]:flex-1 min-[560px]:min-w-[140px] min-[900px]:w-auto min-[900px]:flex-initial">
                  
                  <Select icon={<Activity size={16}  />}
                    className={`w-full min-[900px]:w-auto h-[40px] min-[900px]:h-[36px] box-border pl-[30px] pr-[28px] py-0 text-[var(--ink-primary)] border border-[var(--panel-border)] rounded-[8px] bg-[var(--input-bg,#0f172a)] text-[12px] font-medium font-sans cursor-pointer inline-flex items-center appearance-none -webkit-appearance-none transition-[border-color,box-shadow,background-color,color] duration-150 ease shrink-0 [color-scheme:dark] hover:border-[rgba(148,163,184,0.35)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)] focus:outline-none ${
                      statusFilter !== "All"
                        ? "border-[rgba(56,189,248,0.4)] bg-[rgba(56,189,248,0.08)] text-[var(--accent-blue,#38bdf8)] font-semibold"
                        : ""
                    }`}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter status"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active (On Duty)</option>
                    <option value="On Break">On Break</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="On Leave">On Leave</option>
                  </Select>
                  
                </div>
              </div>

              {hasInactive && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeInactive}
                  onClick={() => setIncludeInactive((value) => !value)}
                  className={`inline-flex items-center gap-[8px] h-[40px] min-[900px]:h-[36px] px-[12px] rounded-[8px] border text-[12px] font-medium cursor-pointer transition-[border-color,background-color,color] duration-150 motion-reduce:transition-none shrink-0 ${includeInactive ? "border-[rgba(56,189,248,0.4)] bg-[rgba(56,189,248,0.08)] text-[var(--accent-blue,#38bdf8)] font-semibold" : "border-[var(--panel-border)] bg-[var(--input-bg,#0f172a)] text-[var(--ink-primary)] hover:border-[rgba(148,163,184,0.35)]"}`}
                >
                  <span aria-hidden="true" className={`size-[8px] rounded-full ${includeInactive ? "bg-[var(--accent-blue,#38bdf8)]" : "bg-[var(--ink-muted)]"}`} />
                  Termasuk nonaktif
                </button>
              )}

              {/* View Mode Switcher */}
              <div className="w-full min-[560px]:w-auto min-[900px]:ml-auto grid grid-cols-2 min-[560px]:inline-flex items-center gap-[2px] h-[40px] min-[900px]:h-[36px] box-border p-[3px] bg-[var(--surface,#0f172a)] border border-[var(--panel-border)] rounded-[8px] shrink-0" aria-label="Pilihan tampilan roster">
                <button
                  className={`inline-flex items-center justify-center flex-1 min-[560px]:flex-initial h-[32px] min-[900px]:h-[28px] px-[12px] text-[11.5px] font-semibold rounded-[6px] gap-[6px] border border-transparent cursor-pointer transition-[color,background-color] duration-150 ease ${
                    viewMode === "table"
                      ? "bg-[var(--accent-blue,#2563eb)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
                      : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[rgba(148,163,184,0.08)]"
                  }`}
                  onClick={() => startTransition(() => setViewMode("table"))}
                >
                  <Table size={13} /> Table
                </button>
                <button
                  className={`inline-flex items-center justify-center flex-1 min-[560px]:flex-initial h-[32px] min-[900px]:h-[28px] px-[12px] text-[11.5px] font-semibold rounded-[6px] gap-[6px] border border-transparent cursor-pointer transition-[color,background-color] duration-150 ease ${
                    viewMode === "calendar"
                      ? "bg-[var(--accent-blue,#2563eb)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
                      : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[rgba(148,163,184,0.08)]"
                  }`}
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
      </div>
      </PanelSkeletonWrapper>

      {selectedId && !selectedMember && <DetailNotFound title="Anggota tidak ditemukan" href={routes.teamRoster(url.query)} />}
      {/* Drawers & modals load only when an operator opens them. */}
      <Suspense fallback={null}>
        {selectedMember && (
          <MemberDetailDrawer
            member={activeSelectedMember}
            onClose={closeMember}
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

        {loadedOverlays.create && createModalOpen && (
          <PersonFormModal
            person={editingPerson ?? undefined}
            roles={roles}
            people={people}
            onClose={() => setCreateModalOpen(false)}
            onSaved={(person) => {
              setCreateModalOpen(false);
              notify.success(
                editingPerson
                  ? `Data anggota ${person.fullName} berhasil diperbarui.`
                  : `Anggota tim baru ${person.fullName} ditambahkan ke roster.`,
                { id: "member-save" },
              );
            }}
          />
        )}
      </Suspense>
    </>
  );
}

