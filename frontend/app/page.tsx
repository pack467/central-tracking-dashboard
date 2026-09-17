"use client";

import { lazy, startTransition, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/app/components/layout/Sidebar";
import { Topbar } from "@/app/components/layout/Topbar";
import { OverviewView } from "@/app/components/views/OverviewView";
import { ToastProvider, useToast } from "@/app/components/ui/Toast";
import { useCurrentHour } from "@/app/hooks/useLiveClock";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import {
  isOpenTicket,
  seedTickets,
  seedRosterMembers,
} from "@/app/lib/data";
import type { CheckpointAssessment, RosterMember, Ticket } from "@/app/lib/types";
import { AuthProvider } from "@/app/lib/auth";
import { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";
import { DashboardViewSkeleton } from "@/app/components/ui/LoadingSkeleton";

const MobileNav = lazy(() => import("@/app/components/layout/MobileNav").then((module) => ({ default: module.MobileNav })));
const CommandPalette = lazy(() => import("@/app/components/search/CommandPalette").then((module) => ({ default: module.CommandPalette })));
const TicketCreateModal = lazy(() => import("@/app/components/tickets/TicketCreateModal").then((module) => ({ default: module.TicketCreateModal })));
const TicketDetailDrawer = lazy(() => import("@/app/components/tickets/TicketDetailDrawer").then((module) => ({ default: module.TicketDetailDrawer })));
const HandoverModal = lazy(() => import("@/app/components/handover/HandoverModal").then((module) => ({ default: module.HandoverModal })));
const HandoverWizard = lazy(() => import("@/app/components/handover/HandoverWizard").then((module) => ({ default: module.HandoverWizard })));
const NotAdequateModal = lazy(() => import("@/app/components/dashboard/AssessmentModals").then((module) => ({ default: module.NotAdequateModal })));
const AdequacyGuideModal = lazy(() => import("@/app/components/dashboard/AssessmentModals").then((module) => ({ default: module.AdequacyGuideModal })));
const TicketsView = lazy(() => import("@/app/components/views/TicketsView").then((module) => ({ default: module.TicketsView })));
const MonitoringView = lazy(() => import("@/app/components/views/MonitoringView").then((module) => ({ default: module.MonitoringView })));
const ShiftLogView = lazy(() => import("@/app/components/views/ShiftLogView").then((module) => ({ default: module.ShiftLogView })));
const ReportsView = lazy(() => import("@/app/components/views/ReportsView").then((module) => ({ default: module.ReportsView })));
const TeamRosterView = lazy(() => import("@/app/components/views/TeamRosterView").then((module) => ({ default: module.TeamRosterView })));
const NotificationsView = lazy(() => import("@/app/components/views/NotificationsView").then((module) => ({ default: module.NotificationsView })));
const ProfileView = lazy(() => import("@/app/components/views/ProfileView").then((module) => ({ default: module.ProfileView })));
import {
  NotificationProvider,
  useNotifications,
  evaluateTicketSlaStatus,
} from "@/app/context/NotificationContext";
import { ClientProvider, useClient } from "@/app/context/ClientContext";
import { ALL_COMBINED_SEED_TICKETS, getClientTickets } from "@/app/lib/clientData";

export default function Home() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ClientProvider>
          <NotificationProvider>
            <Dashboard />
          </NotificationProvider>
        </ClientProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

const EMPTY_ASSESSMENTS: Record<string, CheckpointAssessment> = {};
const EMPTY_ACKNOWLEDGED: string[] = [];

export function Dashboard({ initialNav = "Overview" }: { initialNav?: string }) {
  const notify = useToast();
  const { addNotification } = useNotifications();
  const { activeClient, activeClientId } = useClient();
  const [activeNav, setActiveNav] = useState(initialNav);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      const search = new URLSearchParams(window.location.search);
      if (
        hash === "#profile" ||
        hash === "#profil" ||
        search.get("nav")?.toLowerCase() === "profile" ||
        search.get("tab")?.toLowerCase() === "profile"
      ) {
        setActiveNav("Profile");
      }
    }
  }, []);

  const [tickets, setTickets] = useLocalStorage<Ticket[]>("ctd.tickets.v2", ALL_COMBINED_SEED_TICKETS);
  const [assessments, setAssessments] = useLocalStorage<Record<string, CheckpointAssessment>>("ctd.checkpoints", EMPTY_ASSESSMENTS);
  const [acknowledged, setAcknowledged] = useLocalStorage<string[]>("ctd.acknowledged", EMPTY_ACKNOWLEDGED);

  const [searchOpen, setSearchOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pendingNoteKey, setPendingNoteKey] = useState<string | null>(null);

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
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
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

  const handleNavigate = useCallback((nextNav: string) => {
    setActiveNav(nextNav);
    if (typeof window !== "undefined") {
      if (nextNav === "Profile" || nextNav === "Profil") {
        window.history.replaceState(null, "", "#profile");
      } else if (window.location.hash === "#profile" || window.location.hash === "#profil") {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

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

  const acknowledgeAttention = useCallback((title: string) => {
    setAcknowledged((previous) => (previous.includes(title) ? previous : [...previous, title]));
  }, [setAcknowledged]);

  const unacknowledgeAttention = useCallback((title: string) => {
    setAcknowledged((previous) => previous.filter((item) => item !== title));
  }, [setAcknowledged]);

  const markOverlayLoaded = useCallback((overlay: keyof typeof loadedOverlays) => {
    setLoadedOverlays((previous) => (previous[overlay] ? previous : { ...previous, [overlay]: true }));
  }, []);

  const selectTicket = useCallback((ticket: Ticket) => {
    markOverlayLoaded("ticketDetail");
    setSelectedTicketId(ticket.id);
  }, [markOverlayLoaded]);

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
        setSelectedTicketId(null);
        setMobileNavOpen(false);
        setGuideOpen(false);
        setPendingNoteKey(null);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const handoverPendingCount = handover.record.tasks.filter((task) => !task.completed).length;
  const handoverProgressPercent = handover.record.tasks.length
    ? Math.round(((handover.record.tasks.length - handoverPendingCount) / handover.record.tasks.length) * 100)
    : 0;

  return (
    <main className={`app-shell ${mobileNavOpen ? "nav-locked" : ""}`}>
      <Sidebar
        activeNav={activeNav}
        onNavigate={handleNavigate}
        onPrepareHandover={() => handover.openActive()}
        openTicketCount={openTicketCount}
      />

      <section className="workspace">
        <Topbar
          activeNav={activeNav}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onRefresh={() => handover.refresh()}
          onNavigate={handleNavigate}
          onOpenHandover={() => handover.openActive()}
        />

        <div className="page-content">
          <Suspense fallback={<DashboardViewSkeleton />}>
            {(activeNav === "Overview" || activeNav === "Utama") && (
              <OverviewView
                tickets={clientTickets}
                allTickets={tickets}
                assessments={assessments}
                acknowledged={acknowledged}
                onAcknowledge={acknowledgeAttention}
                onUnacknowledge={unacknowledgeAttention}
                currentHour={currentHour}
                handoverRecord={handover.record}
                handoverPendingCount={handoverPendingCount}
                handoverProgressPercent={handoverProgressPercent}
                handoverSavedLabel={handover.active ? `${handover.record.sourceShift} → ${handover.record.targetShift}` : null}
                onAssess={handleAssess}
                onRequestNote={setPendingNoteKey}
                onOpenGuide={() => setGuideOpen(true)}
                onGoToTickets={() => handleNavigate("Tickets")}
                onGoToMonitoring={() => handleNavigate("Monitoring")}
                onGoToNotifications={() => handleNavigate("Notifikasi")}
                onSelectTicket={selectTicket}
                onNewTicket={openTicketCreate}
                onExportReport={() => {
                  handleNavigate("Reports");
                  notify.info("Buka tab Laporan untuk mengekspor ringkasan operasional.", { id: "report-tab-hint" });
                }}
                onOpenHandover={() => handover.openReader()}
                onCreateHandover={() => handover.openWizard("create")}
              />
            )}

            {(activeNav === "Tickets" || activeNav === "Ticket") && (
              <TicketsView tickets={clientTickets} onSelectTicket={selectTicket} onNewTicket={openTicketCreate} />
            )}

            {activeNav === "Monitoring" && (
              <MonitoringView
                assessments={assessments}
                onAssess={handleAssess}
                onRequestNote={setPendingNoteKey}
                onOpenGuide={() => setGuideOpen(true)}
                currentHour={currentHour}
              />
            )}

            {(activeNav === "Shift Log" || activeNav === "Log shift") && (
              <ShiftLogView workflow={handover} />
            )}

            {(activeNav === "Reports" || activeNav === "Laporan") && (
              <ReportsView tickets={clientTickets} assessments={assessments} handoverCount={handover.allTotal} />
            )}

            {(activeNav === "Team Roster" || activeNav === "Team" || activeNav === "Roster") && <TeamRosterView members={members} onMembersChange={setMembers} />}

            {(activeNav === "Notifikasi" || activeNav === "Notifications") && (
              <NotificationsView />
            )}

            {(activeNav === "Profile" || activeNav === "Profil" || activeNav === "Profil Pengguna") && (
              <ProfileView
                onNavigateToShiftSwap={() => handleNavigate("Team Roster")}
                onNavigateToHandover={() => handleNavigate("Shift Log")}
                onNavigateToTickets={() => handleNavigate("Tickets")}
              />
            )}
          </Suspense>
        </div>
      </section>

      <Suspense fallback={null}>
        {mobileNavOpen && (
          <MobileNav
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            activeNav={activeNav}
            onNavigate={handleNavigate}
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

        {loadedOverlays.ticketDetail && (
          <TicketDetailDrawer
            ticket={selectedTicket}
            onClose={() => setSelectedTicketId(null)}
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
  );
}
