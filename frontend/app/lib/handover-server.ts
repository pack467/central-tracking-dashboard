import { getHandoverDb } from "@/db";
import type { HandoverDraft, StoredHandoverRecord } from "./types";
import { HandoverError, validateDraft } from "./handover";

export const noteColumns = "id, title, handover_date AS handoverDate, content, created_at AS createdAt, updated_at AS updatedAt, revision";

// identity and origin checks live in handover-auth.ts (testable without the database)
export { assertSameOrigin, requestActor } from "./handover-auth";

export async function readHandoverBody(request: Request) {
  if (Number(request.headers.get("content-length")) > 100000) throw new HandoverError("Catatan terlalu panjang.", 413);
  const raw = await request.text();
  if (raw.length > 100000) throw new HandoverError("Catatan terlalu panjang.", 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { throw new HandoverError("Data permintaan tidak valid."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HandoverError("Data permintaan tidak valid.");
  return body;
}

export function validatedDraft(value: unknown) {
  try {
    const draft = value as HandoverDraft;
    return { record: validateDraft(draft), date: draft.date };
  } catch (error) {
    if (error instanceof HandoverError) throw error;
    throw new HandoverError("Isian handover tidak lengkap atau formatnya salah.");
  }
}

export async function findHandover(id: number) {
  const note = ((await getHandoverDb().prepare(`SELECT ${noteColumns} FROM handover_notes WHERE id = ?`).bind(id).first()) as StoredHandoverRecord | null);
  if (!note) throw new HandoverError("Catatan handover tidak ditemukan.", 404);
  return note;
}

export function noteId(raw: string) {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw new HandoverError("Catatan handover tidak ditemukan.", 404);
  return id;
}

export function handoverResponse(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export function handoverFailure(error: unknown) {
  if (error instanceof HandoverError) return handoverResponse({ error: error.message }, error.status);
  console.error("Handover storage operation failed", error);
  return handoverResponse({ error: "Penyimpanan handover tidak tersedia. Draf tetap aman; coba lagi setelah koneksi pulih." }, 500);
}
