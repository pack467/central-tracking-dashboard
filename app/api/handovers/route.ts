import { getHandoverDb } from "@/db";
import { HandoverError } from "@/app/lib/handover";
import { assertSameOrigin, handoverActor, handoverFailure, handoverResponse, noteColumns, readHandoverBody, validatedDraft } from "@/app/lib/handover-server";
import { initialHandoverRecord, toDateInputValue } from "@/app/lib/data";
import type { HandoverActor, StoredHandoverRecord } from "@/app/lib/types";

async function seedHandoverNotes(db: D1Database) {
  const date = toDateInputValue();
  const now = new Date().toISOString();
  const seedActor: HandoverActor = {
    id: "seed-operator",
    name: "Agnes",
    email: "agnes@company.internal",
    local: true,
  };
  const prevActor: HandoverActor = {
    id: "prev-operator",
    name: "Dedi Prasetyo",
    email: "dedi.prasetyo@company.internal",
    local: true,
  };
  const prevCreatedAt = new Date(Date.now() - 8 * 3600 * 1000).toISOString();
  const prevAcceptedAt = new Date(Date.now() - 7.5 * 3600 * 1000).toISOString();

  // 1. Seed Completed Handover (Shift Malam → Subuh) - Historical Read-Only Record WITH Note
  const completedContent = JSON.stringify({
    sourceShift: "Malam",
    targetShift: "Subuh",
    sourcePic: "Dedi Prasetyo",
    targetPic: "Agnes",
    notes: "Pengecekan sistem monitoring shift malam berjalan lancar. Seluruh gateway, queue distributor, dan log collector dalam batas toleransi aman. Mohon pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi.",
    monitoringSummary: "Pengecekan sistem monitoring shift malam berjalan lancar. Seluruh gateway, queue distributor, dan log collector dalam batas toleransi aman.",
    monitoringOwner: "Dedi Prasetyo",
    monitoredProjects: [...initialHandoverRecord.monitoredProjects],
    validationNote: "Agnes telah memeriksa seluruh checklist dan menerima serah terima shift malam secara penuh.",
    receiverEmail: "agnes@company.internal",
    createdBy: prevActor,
    acceptance: {
      actor: seedActor,
      at: prevAcceptedAt,
    },
    findings: [
      {
        project: "B2B",
        title: "Koneksi gateway B2B sempat mengalami retries",
        detail: "Trafik kembali stabil setelah failover otomatis gateway sekunder.",
        state: "waiting",
      },
    ],
    openTickets: [
      {
        id: "86d4054rh",
        subject: "Antrian pesan ActiveMQ melonjak di atas batas aman",
        project: "ActiveMQ",
        severity: "High",
        priority: "P1 - Critical",
        status: "In Progress",
        owner: "Kristina Marbun",
        source: "Monitoring Check",
        createdAt: "06 Sep 2026, 06:45 WIB",
        updatedAt: "06 Sep 2026, 07:10 WIB",
        description: "Queue distributor mengalami lonjakan trafik pada broker 228. Sedang dalam investigasi failover.",
        agingHours: 3.5,
      },
      {
        id: "86d4055ab",
        subject: "Retry koneksi gateway B2B sekunder",
        project: "B2B",
        severity: "Medium",
        priority: "P2 - Major",
        status: "Open",
        owner: "Dedi Prasetyo",
        source: "Gateway Log",
        createdAt: "06 Sep 2026, 05:30 WIB",
        updatedAt: "06 Sep 2026, 06:15 WIB",
        description: "Trafik dialihkan otomatis ke gateway sekunder, perlu verifikasi kestabilan endpoint.",
        agingHours: 1.8,
      },
    ],
    monitoringCheckpoints: [
      { time: "06:00", project: "B2B", task: "Health check gateway B2B", verdict: "ok", note: "Semua respon stabil" },
      { time: "06:15", project: "SM", task: "Queue distributor check", verdict: "ok", note: "Antrian 0" },
      { time: "06:30", project: "USIEM", task: "Graylog indexer rate", verdict: "ok", note: "Normal" },
      { time: "06:45", project: "ActiveMQ", task: "Broker health check", verdict: "ok", note: "Normal" },
    ],
    tasks: initialHandoverRecord.tasks.map((task, idx) => ({
      ...task,
      completed: true,
      confirmedBy: "Agnes",
      confirmedAt: new Date(Date.now() - (7.6 * 3600 - idx * 60) * 1000).toISOString(),
    })),
    auditTrail: [
      { action: "created", actor: prevActor, at: prevCreatedAt },
      { action: "accepted", actor: seedActor, at: prevAcceptedAt },
    ],
  });

  await db
    .prepare(
      `INSERT INTO handover_notes (title, handover_date, content, create_request_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(create_request_id) DO UPDATE SET content = excluded.content`
    )
    .bind("Handover Shift Malam → Subuh", date, completedContent, "seed-completed-handover", prevCreatedAt, prevAcceptedAt)
    .run();

  // 2. Seed Historical Handover WITHOUT Note (Shift Siang → Malam) - To test empty state
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const yesterdayCreatedAt = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const yesterdayAcceptedAt = new Date(Date.now() - 23.5 * 3600 * 1000).toISOString();
  const yesterdayActor: HandoverActor = {
    id: "yesterday-operator",
    name: "Kristina Marbun",
    email: "kristina.marbun@company.internal",
    local: true,
  };
  const emptyNoteContent = JSON.stringify({
    sourceShift: "Siang",
    targetShift: "Malam",
    sourcePic: "Kristina Marbun",
    targetPic: "Dedi Prasetyo",
    notes: "",
    monitoringSummary: "Semua checkpoint shift siang terpantau normal.",
    monitoringOwner: "Kristina Marbun",
    monitoredProjects: [...initialHandoverRecord.monitoredProjects],
    validationNote: "Diterima oleh Dedi Prasetyo.",
    receiverEmail: "dedi.prasetyo@company.internal",
    createdBy: yesterdayActor,
    acceptance: { actor: prevActor, at: yesterdayAcceptedAt },
    findings: [],
    openTickets: [],
    monitoringCheckpoints: [],
    tasks: initialHandoverRecord.tasks.map((task) => ({ ...task, completed: true })),
    auditTrail: [
      { action: "created", actor: yesterdayActor, at: yesterdayCreatedAt },
      { action: "accepted", actor: prevActor, at: yesterdayAcceptedAt },
    ],
  });

  await db
    .prepare(
      `INSERT INTO handover_notes (title, handover_date, content, create_request_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(create_request_id) DO UPDATE SET content = excluded.content`
    )
    .bind("Handover Shift Siang → Malam", yesterday, emptyNoteContent, "seed-empty-note-handover", yesterdayCreatedAt, yesterdayAcceptedAt)
    .run();

  // 3. Seed Pending Active Handover (Shift Subuh → Pagi) - Active Confirmation Record
  const content = JSON.stringify({
    ...initialHandoverRecord,
    receiverEmail: "galih.khairi@company.internal",
    createdBy: seedActor,
    acceptance: null,
    tasks: initialHandoverRecord.tasks.map((task) => ({ ...task })),
    auditTrail: [
      {
        action: "created",
        actor: seedActor,
        at: now,
      },
    ],
  });
  const title = `Handover Shift ${initialHandoverRecord.sourceShift} → ${initialHandoverRecord.targetShift}`;
  await db
    .prepare(
      `INSERT INTO handover_notes (title, handover_date, content, create_request_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(create_request_id) DO UPDATE SET content = excluded.content`
    )
    .bind(title, date, content, "seed-initial-handover", now, now)
    .run();
}

export async function GET(request: Request) {
  try {
    const actor = handoverActor(request);
    const url = new URL(request.url);
    const page = Math.max(1, Math.min(100000, Math.floor(Number(url.searchParams.get("page")) || 1)));
    const limit = 20;
    const date = (url.searchParams.get("date") ?? "").slice(0, 10);
    const pic = (url.searchParams.get("pic") ?? "").slice(0, 200);
    const where = "WHERE (? = '' OR handover_date = ?) AND (? = '' OR instr(lower(json_extract(content, '$.sourcePic')), lower(?)) > 0)";
    const db = getHandoverDb();

    await seedHandoverNotes(db);

    const [rows, count] = await Promise.all([
      db.prepare(`SELECT ${noteColumns} FROM handover_notes ${where} ORDER BY handover_date DESC, id DESC LIMIT ? OFFSET ?`).bind(date, date, pic, pic, limit, (page - 1) * limit).all(),
      db.prepare(`SELECT count(*) AS total FROM handover_notes ${where}`).bind(date, date, pic, pic).first(),
    ]);
    const notes = ((rows as any)?.results ?? []) as StoredHandoverRecord[];
    const total = Number((count as any)?.total ?? 0);
    return handoverResponse({ notes, total, page, hasMore: page * limit < total, actor });
  } catch (error) { return handoverFailure(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = handoverActor(request);
    const body = await readHandoverBody(request);
    if (typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{10,100}$/.test(body.requestId)) throw new HandoverError("ID draf tidak valid.");
    const { record, date } = validatedDraft(body.draft);
    const requestId = `${actor.id}:${body.requestId}`;
    const db = getHandoverDb();
    const existing = ((await db.prepare(`SELECT ${noteColumns} FROM handover_notes WHERE create_request_id = ?`).bind(requestId).first()) as StoredHandoverRecord | null);
    if (existing) return handoverResponse({ note: existing, replayed: true });
    const now = new Date().toISOString();
    const content = JSON.stringify({ ...record, createdBy: actor, acceptance: null, tasks: record.tasks.map((task) => ({ ...task, completed: false })), auditTrail: [{ action: "created", actor, at: now }] });
    const note = ((await db.prepare(`INSERT INTO handover_notes (title, handover_date, content, create_request_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(create_request_id) DO NOTHING RETURNING ${noteColumns}`)
      .bind(`Handover Shift ${record.sourceShift} → ${record.targetShift}`, date, content, requestId, now, now).first()) as StoredHandoverRecord | null);
    const saved = note ?? ((await db.prepare(`SELECT ${noteColumns} FROM handover_notes WHERE create_request_id = ?`).bind(requestId).first()) as StoredHandoverRecord | null);
    return handoverResponse({ note: saved }, note ? 201 : 200);
  } catch (error) { return handoverFailure(error); }
}
