"use client";

import { useState, type FormEvent } from "react";
import { Check, CircleAlert, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { CardHeading, PROFILE_CARD } from "@/app/components/profile/ProfileCard";
import { useToast } from "@/app/components/ui/Toast";
import { AuthError, changePasswordRequest } from "@/app/lib/auth-api";
import { useAuth } from "@/app/lib/auth";
import { passwordChecks, passwordStrength } from "@/app/lib/password-rules";

const STRENGTH_COLOR = ["", "bg-red-400", "bg-amber-400", "bg-emerald-400"];
const STRENGTH_TEXT = ["", "text-red-300", "text-amber-300", "text-emerald-300"];

function PasswordField({ id, label, value, onChange, autoComplete, disabled }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string; disabled: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[12.5px] font-semibold text-[var(--ink-secondary)]">{label}</label>
      <div className="relative">
        <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" aria-hidden="true" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          className="h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--input-bg)] pl-[38px] pr-11 text-[13px] text-[var(--ink-primary)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none disabled:opacity-50"
        />
        <button type="button" onClick={() => setVisible((shown) => !shown)} disabled={disabled} aria-label={visible ? `Sembunyikan ${label}` : `Tampilkan ${label}`} aria-pressed={visible} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-[var(--ink-muted)] transition-colors duration-150 hover:text-[var(--ink-primary)]">
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

export function PasswordCard() {
  const notify = useToast();
  const { mode, recheckSession } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);

  const checks = passwordChecks(current, next, confirmation);
  const strength = passwordStrength(next);
  const ready = Boolean(current) && checks.every((check) => check.ok);

  // the card keeps the reason on screen; the notification makes sure it is seen
  const fail = (message: string) => {
    setError(message);
    setChanged(false);
    notify.critical(message, { id: "password-result", duration: 6000 });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!ready) {
      const missing = checks.filter((check) => !check.ok).map((check) => check.label).join(", ");
      fail(!current ? "Password belum disimpan: isi password saat ini." : `Password belum disimpan. Yang kurang: ${missing}.`);
      return;
    }
    setSaving(true);
    setError("");
    setChanged(false);
    try {
      await changePasswordRequest(current, next);
      // nothing of a password stays in memory longer than it has to
      setCurrent(""); setNext(""); setConfirmation("");
      setChanged(true);
      notify.success("Password berhasil diganti.", { id: "password-result" });
    } catch (cause) {
      fail(cause instanceof AuthError ? cause.message : "Password belum dapat diganti. Coba lagi.");
      if (cause instanceof AuthError && cause.kind === "unavailable") void recheckSession();
    } finally { setSaving(false); }
  };

  return (
    <section className={PROFILE_CARD} aria-labelledby="profile-password-title">
      <CardHeading id="profile-password-title" icon={<KeyRound size={17} />} title="Ganti Password" hint="Setelah diganti, perangkat lain yang sedang login akan otomatis keluar." />

      {mode === "demo" ? (
        <p className="m-0 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[12.5px] leading-[1.5] text-[var(--ink-secondary)]">Akun demo tidak punya password yang bisa diganti. Login dengan akun backend untuk memakai fitur ini.</p>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="flex flex-1 flex-col gap-3.5">
          {/* lets a password manager save the new password against the right account */}
          <PasswordField id="profile-current-password" label="Password saat ini" value={current} onChange={(value) => { setCurrent(value); setError(""); setChanged(false); }} autoComplete="current-password" disabled={saving} />
          <div className="grid gap-1.5">
            <PasswordField id="profile-new-password" label="Password baru" value={next} onChange={(value) => { setNext(value); setError(""); setChanged(false); }} autoComplete="new-password" disabled={saving} />
            {/* always there, so the card does not jump at the first letter typed */}
            <div className="flex min-h-[18px] items-center gap-2.5" aria-live="polite">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[1, 2, 3].map((bar) => <span key={bar} className={`h-1 flex-1 rounded-full transition-colors duration-150 ${bar <= strength.level ? STRENGTH_COLOR[strength.level] : "bg-[var(--line)]"}`} />)}
              </div>
              {strength.label && <span className={`min-w-[78px] text-right text-[11.5px] font-semibold ${STRENGTH_TEXT[strength.level]}`}>{strength.label}</span>}
            </div>
          </div>
          <PasswordField id="profile-confirm-password" label="Ulangi password baru" value={confirmation} onChange={(value) => { setConfirmation(value); setError(""); setChanged(false); }} autoComplete="new-password" disabled={saving} />

          <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1 p-0 max-[420px]:grid-cols-1" aria-label="Syarat password baru">
            {checks.filter((check) => check.key !== "maximum" || !check.ok).map((check) => (
              <li key={check.key} className={`flex min-w-0 items-center gap-2 text-[12px] ${check.ok ? "text-emerald-300" : "text-[var(--ink-muted)]"}`}>
                <span className="grid size-[13px] shrink-0 place-items-center" aria-hidden="true">{check.ok ? <Check size={13} strokeWidth={3} /> : <span className="size-[7px] rounded-full border border-current" />}</span>
                {check.label}
              </li>
            ))}
          </ul>

          {error && <p role="alert" className="m-0 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12.5px] leading-[1.45] text-red-300"><CircleAlert size={14} className="mt-[2px] shrink-0" aria-hidden="true" />{error}</p>}
          {changed && <p role="status" className="m-0 flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12.5px] leading-[1.45] text-emerald-200"><ShieldCheck size={14} className="mt-[2px] shrink-0" aria-hidden="true" />Password diganti. Perangkat lain sudah dikeluarkan, sesi ini tetap aktif.</p>}

          <button type="submit" className="button button-primary mt-auto w-full justify-center" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Password Baru"}</button>
        </form>
      )}
    </section>
  );
}
