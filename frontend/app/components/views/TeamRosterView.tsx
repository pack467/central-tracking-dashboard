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

  const openMemberCreate = useCallback((member: RosterMember) => {
    if (!canMaster(access, "person", "update")) {
      notify.info("Hanya Pengelola Master Data yang dapat mengubah personel.", { id: "member-permission" });
      return;
    }
    const person = people.find((entry) => entry.id === member.id);
    if (!person) {
      notify.info("Data personel belum tersedia di Master Data.", { id: "member-missing" });
      return;
    }
    markOverlayLoaded("create");
    setEditingPerson(person);
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

  const activeSelectedMember = useMemo(() => {
    if (!selectedMember) return null;
    return derivedMembers.find((m) => m.id === selectedMember.id) ?? selectedMember;
  }, [selectedMember, derivedMembers]);

  const pendingSwaps = swapRequests.filter((r) => r.status === "Pending").length;
  const viewButton = (active: boolean) =>
    `inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] px-3 text-[11.5px] font-semibold transition-colors cursor-pointer max-md:h-9 ${
      active ? "bg-[#1e293b] text-[#38bdf8] ring-1 ring-[#38bdf8]/30" : "text-[#94a3b8] hover:text-[#f8fafc]"
    }`;

  return (
    <div className="min-w-0 space-y-5 pb-24 sm:space-y-6 lg:pb-16">
      {/* 1. Page header */}
      <section className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[1px] text-[#94a3b8]">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#4ade80]" /> TEAM ROSTER
          </div>
          <h1 className="mt-1.5 text-[24px] font-bold leading-[1.2] tracking-[-0.4px] text-[#f8fafc] sm:text-[28px]">Team Roster</h1>
          <p className="mt-1 text-[12.5px] text-[#94a3b8]">Jadwal shift tim dan siapa yang sedang bertugas.</p>
        </div>

        <button
          type="button"
          className="relative inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#334155] bg-[#1e293b] px-3.5 text-[12px] font-semibold text-[#f8fafc] transition-colors hover:bg-[#243044] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer max-sm:h-11 max-sm:w-full"
          onClick={() => openSwap()}
          aria-label={`Permintaan tukar shift, ${pendingSwaps} menunggu`}
          disabled={isLoading}
        >
          <ArrowRightLeft size={14} className="text-[#38bdf8]" />
          Tukar Shift
          {pendingSwaps > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#f87171] px-1.5 font-mono text-[10.5px] font-bold leading-5 text-[#0f172a]">
              {pendingSwaps}
            </span>
          )}
        </button>
      </section>

      <PanelSkeletonWrapper
        isLoading={isLoading}
        isStale={isStale}
        error={error}
        onRetry={refetch}
        minHeight={560}
        skeleton={<TeamRosterSkeleton />}
        liveRegionText="Memuat daftar anggota tim..."
        className="gap-5 sm:gap-6"
      >
        {/* 2. Summary cards */}
        <RosterStatCards members={derivedMembers} swapRequests={swapRequests} onOpenSwaps={() => openSwap()} />

        {/* 3. Roster panel */}
        <article className="min-w-0 rounded-[12px] border border-[#334155] bg-[#1e293b] shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          {/* Toolbar: search, filters, view */}
          <div className="relative z-20 flex flex-col gap-2 rounded-t-[12px] border-b border-[#334155] bg-[rgba(15,23,42,0.45)] p-3 sm:px-4 min-[1100px]:flex-row min-[1100px]:items-center">
            <div className="group flex h-11 min-w-0 items-center gap-2 rounded-[8px] border border-[#334155] bg-[#0f172a] px-3 transition-colors focus-within:border-[#38bdf8]/60 md:h-9 min-[1100px]:w-[260px] min-[1100px]:shrink-0">
              <Search size={14} className="shrink-0 text-[#94a3b8] group-focus-within:text-[#38bdf8]" />
              <input
                type="text"
                placeholder="Cari nama, peran, atau ID…"
                value={searchDraft.input}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Cari anggota tim"
                className="h-full min-w-0 flex-1 border-none bg-transparent text-[12px] text-[#f8fafc] outline-none placeholder:text-[#64748b]"
              />
              {search && (
                <button type="button" className="grid h-6 w-6 place-items-center rounded-full text-[#94a3b8] hover:bg-[#243044] hover:text-[#f8fafc] cursor-pointer" onClick={() => setSearch("")} aria-label="Hapus pencarian">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 min-[1100px]:flex min-[1100px]:flex-1 min-[1100px]:items-center">
              <div className="min-w-0 min-[1100px]:w-[180px]">
                <Select icon={<Users size={16} />} className="w-full" value={roleFilterKey} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter peran">
                  <option value="All">Semua peran ({derivedMembers.length})</option>
                  {visibleRoles.map((role) => (
                    <option key={role.key} value={role.key}>{role.name}</option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0 min-[1100px]:w-[150px]">
                <Select icon={<Clock size={16} />} className="w-full" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)} aria-label="Filter shift">
                  <option value="All">Semua shift</option>
                  <option value="Subuh">Shift Subuh</option>
                  <option value="Pagi">Shift Pagi</option>
                  <option value="Malam">Shift Malam</option>
                </Select>
              </div>
              <div className="col-span-2 min-w-0 md:col-span-1 min-[1100px]:w-[160px]">
                <Select icon={<Activity size={16} />} className="w-full" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter status">
                  <option value="All">Semua status</option>
                  <option value="Active">Active (bertugas)</option>
                  <option value="On Break">On Break</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="On Leave">On Leave</option>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 min-[1100px]:ml-auto">
              {hasInactive && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeInactive}
                  onClick={() => setIncludeInactive((value) => !value)}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-[8px] border px-3 text-[12px] font-medium transition-colors cursor-pointer md:h-9 ${
                    includeInactive ? "border-[#38bdf8]/50 bg-[#0c2a3d] text-[#38bdf8]" : "border-[#334155] bg-[#0f172a] text-[#cbd5e1] hover:bg-[#243044]"
                  }`}
                >
                  <span aria-hidden="true" className={`relative h-4 w-7 rounded-full transition-colors ${includeInactive ? "bg-[#38bdf8]" : "bg-[#334155]"}`}>
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-[left] ${includeInactive ? "left-3.5" : "left-0.5"}`} />
                  </span>
                  Nonaktif
                </button>
              )}
              <div className="grid flex-1 grid-cols-2 gap-0.5 rounded-[8px] border border-[#334155] bg-[#0f172a] p-0.5 min-[1100px]:flex-none" role="group" aria-label="Pilihan tampilan roster">
                <button type="button" aria-pressed={viewMode === "calendar"} className={viewButton(viewMode === "calendar")} onClick={() => startTransition(() => setViewMode("calendar"))}>
                  <Calendar size={13} /> Kalender
                </button>
                <button type="button" aria-pressed={viewMode === "table"} className={viewButton(viewMode === "table")} onClick={() => startTransition(() => setViewMode("table"))}>
                  <Table size={13} /> Tabel
                </button>
              </div>
            </div>
          </div>

          <Suspense fallback={null}>
            {viewMode === "table" ? (
              <RosterTable members={filteredMembers} onSelectMember={openMemberDetail} onEditMember={openMemberCreate} onRequestSwap={handleOpenSwapForMember} />
            ) : (
              <RosterCalendarView members={filteredMembers} onSelectMember={openMemberDetail} />
            )}
          </Suspense>
        </article>
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

        {loadedOverlays.swap && swapModalOpen && (
          <ShiftSwapModal
            key={swapPreselectedMember?.id ?? "all"}
            open={swapModalOpen}
            onClose={() => setSwapModalOpen(false)}
            requests={swapRequests}
            members={members}
            onUpdateRequest={setSwapRequests}
            preselectedMember={swapPreselectedMember}
          />
        )}

        {loadedOverlays.create && createModalOpen && editingPerson && (
          <PersonFormModal
            person={editingPerson}
            roles={roles}
            people={people}
            onClose={() => setCreateModalOpen(false)}
            onSaved={(person) => {
              setCreateModalOpen(false);
              notify.success(`Data anggota ${person.fullName} berhasil diperbarui.`, { id: "member-save" });
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
