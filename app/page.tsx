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

export default function Home() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </AuthProvider>
  );
}

function Dashboard() {
  const notify = useToast();
  const [activeNav, setActiveNav] = useState("Overview");

  const [tickets, setTickets] = useLocalStorage<Ticket[]>("ctd.tickets", seedTickets);
  const [assessments, setAssessments] = useLocalStorage<Record<string, CheckpointAssessment>>("ctd.checkpoints", {});
  const [acknowledged, setAcknowledged] = useLocalStorage<string[]>("ctd.acknowledged", []);

  const [searchOpen, setSearchOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pendingNoteKey, setPendingNoteKey] = useState<string | null>(null);

  const [members, setMembers] = useState<RosterMember[]>(seedRosterMembers);
  const handover = useHandoverWorkflow({ tickets, assessments, members });
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
    () => tickets.filter(isOpenTicket).length,
    [tickets],
  );



  const handleNavigate = useCallback((nextNav: string) => {
    // Preserve the current view until its on-demand chunk is ready, avoiding a
    // blank content flash while keeping route code out of the initial bundle.
    startTransition(() => setActiveNav(nextNav));
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
    // Migrate or sync seed tickets if older localStorage data still has legacy 2-item history
    setTickets((previous) => {
      const target = previous.find((t) => t.id === "86d4054rh");
      if (
        target &&
        target.history &&
        target.history.length <= 2 &&
        target.history.some((h) => h.action.includes("Status diperbarui menjadi Active"))
      ) {
        const seedTarget = seedTickets.find((t) => t.id === "86d4054rh");
        if (seedTarget && seedTarget.history) {
          return previous.map((t) =>
            t.id === "86d4054rh"
              ? {
                  ...t,
                  history: seedTarget.history,
                  status: seedTarget.status,
                  resolutionMinutes: seedTarget.resolutionMinutes,
                }
              : t,
          );
        }
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
          onRefresh={() => void handover.refresh()}
        />

        <div className="page-content">
          <Suspense fallback={<DashboardViewSkeleton />}>
            {(activeNav === "Overview" || activeNav === "Utama") && (
              <OverviewView
                tickets={tickets}
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
              <TicketsView tickets={tickets} onSelectTicket={selectTicket} onNewTicket={openTicketCreate} />
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
              <ReportsView tickets={tickets} assessments={assessments} handoverCount={handover.allTotal} />
            )}

            {(activeNav === "Team Roster" || activeNav === "Team" || activeNav === "Roster") && <TeamRosterView members={members} onMembersChange={setMembers} />}
          </Suspense>
        </div>
      </section>

      <Suspense fallback={null}>
        {mobileNavOpen && (
          <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} activeNav={activeNav} onNavigate={handleNavigate} handoverRecord={handover.record} />
        )}

        {searchOpen && (
          <CommandPalette
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            tickets={tickets}
            onSelectTicket={selectTicket}
            onNavigate={handleNavigate}
          />
        )}

        {loadedOverlays.ticketCreate && (
          <TicketCreateModal
            open={ticketModalOpen}
            onClose={() => setTicketModalOpen(false)}
            onCreate={(ticket) => {
              setTickets((previous) => [ticket, ...previous]);
              notify.success(`Ticket #${ticket.id} berhasil dibuat dan dicatat.`, { id: `ticket-${ticket.id}` });
            }}
          />
        )}

        {loadedOverlays.ticketDetail && (
          <TicketDetailDrawer
            ticket={selectedTicket}
            onClose={() => setSelectedTicketId(null)}
            onUpdate={(updated) =>
              setTickets((previous) => previous.map((ticket) => (ticket.id === updated.id ? updated : ticket)))
            }
          />
        )}

        {handover.open && (
          <HandoverModal
            workflow={handover}
            tickets={tickets}
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
