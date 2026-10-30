"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { paths, routes, withQuery, pathForLabel, pageLabel, detailId } from "@/app/lib/routes";
import { RouteEffects, AuthGuard, DetailNotFound } from "@/app/components/routing/RouteEffects";
import { lazy, useContext, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ShellContext } from "@/app/context/ShellContext";
import { Sidebar } from "@/app/components/layout/Sidebar";
import { Topbar } from "@/app/components/layout/Topbar";
import { useMobileChrome } from "@/app/hooks/useMobileChrome";
import { BottomNav } from "@/app/components/layout/BottomNav";

import { FloatingNewTicketButton } from "@/app/components/ui/FloatingNewTicketButton";
import { ShiftCoveragePanel } from "@/app/components/layout/ShiftCoveragePanel";
import { ToastProvider, useToast } from "@/app/components/ui/Toast";
import { useCurrentHour } from "@/app/hooks/useLiveClock";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import { isOpenTicket } from "@/app/lib/data";
import { normalizeSeverity } from "@/app/lib/severity";
import { usePeople, useRoles } from "@/app/hooks/useMasterData";
import { peopleToRosterMembers } from "@/app/lib/people-roster";
import type { CheckpointAssessment, RosterMember, Ticket } from "@/app/lib/types";
import { AuthProvider, useAuth } from "@/app/lib/auth";
import { useBackendTickets } from "@/app/hooks/useBackendTickets";
import { useBackendTeam } from "@/app/hooks/useBackendTeam";
import { useAccess } from "@/app/hooks/useAccess";
import { LocalDataNotice } from "@/app/components/ui/LocalDataNotice";
import { createBackendTicket, ticketsFromBackend, updateBackendTicket } from "@/app/services/backend-tickets";
import { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";


const MobileNav = lazy(() => import("@/app/components/layout/MobileNav").then((module) => ({ default: module.MobileNav })));
const CommandPalette = lazy(() => import("@/app/components/search/CommandPalette").then((module) => ({ default: module.CommandPalette })));
const TicketCreateModal = lazy(() => import("@/app/components/tickets/TicketCreateModal").then((module) => ({ default: module.TicketCreateModal })));
const TicketDetailDrawer = lazy(() => import("@/app/components/tickets/TicketDetailDrawer").then((module) => ({ default: module.TicketDetailDrawer })));
const HandoverModal = lazy(() => import("@/app/components/handover/HandoverModal").then((module) => ({ default: module.HandoverModal })));
const HandoverWizard = lazy(() => import("@/app/components/handover/HandoverWizard").then((module) => ({ default: module.HandoverWizard })));
const NotAdequateModal = lazy(() => import("@/app/components/dashboard/AssessmentModals").then((module) => ({ default: module.NotAdequateModal })));
const AdequacyGuideModal = lazy(() => import("@/app/components/dashboard/AssessmentModals").then((module) => ({ default: module.AdequacyGuideModal })));
import {
  NotificationProvider,
  useNotifications,
  evaluateTicketSlaStatus,
} from "@/app/context/NotificationContext";
import { ClientProvider, useClient } from "@/app/context/ClientContext";
import { ALL_COMBINED_SEED_TICKETS, getClientTickets, getClientMonitoringSchedule } from "@/app/lib/clientData";
import { rowKey } from "@/app/components/dashboard/MonitoringSchedule";
import { ticketCode } from "@/app/lib/ticket-code";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ClientProvider>
          <NotificationProvider>
            <DashboardShell>{children}</DashboardShell>
          </NotificationProvider>
        </ClientProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

const EMPTY_ASSESSMENTS: Record<string, CheckpointAssessment> = {};
const EMPTY_ACKNOWLEDGED: string[] = [];

function useShellState() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeNav = pageLabel(pathname);
  const notify = useToast();
  const { addNotification } = useNotifications();
  const { activeClient, activeClientId } = useClient();
  const localTickets = useLocalStorage<Ticket[]>("ctd.tickets.v4", ALL_COMBINED_SEED_TICKETS);
  const { user: sessionUser, ready: sessionReady } = useAuth();
  // with the tickets module connected, the backend is the source: the stored copy and its seed data are not used at all
  const remoteTickets = useBackendTickets(ticketsFromBackend() && sessionReady && !!sessionUser);
  const ticketsError = remoteTickets[3];
  useEffect(() => {
    if (ticketsError) notify.critical(`Tiket tidak dapat dimuat dari backend: ${ticketsError}`, { id: "tickets-load-failed", duration: 8000 });
  }, [ticketsError, notify]);
  const fromBackend = ticketsFromBackend();
  const { can } = useAccess();
  const ticketWritable = can("tickets.create") && can("tickets.update");
  // why tickets cannot be changed, shown where the buttons would be (undefined when they can)
  const ticketReadOnlyReason = ticketWritable ? undefined : "Anda tidak memiliki izin untuk mengubah tiket.";
  const teamError = useBackendTeam(false).error;
  useEffect(() => {
    if (teamError) notify.critical(`Personel tidak dapat dimuat dari backend: ${teamError}`, { id: "team-load-failed", duration: 8000 });
  }, [teamError, notify]);
  const [tickets, setTickets, ticketsReady] = fromBackend ? remoteTickets : localTickets;
  const putRemoteTicket = remoteTickets[6];
  /** Saves a new ticket (to the backend when it is the source) and answers with it as saved. A failure throws, for the form to show. */
  const saveNewTicket = useCallback(async (ticket: Ticket): Promise<Ticket> => {
    if (!fromBackend) { setTickets((previous) => [ticket, ...previous]); return ticket; }
    const saved = await createBackendTicket(ticket, tickets);
    putRemoteTicket(saved);
    return saved;
  }, [fromBackend, setTickets, tickets, putRemoteTicket]);
  /** Saves a change to a ticket, the same way. */
  const saveTicketChange = useCallback(async (updated: Ticket): Promise<Ticket> => {
    if (!fromBackend) { setTickets((previous) => previous.map((ticket) => (ticket.id === updated.id ? updated : ticket))); return updated; }
    const previous = tickets.find((ticket) => ticket.id === updated.id);
    if (!previous) throw new Error(`Tiket #${ticketCode(updated)} tidak ditemukan.`);
    const saved = await updateBackendTicket(updated, previous);
    putRemoteTicket(saved);
    return saved;
  }, [fromBackend, setTickets, tickets, putRemoteTicket]);
  const [assessments, setAssessments] = useLocalStorage<Record<string, CheckpointAssessment>>("ctd.checkpoints", EMPTY_ASSESSMENTS);
  useLocalStorage<string[]>("ctd.acknowledged", EMPTY_ACKNOWLEDGED);

  const [searchOpen, setSearchOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const selectedTicketId = detailId(pathname, paths.tickets, ["escalations"]);
  const listQuery = new URLSearchParams(searchParams.toString());
  listQuery.delete("list");
  const closeTicketUrl = withQuery(searchParams.get("list") === "escalations" ? paths.escalations : paths.tickets, listQuery.toString());
  const closeTicket = useCallback(() => router.push(closeTicketUrl, { scroll: false }), [router, closeTicketUrl]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pendingNoteKey, setPendingNoteKey] = useState<string | null>(null);
  const [shiftPanelOpen, setShiftPanelOpen] = useLocalStorage<boolean>("ctd.shiftPanelOpen", false);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>("ctd.sidebarCollapsed", false);

  // Active people from Master Data are the single source for the roster, handover receivers and every PIC picker.
  const people = usePeople(), roles = useRoles();
  const members = useMemo(() => peopleToRosterMembers(people, roles), [people, roles]);
  // Attendance is derived from the live shift; identity is edited only in Master Data.
  const setMembers = useCallback<React.Dispatch<React.SetStateAction<RosterMember[]>>>(() => undefined, []);
  
  const clientTickets = useMemo(
    () => getClientTickets(tickets, activeClientId),
    [tickets, activeClientId],
  );

  const handover = useHandoverWorkflow({ tickets: clientTickets, assessments, members });
  const [loadedOverlays, setLoadedOverlays] = useState({
    ticketCreate: false,
    ticketDetail: false,
  });

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id.toLowerCase() === selectedTicketId?.toLowerCase()) ?? null,
    [tickets, selectedTicketId],
  );

  // The schedule only changes its live marker on the hour; keeping this
  // separate from the second-by-second top-bar clock prevents a full dashboard
  // render every second.
  const currentHour = useCurrentHour();

  const openTicketCount = useMemo(
    () => clientTickets.filter(isOpenTicket).length,
    [clientTickets],
  );

  const pageKey = pathname.split("/")[1];
  const handleNavigate = useCallback((label: string) => router.push(pathForLabel(label)), [router]);

  const handleAssess = useCallback((key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => {
    if (verdict === null) {
      setAssessments((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
      return;
    }
    setAssessments((previous) => ({ ...previous, [key]: { verdict, note: "" } }));
  }, [setAssessments]);

  const handleUpdateNote = useCallback((key: string, note: string) => {
    setAssessments((previous) => {
      const existing = previous[key];
      if (!existing) return previous;
      return {
        ...previous,
        [key]: {
          ...existing,
          note,
        },
      };
    });
  }, [setAssessments]);

  const pendingEntry = useMemo(() => {
    if (!pendingNoteKey) return null;
    return getClientMonitoringSchedule(activeClientId).find((e) => rowKey(e) === pendingNoteKey) ?? null;
  }, [activeClientId, pendingNoteKey]);

  const markOverlayLoaded = useCallback((overlay: keyof typeof loadedOverlays) => {
    setLoadedOverlays((previous) => (previous[overlay] ? previous : { ...previous, [overlay]: true }));
  }, []);

  const selectTicket = useCallback((ticket: Ticket) => {
    markOverlayLoaded("ticketDetail");
    const query = new URLSearchParams(pathname.startsWith(paths.tickets) ? searchParams.toString() : "");
    if (pathname === paths.escalations) query.set("list", "escalations");
    router.push(routes.ticket(ticket.id, query.toString()), { scroll: false });
  }, [markOverlayLoaded, pathname, router, searchParams]);

  const openTicketCreate = useCallback(() => {
    if (!ticketWritable) { notify.info(ticketReadOnlyReason ?? "Tiket tidak bisa dibuat.", { id: "ticket-read-only" }); return; }
    markOverlayLoaded("ticketCreate");
    setTicketModalOpen(true);
  }, [markOverlayLoaded, ticketWritable, ticketReadOnlyReason, notify]);

  useEffect(() => {
    // Ensure all clients' seed tickets are present (never on top of real tickets)
    if (fromBackend) return;
    setTickets((previous) => {
      // three severities: a stored ticket from before that still says "Critical" becomes High (lib/severity.ts)
      const normalized = previous.some((t) => normalizeSeverity(t.severity) !== t.severity)
        ? previous.map((t) => (normalizeSeverity(t.severity) === t.severity ? t : { ...t, severity: normalizeSeverity(t.severity) }))
        : previous;
      const hasBni = normalized.some((t) => t.clientId === "bni");
      const hasTelkomsel = normalized.some((t) => t.clientId === "telkomsel");
      if (!hasBni || !hasTelkomsel) {
        const existingIds = new Set(normalized.map((t) => t.id));
        const missing = ALL_COMBINED_SEED_TICKETS.filter((t) => !existingIds.has(t.id));
        return [...normalized, ...missing];
      }
      return normalized;
    });
  }, [setTickets, fromBackend]);


  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((previous) => !previous);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setTicketModalOpen(false);
        if (selectedTicket) closeTicket();
        setMobileNavOpen(false);
        setGuideOpen(false);
        setPendingNoteKey(null);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [selectedTicket, closeTicket]);

  return { closeTicketUrl, activeNav, pageKey, tickets, setTickets, saveNewTicket, saveTicketChange, ticketsReady, ticketWritable, ticketReadOnlyReason, refreshTickets: fromBackend ? remoteTickets[5] : undefined, clientTickets, assessments, handleAssess, setPendingNoteKey, handleUpdateNote, setGuideOpen, currentHour, handover, members, setMembers, selectTicket, openTicketCreate, handleNavigate, mobileNavOpen, setMobileNavOpen, shiftPanelOpen, setShiftPanelOpen, sidebarCollapsed, setSidebarCollapsed, openTicketCount, searchOpen, setSearchOpen, ticketModalOpen, setTicketModalOpen, loadedOverlays, activeClient, activeClientId, notify, addNotification, selectedTicketId, selectedTicket, closeTicket, pendingNoteKey, pendingEntry, setAssessments, guideOpen };
}

export type AppShellState = ReturnType<typeof useShellState>;
export function useAppData() {
  const context = useContext(ShellContext);
  if (!context) throw new Error("Page requires the persistent application shell");
  return context;
}
function DashboardShell({ children }: { children: React.ReactNode }) {
  const state = useShellState();
  const mobileChrome = useMobileChrome();
  const { activeNav, saveNewTicket, saveTicketChange, ticketsReady, ticketWritable, ticketReadOnlyReason, refreshTickets, clientTickets, setPendingNoteKey, setGuideOpen, handover, members, selectTicket, openTicketCreate, handleNavigate, mobileNavOpen, setMobileNavOpen, shiftPanelOpen, setShiftPanelOpen, sidebarCollapsed, setSidebarCollapsed, openTicketCount, searchOpen, setSearchOpen, ticketModalOpen, setTicketModalOpen, loadedOverlays, activeClient, activeClientId, notify, addNotification, selectedTicketId, selectedTicket, closeTicket, pendingNoteKey, pendingEntry, setAssessments, guideOpen } = state;

  return (
    <ShellContext.Provider value={state}>
    <main data-shell="persistent" className={`app-shell ${mobileNavOpen ? "nav-locked" : ""} ${shiftPanelOpen ? "shift-panel-is-open" : ""} ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <RouteEffects />
      <AuthGuard />
      <Sidebar
        activeNav={activeNav}
        onPrepareHandover={() => handover.openActive()}
        openTicketCount={openTicketCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        shiftPanelOpen={shiftPanelOpen}
      />

      <section className="workspace flex-auto min-w-0 flex flex-col min-h-screen will-change-[margin-left] [transition:margin-left_0.35s_cubic-bezier(0.16,_1,_0.3,_1)] [overflow-x:clip] ml-[250px] [.sidebar-is-collapsed_&]:ml-[68px] [.shift-panel-is-open_&]:mr-0 max-[940px]:ml-0 max-[940px]:w-full">
        <Topbar
          activeNav={activeNav}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onRefresh={async () => { await Promise.all([handover.refresh(), refreshTickets?.()]); }}
          onNavigate={handleNavigate}
          onOpenHandover={() => handover.openActive()}
        />

        <div className="page-content max-w-[1600px] w-full mx-auto pt-[28px] px-[32px] pb-[44px] [contain:layout_style] max-[1240px]:px-[22px] max-[660px]:pt-[18px] max-[660px]:px-[16px] max-[660px]:pb-[36px] max-md:pt-3 min-[400px]:max-md:px-4 max-[400px]:px-3">
          <LocalDataNotice />
          <div className="app-page-view w-full [animation:pageViewEnter_0.22s_cubic-bezier(0.16,_1,_0.3,_1)_both] will-change-[opacity,transform] [&>*]:scroll-mt-[76px] motion-reduce:animate-none">
            {children}
          </div>
          <div aria-hidden="true" className="h-[calc(112px+var(--ctd-safe-bottom,env(safe-area-inset-bottom,0px)))] md:hidden [@media(max-height:499px)_and_(max-width:1023px)]:block" />
        </div>
      </section>

      {/* ── Floating Action Button: New Ticket (persists across all pages & viewport fixed) ── */}
      {ticketWritable && <FloatingNewTicketButton onClick={openTicketCreate} isOpen={ticketModalOpen} scrollHidden={mobileChrome.scrollHidden} keyboardOpen={mobileChrome.keyboardOpen} onReveal={mobileChrome.revealFab} />}
      <BottomNav keyboardOpen={mobileChrome.keyboardOpen} openTicketCount={openTicketCount} onOpenHandover={() => handover.openActive()} />

      {/* ── Global Shift Coverage Panel (Discord-style right panel) ── */}
      <ShiftCoveragePanel
        isOpen={shiftPanelOpen}
        onToggle={() => setShiftPanelOpen((prev) => !prev)}
        onNavigateToRoster={() => handleNavigate("Team Roster")}
      />

      <Suspense fallback={null}>
        {mobileNavOpen && (
          <MobileNav
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            activeNav={activeNav}
            onPrepareHandover={() => handover.openActive()}
            handoverRecord={handover.record}
            openTicketCount={openTicketCount}
          />
        )}

        {searchOpen && (
          <CommandPalette
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            tickets={clientTickets}
            onSelectTicket={selectTicket}
            onNavigate={handleNavigate}
          />
        )}

        {loadedOverlays.ticketCreate && (
          <TicketCreateModal
            open={ticketModalOpen}
            onClose={() => setTicketModalOpen(false)}
            onCreate={async (draft) => {
              const ticket = await saveNewTicket({ ...draft, clientId: activeClientId });
              notify.success(`Ticket #${ticketCode(ticket)} berhasil dibuat dan dicatat untuk ${activeClient.shortName}.`, { id: `ticket-${ticket.id}` });
              const slaEval = evaluateTicketSlaStatus(ticket);
              if (slaEval.status === "breached") {
                addNotification({
                  title: `SLA Breach: Tiket #${ticketCode(ticket)} terlampaui`,
                  message: `Waktu penanganan (${slaEval.actualMinutes}m) melampaui SLA ${slaEval.targetMinutes}m pada tiket "${ticket.subject}".`,
                  category: "SLA",
                  project: ticket.project,
                  severity: "critical",
                  unread: true,
                  clientId: activeClientId,
                });
              } else if (slaEval.status === "approaching") {
                addNotification({
                  title: `Peringatan SLA: Tiket #${ticketCode(ticket)} mendekati batas waktu`,
                  message: `Sisa waktu ${slaEval.remainingMinutes}m sebelum batas toleransi SLA ${slaEval.targetMinutes}m terlampaui.`,
                  category: "SLA",
                  project: ticket.project,
                  severity: "warning",
                  unread: true,
                  clientId: activeClientId,
                });
              }
            }}
          />
        )}

        {selectedTicketId && ticketsReady && !selectedTicket && <DetailNotFound title="Tiket tidak ditemukan" href={state.closeTicketUrl} />}
        {selectedTicketId && ticketsReady && selectedTicket && (
          <TicketDetailDrawer
            ticket={selectedTicket}
            onClose={closeTicket}
            readOnlyReason={ticketReadOnlyReason}
            onUpdate={async (change) => {
              const updated = await saveTicketChange(change);
              const slaEval = evaluateTicketSlaStatus(updated);
              if (slaEval.status === "breached") {
                addNotification({
                  title: `SLA Breach: Tiket #${ticketCode(updated)} terlampaui`,
                  message: `Waktu penanganan (${slaEval.actualMinutes}m) melampaui SLA ${slaEval.targetMinutes}m pada tiket "${updated.subject}".`,
                  category: "SLA",
                  project: updated.project,
                  severity: "critical",
                  unread: true,
                  clientId: activeClientId,
                });
              } else if (slaEval.status === "approaching") {
                addNotification({
                  title: `Peringatan SLA: Tiket #${ticketCode(updated)} mendekati batas waktu`,
                  message: `Sisa waktu ${slaEval.remainingMinutes}m sebelum batas toleransi SLA ${slaEval.targetMinutes}m terlampaui.`,
                  category: "SLA",
                  project: updated.project,
                  severity: "warning",
                  unread: true,
                  clientId: activeClientId,
                });
              }
            }}
          />
        )}

        {handover.open && (
          <HandoverModal
            workflow={handover}
            tickets={clientTickets}
            onSelectTicket={selectTicket}
          />
        )}

        {handover.session?.open && (
          <HandoverWizard
            key={handover.session.requestId}
            open
            mode={handover.session.mode}
            draft={handover.session.draft}
            dirty
            draftSaved={handover.draftSaved}
            initialStep={handover.session.step}
            onStepChange={handover.changeStep}
            onDraftChange={handover.changeDraft}
            onClose={handover.closeWizard}
            onDiscard={handover.discardDraft}
            onSave={() => void handover.save()}
            saving={handover.busy}
            actor={handover.actor}
            members={members}
          />
        )}

        {pendingNoteKey && (
          <NotAdequateModal
            key={pendingNoteKey}
            open
            mode="alasan-nok-wajib"
            entry={pendingEntry}
            verdict="nok"
            onClose={() => setPendingNoteKey(null)}
            onSubmit={(note) => {
              const currentKey = pendingNoteKey;
              setAssessments((previous) => ({ ...previous, [currentKey]: { verdict: "nok", note } }));
              notify.warning("Checkpoint ditandai NOK — catatan disimpan.", {
                id: `checkpoint-${currentKey}`,
                duration: 6500,
                action: {
                  label: "Undo",
                  onClick: () => {
                    setAssessments((previous) => {
                      const next = { ...previous };
                      delete next[currentKey];
                      return next;
                    });
                    notify.info("Penilaian NOK dibatalkan.", { id: `checkpoint-${currentKey}` });
                  },
                },
              });
            }}
          />
        )}

        {guideOpen && <AdequacyGuideModal open onClose={() => setGuideOpen(false)} />}
      </Suspense>
    </main>
    </ShellContext.Provider>
  );
}
