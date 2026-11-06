"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Clock, Copy, ImagePlus, Pencil, ShieldCheck, Ticket as TicketIcon } from "lucide-react";
import { useAppData } from "@/app/components/routing/AppShell";
import { Avatar } from "@/app/components/ui/Avatar";
import { Badge } from "@/app/components/ui/Badge";
import { useToast } from "@/app/components/ui/Toast";
import { BioSection } from "@/app/components/profile/BioSection";
import { PasswordCard } from "@/app/components/profile/PasswordCard";
import { PhotoEditorDialog } from "@/app/components/profile/PhotoEditorDialog";
import { CardHeading, PROFILE_CARD } from "@/app/components/profile/ProfileCard";
import { computeScheduleColors } from "@/app/components/team/RosterTable";
import { statusTone } from "@/app/components/tickets/TicketTable";
import { useActiveShift } from "@/app/hooks/useLiveClock";
import { useProfilePhoto } from "@/app/hooks/useProfilePhoto";
import { useUserStatus } from "@/app/hooks/useUserStatus";
import { useWibToday } from "@/app/hooks/useWibToday";
import { useAuth } from "@/app/lib/auth";
import { formatDuration, isTicketOf, permissionLabel, rosterDayIndex, ticketStats } from "@/app/lib/profile-stats";
import { paths, routes } from "@/app/lib/routes";
import { ticketCode } from "@/app/lib/ticket-code";

const RECENT_TICKETS = 10;
const SHIFT_LETTER: Record<string, string> = { Leave: "C", Off: "—" };

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 max-[660px]:flex max-[660px]:items-baseline max-[660px]:justify-between max-[660px]:gap-4">
      <dt className="shrink-0 text-[11.5px] text-[var(--ink-muted)]">{label}</dt>
      <dd className="m-0 mt-0.5 min-w-0 text-[13px] font-medium text-[var(--ink-primary)] [overflow-wrap:anywhere] max-[660px]:mt-0 max-[660px]:text-right">{children}</dd>
    </div>
  );
}

function Stat({ label, value, title, tone = "text-[var(--ink-primary)]" }: { label: string; value: ReactNode; title?: string; tone?: string }) {
  return (
    <div title={title} className="flex min-w-0 flex-col justify-between gap-2 bg-[var(--panel-bg)] px-5 py-4 max-[660px]:px-4">
      <span className="text-[12px] leading-tight text-[var(--ink-muted)]">{label}</span>
      <strong className={`text-[22px] font-semibold leading-tight tracking-[-0.3px] tabular-nums max-[420px]:text-[18px] ${tone}`}>{value}</strong>
    </div>
  );
}

const joinedOn = (value: string | undefined) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }) : null;
};

/** The account of whoever is logged in. Every number here is counted from their own tickets and handover notes. */
export function ProfileView() {
  const notify = useToast();
  const { user } = useAuth();
  const { tickets, ticketsReady, members, handover } = useAppData();
  const activeShift = useActiveShift();
  const todayWib = useWibToday();
  const { userStatus, currentStatusConfig } = useUserStatus();
  const photo = useProfilePhoto(user?.id);
  const [editingPhoto, setEditingPhoto] = useState(false);

  const mine = useMemo(() => (user ? tickets.filter((ticket) => isTicketOf(ticket, user)) : []), [tickets, user]);
  const stats = useMemo(() => ticketStats(mine), [mine]);
  const member = useMemo(() => {
    if (!user) return null;
    const email = user.email.toLowerCase(), name = user.name.toLowerCase().trim();
    return members.find((item) => item.id === user.id || (email && item.email.toLowerCase() === email) || item.name.toLowerCase().trim() === name) ?? null;
  }, [members, user]);
  const scheduled = Boolean(member && member.currentShift !== "Belum dijadwalkan");
  const schedule = useMemo(() => (member && scheduled ? computeScheduleColors(member.weeklySchedule) : []), [member, scheduled]);

  if (!user) return null;

  const copy = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => notify.success(`${label} disalin.`, { id: `copy-${label}` }),
      () => notify.warning(`${label} tidak dapat disalin.`, { id: `copy-${label}` }),
    );
  };
  const joined = joinedOn(user.joinedAt);
  const permissions = user.permissions ?? [];
  const counted = (value: ReactNode) => (ticketsReady ? value : "—");
  const todayIndex = rosterDayIndex(todayWib);
  const todayEntry = schedule[todayIndex];
  // the person's own shift today; without a schedule the shift running now is only context, unless they are on it
  const shiftToday = todayEntry
    ? todayEntry.shift === "Off" ? { title: "Libur", detail: "Tidak ada shift hari ini." }
    : todayEntry.shift === "Leave" ? { title: "Cuti", detail: "Tidak ada shift hari ini." }
    : { title: `Shift ${todayEntry.shift}`, detail: todayEntry.hours ? `${todayEntry.hours} WIB` : "" }
    : handover.isOnActiveShift ? { title: activeShift.label, detail: activeShift.period }
    : { title: "Belum dijadwalkan", detail: `Sedang berjalan: ${activeShift.label}, ${activeShift.period}` };
  const todayLabel = new Date(`${todayWib}T12:00:00+07:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

  return (
    <div className="flex w-full flex-col gap-5">
      <section className="page-heading">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[1px] text-[var(--ink-muted)]">
          <span className="live-dot live-dot-pulse" /> AKUN SAYA
        </div>
        <h1 className="m-[6px_0_4px] text-[24px] font-bold leading-[1.2] tracking-[-0.4px] text-[var(--ink-primary)]">Profil</h1>
        <p className="m-0 text-[13px] text-[var(--ink-secondary)]">Identitas, aktivitas, dan keamanan akun Anda.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] bg-[radial-gradient(ellipse_70%_140%_at_0%_0%,rgba(56,189,248,0.13),transparent_70%)]" aria-label="Identitas akun">
        <div className="flex items-center gap-5 px-6 py-5 max-[660px]:flex-col max-[660px]:gap-3 max-[660px]:px-4 max-[660px]:text-center">
          <div className="relative shrink-0">
            <span
              className="block rounded-full p-[2px]"
              style={{ background: currentStatusConfig.color, boxShadow: `0 0 14px ${currentStatusConfig.glow}` }}
              title={`Status: ${userStatus}`}
            >
              <span className="block rounded-full bg-[var(--panel-bg)] p-[3px]">
                <Avatar name={user.name} size={76} photo={photo} ariaLabel={`Foto profil ${user.name}`} />
              </span>
            </span>
            {/* the same colour as the ring; the status is said in words next to the name */}
            <span data-status-dot aria-hidden="true" className="absolute bottom-[3px] right-[3px] size-[18px] rounded-full border-[3px] border-[var(--panel-bg)]" style={{ background: currentStatusConfig.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 max-[660px]:justify-center">
              <h2 className="m-0 text-[21px] font-bold leading-tight tracking-[-0.3px] text-[var(--ink-primary)] [overflow-wrap:anywhere] max-[660px]:text-[19px]">{user.name}</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ color: currentStatusConfig.color, background: currentStatusConfig.badgeBg, borderColor: `${currentStatusConfig.color}40` }}>
                <span className="size-[6px] rounded-full" style={{ background: currentStatusConfig.color }} aria-hidden="true" />{userStatus}
              </span>
            </div>
            <p className="m-0 mt-1 text-[13px] text-[var(--ink-secondary)]">{user.role}</p>
          </div>
          <button type="button" data-photo-button onClick={() => setEditingPhoto(true)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] px-3.5 text-[12.5px] font-semibold leading-none text-[var(--accent-blue)] transition-colors duration-150 hover:border-sky-400 [&>svg]:block [&>svg]:shrink-0">
            {photo ? <Pencil size={14} aria-hidden="true" /> : <ImagePlus size={15} aria-hidden="true" />}
            <span>{photo ? "Edit Foto" : "Tambah Foto"}</span>
          </button>
        </div>
        <BioSection userId={user.id} />
        <dl className="m-0 flex flex-wrap gap-x-12 gap-y-3 border-t border-[var(--line)] px-6 py-4 max-[660px]:flex-col max-[660px]:gap-2.5 max-[660px]:px-4 [&>div]:max-[660px]:w-full">
          {user.email && (
            <Fact label="Email">
              <button type="button" onClick={() => copy(user.email, "Email")} title="Salin email" className="inline-flex min-w-0 items-center gap-1.5 text-left font-medium text-[var(--ink-primary)] hover:text-[var(--accent-blue)]">
                <span className="[overflow-wrap:anywhere]">{user.email}</span><Copy size={12} className="shrink-0 opacity-60" aria-hidden="true" />
              </button>
            </Fact>
          )}
          <Fact label="ID karyawan">{user.employeeId}</Fact>
          {user.department && <Fact label="Departemen">{user.department}</Fact>}
          {joined && <Fact label="Bergabung sejak">{joined}</Fact>}
        </dl>
      </section>

      <section className="grid grid-cols-6 gap-px overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--line)] max-[1279px]:grid-cols-3 max-[520px]:grid-cols-2" aria-label="Aktivitas saya">
        <Stat label="Total tiket" value={counted(stats.total)} />
        <Stat label="Masih terbuka" value={counted(stats.open)} tone={stats.open ? "text-amber-300" : undefined} />
        <Stat label="Selesai" value={counted(stats.closed)} />
        <Stat label="Dieskalasi" value={counted(stats.escalated)} />
        <Stat label="Rata-rata selesai" value={counted(formatDuration(stats.averageMinutes))} />
        <Stat label="SLA" title="Tiket selesai yang memenuhi targetnya sendiri: 60 menit untuk High, 120 menit untuk Medium/Low" value={counted(stats.slaRate === null ? "—" : `${stats.slaRate}%`)} />
      </section>

      {/* two rows of two: cards side by side start and end on the same line */}
      <div className="grid gap-5 min-[1180px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className={PROFILE_CARD} aria-label="Tiket terbaru">
          <CardHeading
            icon={<TicketIcon size={17} />}
            title="Tiket Terbaru"
            hint="Tiket atas nama Anda."
            action={mine.length > RECENT_TICKETS && <Link href={paths.tickets} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-[var(--accent-blue)] hover:underline">Semua tiket <ArrowRight size={12} aria-hidden="true" /></Link>}
          />
          {mine.length ? (
            // minmax(0, 1fr): without it the row takes the width of the whole subject and pushes out of the card
            <ul className="-mx-2 m-0 grid list-none grid-cols-[minmax(0,1fr)] divide-y divide-[var(--line)] p-0">
              {mine.slice(0, RECENT_TICKETS).map((ticket) => (
                <li key={ticket.id}>
                  <Link href={routes.ticket(ticket.id)} scroll={false} title={ticket.subject} className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.04] max-[520px]:grid-cols-[minmax(0,1fr)_auto]">
                    <span className="truncate font-mono text-[11.5px] font-bold text-sky-300 max-[520px]:hidden">#{ticketCode(ticket)}</span>
                    <span className="truncate text-[12.5px] text-[var(--ink-primary)]">{ticket.subject}</span>
                    <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--line)] px-3 py-8 text-center text-[12.5px] text-[var(--ink-muted)]">{ticketsReady ? "Belum ada tiket atas nama Anda." : "Memuat tiket…"}</p>
          )}
        </section>

        <PasswordCard />

        <section className={PROFILE_CARD} aria-label="Hak akses">
          <CardHeading icon={<ShieldCheck size={17} />} title="Hak Akses" hint="Nama, email, peran, dan hak akses diatur oleh administrator." />
          {permissions.length > 0 ? (
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {permissions.map((permission) => (
                <li key={permission} className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-[11.5px] text-[var(--ink-secondary)] [overflow-wrap:anywhere]">{permissionLabel(permission)}</li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[12.5px] leading-[1.5] text-[var(--ink-muted)]">Mengikuti peran {user.role}.</p>
          )}
        </section>

        <section className={PROFILE_CARD} aria-label="Shift hari ini">
          <CardHeading icon={<Clock size={17} />} title="Shift Hari Ini" hint={todayLabel} />
          <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-3.5 py-3">
            <div className="min-w-0">
              <strong className="block text-[13.5px] font-semibold text-[var(--ink-primary)]">{shiftToday.title}</strong>
              {shiftToday.detail && <span className="mt-0.5 block text-[12px] text-[var(--ink-muted)]">{shiftToday.detail}</span>}
            </div>
            {handover.isOnActiveShift && <Badge tone="success">Anda bertugas</Badge>}
          </div>
          {scheduled ? (
            <div>
              <span className="mb-2 block text-[12px] font-semibold text-[var(--ink-secondary)]">Minggu ini</span>
              <div className="grid grid-cols-7 gap-1.5">
                {schedule.map((day, index) => (
                  <div key={day.day} aria-current={index === todayIndex ? "date" : undefined} title={`${day.day}: ${day.shift === "Leave" ? "Cuti" : day.shift === "Off" ? "Libur" : day.shift}${day.hours && day.shift !== "Off" ? ` (${day.hours})` : ""}`} className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-center ${index === todayIndex ? "outline outline-2 outline-offset-1 outline-sky-400" : ""}`} style={{ background: day.style.bg, color: day.style.color, borderColor: day.style.border }}>
                    <span className="font-mono text-[10px] font-bold uppercase">{day.day}</span>
                    <span className="font-mono text-[14px] font-extrabold leading-none">{SHIFT_LETTER[day.shift] ?? day.shift[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="m-0 text-[12.5px] leading-[1.5] text-[var(--ink-muted)]">Jadwal mingguan Anda belum diatur. <Link href={paths.teamRoster} className="font-semibold text-[var(--accent-blue)] hover:underline">Buka Team Roster</Link></p>
          )}
        </section>
      </div>

      {/* to the body: inside .page-content (contain: layout) a fixed dialog would be placed against the page, not the screen */}
      {editingPhoto && createPortal(<PhotoEditorDialog userId={user.id} hasPhoto={Boolean(photo)} onClose={() => setEditingPhoto(false)} />, document.body)}
    </div>
  );
}
