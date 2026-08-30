"use client";

import { lazy, startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "@/app/components/layout/Sidebar";
import { Topbar } from "@/app/components/layout/Topbar";
import { OverviewView } from "@/app/components/views/OverviewView";
import { ToastProvider, useToast } from "@/app/components/ui/Toast";
import { useCurrentHour } from "@/app/hooks/useLiveClock";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import {
  createHandoverDraft,
  initialHandoverRecord,
  initialHandoverTasks,
  seedTickets,
  toDateInputValue,
} from "@/app/lib/data";
import type { CheckpointAssessment, StoredHandoverRecord, Ticket } from "@/app/lib/types";

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
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}

function Dashboard() {
  const notify = useToast();
  const [activeNav, setActiveNav] = useState("Overview");
  const [theme, setTheme] = useLocalStorage<"dark" | "light">("ctd.theme", "light");
  const [tickets, setTickets] = useLocalStorage<Ticket[]>("ctd.tickets", seedTickets);
  const [assessments, setAssessments] = useLocalStorage<Record<string, CheckpointAssessment>>("ctd.checkpoints", {});
  const [acknowledged, setAcknowledged] = useLocalStorage<string[]>("ctd.acknowledged", []);

  const [searchOpen, setSearchOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pendingNoteKey, setPendingNoteKey] = useState<string | null>(null);

  const [handoverOpen, setHandoverOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDraft, setWizardDraft] = useState(() => createHandoverDraft());
  const [wizardDirty, setWizardDirty] = useState(false);
  const [wizardSaving, setWizardSaving] = useState(false);
  const [records, setRecords] = useState<StoredHandoverRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null);
  const [activeRecord, setActiveRecord] = useState(initialHandoverRecord);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  );

  // The schedule only changes its live marker on the hour; keeping this
  // separate from the second-by-second top-bar clock prevents a full dashboard
  // render every second.
  const currentHour = useCurrentHour();

  const openTicketCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === "Aktivitas" || ticket.status === "Activity" || ticket.status === "Open").length,
    [tickets],
  );

  const lastThemeToggleRef = useRef<number>(0);

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

  const selectTicket = useCallback((ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
  }, []);

  const handleToggleTheme = useCallback(() => {
    const now = Date.now();
    // 300ms debounce/throttle safeguard against rapid repeated clicks
    if (now - lastThemeToggleRef.current < 300) {
      return;
    }
    lastThemeToggleRef.current = now;

    setTheme((prevTheme) => {
      const nextTheme = prevTheme === "dark" ? "light" : "dark";
      notify.success(`Mode tema diubah menjadi ${nextTheme === "dark" ? "gelap" : "terang"}.`, {
        id: "theme-toggle",
      });
      return nextTheme;
    });
  }, [notify, setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/handovers");
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as { notes: StoredHandoverRecord[] };
        setRecords(payload.notes);
      } catch {
        notify.warning("Catatan handover belum dapat dimuat. Anda tetap dapat membuat catatan baru.", {
          id: "handover-load-error",
        });
      } finally {
        setRecordsLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handoverTasks = activeRecord.tasks;
  const handoverProgressPercent = useMemo(
    () =>
      handoverTasks.length
        ? Math.round((handoverTasks.filter((task) => task.completed).length / handoverTasks.length) * 100)
        : 0,
    [handoverTasks],
  );
  const handoverPendingCount = useMemo(() => handoverTasks.filter((task) => !task.completed).length, [handoverTasks]);

  const activateStoredHandover = useCallback((stored: StoredHandoverRecord) => {
    try {
      setActiveRecord(JSON.parse(stored.content));
      setActiveRecordId(stored.id);
      setHandoverOpen(true);
    } catch {
      notify.critical("Catatan handover ini tidak dapat dibuka.", { id: "handover-open-error" });
    }
  }, [notify]);

  const openNewWizard = useCallback(() => {
    setWizardDraft(createHandoverDraft({ ...initialHandoverRecord, tasks: initialHandoverTasks }, toDateInputValue()));
    setWizardDirty(false);
    setWizardOpen(true);
  }, []);

  const toggleHandoverTask = async (taskId: number) => {
    const next = {
      ...activeRecord,
      tasks: activeRecord.tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)),
    };
    setActiveRecord(next);
    if (!activeRecordId) return;
    try {
      const response = await fetch(`/api/handovers/${activeRecordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Handover Shift ${next.sourceShift} → ${next.targetShift}`,
          handoverDate: toDateInputValue(),
          content: JSON.stringify(next),
        }),
      });
      const payload = (await response.json()) as { note?: StoredHandoverRecord };
      if (!response.ok || !payload.note) throw new Error();
      setRecords((previous) => previous.map((note) => (note.id === payload.note!.id ? payload.note! : note)));
    } catch {
      notify.critical("Perubahan konfirmasi belum tersimpan. Coba lagi.", { id: "handover-save-error" });
    }
  };

  const saveWizardDraft = async () => {
    const tasks = wizardDraft.tasks.filter((task) => task.title.trim());
    if (!wizardDraft.date || !wizardDraft.sourcePic.trim() || !wizardDraft.targetPic.trim() || !tasks.length) {
      notify.warning("Isi tanggal, PIC pengirim, PIC penerima, dan minimal satu tugas handover.", {
        id: "handover-wizard-validation",
      });
      return;
    }
    const record = {
      sourceShift: wizardDraft.sourceShift.trim() || "Shift sebelumnya",
      targetShift: wizardDraft.targetShift.trim() || "Shift berikutnya",
      sourcePic: wizardDraft.sourcePic.trim(),
      targetPic: wizardDraft.targetPic.trim(),
      monitoringSummary: wizardDraft.monitoringSummary.trim() || "Monitoring belum dicatat.",
      monitoringOwner: wizardDraft.monitoringOwner.trim() || wizardDraft.sourcePic.trim(),
      monitoredProjects: wizardDraft.monitoredProjects.split(",").map((p) => p.trim()).filter(Boolean),
      validationNote: wizardDraft.validationNote.trim() || "Menunggu validasi shift penerima.",
      findings: wizardDraft.findings.filter((finding) => finding.title.trim() || finding.detail.trim()),
      tasks,
    };
    setWizardSaving(true);
    try {
      const response = await fetch("/api/handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Handover Shift ${record.sourceShift} → ${record.targetShift}`,
          handoverDate: wizardDraft.date,
          content: JSON.stringify(record),
        }),
      });
      const payload = (await response.json()) as { note?: StoredHandoverRecord; error?: string };
      if (!response.ok || !payload.note) throw new Error(payload.error);
      setRecords((previous) => [payload.note!, ...previous]);
      setActiveRecordId(payload.note.id);
      setActiveRecord(record);
      setWizardOpen(false);
      setHandoverOpen(true);
      notify.success("Catatan handover baru berhasil disimpan dan siap dikonfirmasi.", {
        id: "handover-wizard-status",
      });
    } catch {
      notify.critical("Catatan handover belum dapat disimpan. Periksa koneksi lalu coba lagi.", {
        id: "handover-wizard-status",
      });
    } finally {
      setWizardSaving(false);
    }
  };

  const deleteHandoverRecord = async (id: number) => {
    const response = await fetch(`/api/handovers/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error();
    setRecords((previous) => previous.filter((record) => record.id !== id));
    if (activeRecordId === id) setActiveRecordId(null);
  };

  return (
    <main className={`app-shell ${mobileNavOpen ? "nav-locked" : ""}`}>
      <Sidebar
        activeNav={activeNav}
        onNavigate={handleNavigate}
        onOpenHandover={() => setHandoverOpen(true)}
        openTicketCount={openTicketCount}
        handoverRecord={activeRecord}
      />

      <section className="workspace">
        <Topbar
          activeNav={activeNav}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onRefresh={() => {
            // Re-sync active handover data and storage
            setRecordsLoading(true);
            setTimeout(() => setRecordsLoading(false), 300);
          }}
        />

        <div className="page-content">
          <Suspense fallback={null}>
            {(activeNav === "Overview" || activeNav === "Utama") && (
              <OverviewView
                tickets={tickets}
                assessments={assessments}
                acknowledged={acknowledged}
                onAcknowledge={acknowledgeAttention}
                onUnacknowledge={unacknowledgeAttention}
                currentHour={currentHour}
                handoverRecord={activeRecord}
                handoverPendingCount={handoverPendingCount}
                handoverProgressPercent={handoverProgressPercent}
                handoverSavedLabel={activeRecordId ? `${activeRecord.sourceShift} → ${activeRecord.targetShift}` : null}
                onAssess={handleAssess}
                onRequestNote={setPendingNoteKey}
                onOpenGuide={() => setGuideOpen(true)}
                onGoToTickets={() => handleNavigate("Tickets")}
                onGoToMonitoring={() => handleNavigate("Monitoring")}
                onSelectTicket={selectTicket}
                onNewTicket={() => setTicketModalOpen(true)}
                onExportReport={() => {
                  handleNavigate("Reports");
                  notify.info("Buka tab Laporan untuk mengekspor ringkasan operasional.", { id: "report-tab-hint" });
                }}
                onOpenHandover={() => setHandoverOpen(true)}
                onCreateHandover={openNewWizard}
              />
            )}

            {(activeNav === "Tickets" || activeNav === "Ticket") && (
              <TicketsView tickets={tickets} onSelectTicket={selectTicket} onNewTicket={() => setTicketModalOpen(true)} />
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
              <ShiftLogView records={records} loading={recordsLoading} onOpenRecord={activateStoredHandover} onDeleteRecord={deleteHandoverRecord} />
            )}

            {(activeNav === "Reports" || activeNav === "Laporan") && (
              <ReportsView tickets={tickets} assessments={assessments} handoverCount={records.length} />
            )}

            {(activeNav === "Team Roster" || activeNav === "Team" || activeNav === "Roster") && <TeamRosterView />}
          </Suspense>
        </div>
      </section>

      <Suspense fallback={null}>
        {mobileNavOpen && (
          <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} activeNav={activeNav} onNavigate={handleNavigate} handoverRecord={activeRecord} />
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

        {ticketModalOpen && (
          <TicketCreateModal
            open={ticketModalOpen}
            onClose={() => setTicketModalOpen(false)}
            onCreate={(ticket) => {
              setTickets((previous) => [ticket, ...previous]);
              notify.success(`Ticket #${ticket.id} berhasil dibuat dan dicatat.`, { id: `ticket-${ticket.id}` });
            }}
          />
        )}

        {selectedTicket && (
          <TicketDetailDrawer
            ticket={selectedTicket}
            onClose={() => setSelectedTicketId(null)}
            onUpdate={(updated) =>
              setTickets((previous) => previous.map((ticket) => (ticket.id === updated.id ? updated : ticket)))
            }
          />
        )}

        {handoverOpen && (
          <HandoverModal
            open={handoverOpen}
            onClose={() => setHandoverOpen(false)}
            record={activeRecord}
            records={records}
            loading={recordsLoading}
            activeRecordId={activeRecordId}
            onOpenStored={activateStoredHandover}
            onToggleTask={(id) => void toggleHandoverTask(id)}
            onCreateNew={() => {
              setHandoverOpen(false);
              openNewWizard();
            }}
          />
        )}

        {wizardOpen && (
          <HandoverWizard
            open={wizardOpen}
            draft={wizardDraft}
            dirty={wizardDirty}
            onDraftChange={(updater) => {
              setWizardDirty(true);
              setWizardDraft((previous) => updater(previous));
            }}
            onClose={() => setWizardOpen(false)}
            onSave={() => void saveWizardDraft()}
            saving={wizardSaving}
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
