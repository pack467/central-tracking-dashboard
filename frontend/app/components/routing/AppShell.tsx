"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { paths, routes, withQuery, pathForLabel, pageLabel, detailId } from "@/app/lib/routes";
import { RouteEffects, AuthGuard, DetailNotFound } from "@/app/components/routing/RouteEffects";
import { lazy, createContext, useContext, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/app/components/layout/Sidebar";
import { Topbar } from "@/app/components/layout/Topbar";

import { FloatingNewTicketButton } from "@/app/components/ui/FloatingNewTicketButton";
import { ShiftCoveragePanel } from "@/app/components/layout/ShiftCoveragePanel";
import { ToastProvider, useToast } from "@/app/components/ui/Toast";
import { useCurrentHour } from "@/app/hooks/useLiveClock";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import { isOpenTicket, seedRosterMembers } from "@/app/lib/data";
import type { CheckpointAssessment, RosterMember, Ticket } from "@/app/lib/types";
import { AuthProvider } from "@/app/lib/auth";
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
  const [tickets, setTickets, ticketsReady] = useLocalStorage<Ticket[]>("ctd.tickets.v4", ALL_COMBINED_SEED_TICKETS);
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

  const [members, setMembers] = useState<RosterMember[]>(seedRosterMembers);
  
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
    markOverlayLoaded("ticketCreate");
    setTicketModalOpen(true);
  }, [markOverlayLoaded]);

  useEffect(() => {
    // Ensure all clients' seed tickets are present
    setTickets((previous) => {
      const hasBni = previous.some((t) => t.clientId === "bni");
      const hasTelkomsel = previous.some((t) => t.clientId === "telkomsel");
      if (!hasBni || !hasTelkomsel) {
        const existingIds = new Set(previous.map((t) => t.id));
        const missing = ALL_COMBINED_SEED_TICKETS.filter((t) => !existingIds.has(t.id));
        return [...previous, ...missing];
      }
      return previous;
    });
  }, [setTickets]);


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

  return { closeTicketUrl, activeNav, pageKey, tickets, setTickets, ticketsReady, clientTickets, assessments, handleAssess, setPendingNoteKey, handleUpdateNote, setGuideOpen, currentHour, handover, members, setMembers, selectTicket, openTicketCreate, handleNavigate, mobileNavOpen, setMobileNavOpen, shiftPanelOpen, setShiftPanelOpen, sidebarCollapsed, setSidebarCollapsed, openTicketCount, searchOpen, setSearchOpen, ticketModalOpen, setTicketModalOpen, loadedOverlays, activeClient, activeClientId, notify, addNotification, selectedTicketId, selectedTicket, closeTicket, pendingNoteKey, pendingEntry, setAssessments, guideOpen };
}

const ShellContext = createContext<ReturnType<typeof useShellState> | null>(null);
export function useAppData() {
  const context = useContext(ShellContext);
  if (!context) throw new Error("Page requires the persistent application shell");
  return context;
}
function DashboardShell({ children }: { children: React.ReactNode }) {
  const state = useShellState();
  const { activeNav, setTickets, ticketsReady, clientTickets, setPendingNoteKey, setGuideOpen, handover, selectTicket, openTicketCreate, handleNavigate, mobileNavOpen, setMobileNavOpen, shiftPanelOpen, setShiftPanelOpen, sidebarCollapsed, setSidebarCollapsed, openTicketCount, searchOpen, setSearchOpen, ticketModalOpen, setTicketModalOpen, loadedOverlays, activeClient, activeClientId, notify, addNotification, selectedTicketId, selectedTicket, closeTicket, pendingNoteKey, pendingEntry, setAssessments, guideOpen } = state;

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
          onRefresh={() => handover.refresh()}
          onNavigate={handleNavigate}
          onOpenHandover={() => handover.openActive()}
        />

        <div className="page-content max-w-[1600px] w-full mx-auto pt-[28px] px-[32px] pb-[44px] [contain:layout_style] max-[1240px]:px-[22px] max-[660px]:pt-[18px] max-[660px]:px-[16px] max-[660px]:pb-[36px]">
          <div className="page-view-enter">
            {children}
          </div>
        </div>
      </section>

      {/* ── Floating Action Button: New Ticket (persists across all pages & viewport fixed) ── */}
      <FloatingNewTicketButton onClick={openTicketCreate} isOpen={ticketModalOpen} />

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
            onCreate={(ticket) => {
              const ticketWithClient: Ticket = {
                ...ticket,
                clientId: activeClientId,
              };
              setTickets((previous) => [ticketWithClient, ...previous]);
              notify.success(`Ticket #${ticket.id} berhasil dibuat dan dicatat untuk ${activeClient.shortName}.`, { id: `ticket-${ticket.id}` });
              const slaEval = evaluateTicketSlaStatus(ticketWithClient);
              if (slaEval.status === "breached") {
                addNotification({
                  title: `SLA Breach: Tiket #${ticket.id} terlampaui`,
                  message: `Waktu penanganan (${slaEval.actualMinutes}m) melampaui SLA ${slaEval.targetMinutes}m pada tiket "${ticket.subject}".`,
                  category: "SLA",
                  project: ticket.project,
                  severity: "critical",
                  unread: true,
                  clientId: activeClientId,
                });
              } else if (slaEval.status === "approaching") {
                addNotification({
                  title: `Peringatan SLA: Tiket #${ticket.id} mendekati batas waktu`,
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
            onUpdate={(updated) => {
              setTickets((previous) => previous.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
              const slaEval = evaluateTicketSlaStatus(updated);
              if (slaEval.status === "breached") {
                addNotification({
                  title: `SLA Breach: Tiket #${updated.id} terlampaui`,
                  message: `Waktu penanganan (${slaEval.actualMinutes}m) melampaui SLA ${slaEval.targetMinutes}m pada tiket "${updated.subject}".`,
                  category: "SLA",
                  project: updated.project,
                  severity: "critical",
                  unread: true,
                  clientId: activeClientId,
                });
              } else if (slaEval.status === "approaching") {
                addNotification({
                  title: `Peringatan SLA: Tiket #${updated.id} mendekati batas waktu`,
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
