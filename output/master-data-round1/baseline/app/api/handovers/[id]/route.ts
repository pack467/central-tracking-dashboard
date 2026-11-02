import { getHandoverDb } from "@/db";
import { canEditHandover, HandoverError, parseHandoverContent, updateHandoverRecord } from "@/app/lib/handover";
import { assertSameOrigin, findHandover, handoverActor, handoverFailure, handoverResponse, noteColumns, noteId, readHandoverBody, validatedDraft } from "@/app/lib/handover-server";
import type { HandoverRecordData, StoredHandoverRecord } from "@/app/lib/types";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    handoverActor(request);
    return handoverResponse({ note: await findHandover(noteId((await params).id)) });
  } catch (error) { return handoverFailure(error); }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const actor = handoverActor(request);
    const body = await readHandoverBody(request);
    const current = await findHandover(noteId((await params).id));
    if (body.revision !== current.revision) throw new HandoverError("Catatan telah berubah di sesi lain. Muat ulang catatan sebelum mencoba lagi; draf Anda tetap disimpan.", 409);
    const record = parseHandoverContent(current.content);
    const now = new Date().toISOString();
    let next: HandoverRecordData;
    let date = current.handoverDate;
    if (body.action === "edit") {
      if (!canEditHandover(record, actor)) throw new HandoverError("Hanya pembuat catatan yang dapat merevisi handover.", 403);
      const validated = validatedDraft(body.draft);
      date = validated.date;
      next = { ...validated.record, createdBy: record.createdBy ?? actor, acceptance: null, tasks: validated.record.tasks.map((task) => ({ ...task, completed: false })), auditTrail: [...(record.auditTrail ?? []), { action: record.acceptance ? "reopened" : "edited", actor, at: now }] };
    } else {
      next = updateHandoverRecord(record, actor, String(body.action), body, now);
    }
    const content = JSON.stringify(next);
    if (content.length > 100000) throw new HandoverError("Riwayat catatan terlalu panjang. Buat handover lanjutan.", 413);
    const note = ((await getHandoverDb().prepare(`UPDATE handover_notes SET title = ?, handover_date = ?, content = ?, updated_at = ?, revision = revision + 1 WHERE id = ? AND revision = ? RETURNING ${noteColumns}`)
      .bind(`Handover Shift ${next.sourceShift} → ${next.targetShift}`, date, content, now, current.id, current.revision!).first()) as StoredHandoverRecord | null);
    if (!note) throw new HandoverError("Catatan baru saja berubah. Muat ulang sebelum mencoba lagi.", 409);
    return handoverResponse({ note });
  } catch (error) { return handoverFailure(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const actor = handoverActor(request);
    const current = await findHandover(noteId((await params).id));
    if (!canEditHandover(parseHandoverContent(current.content), actor)) throw new HandoverError("Hanya pembuat catatan yang dapat menghapusnya.", 403);
    const revision = Number(new URL(request.url).searchParams.get("revision"));
    if (revision !== current.revision) throw new HandoverError("Catatan telah berubah. Muat ulang sebelum menghapus.", 409);
    const note = await getHandoverDb().prepare("DELETE FROM handover_notes WHERE id = ? AND revision = ? RETURNING id").bind(current.id, revision).first();
    if (!note) throw new HandoverError("Catatan telah berubah. Muat ulang sebelum menghapus.", 409);
    return handoverResponse({ id: current.id });
  } catch (error) { return handoverFailure(error); }
}
