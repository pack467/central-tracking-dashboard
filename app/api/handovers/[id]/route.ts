import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { handoverNotes } from "@/db/schema";

type HandoverPayload = {
  title?: unknown;
  handoverDate?: unknown;
  content?: unknown;
};

function getNoteId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validatePayload(payload: HandoverPayload) {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const handoverDate = typeof payload.handoverDate === "string" ? payload.handoverDate.trim() : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";

  if (!title || !handoverDate || !content) {
    return { error: "Data catatan handover tidak lengkap." };
  }

  if (title.length > 160 || handoverDate.length > 20 || content.length > 50000) {
    return { error: "Catatan handover melebihi batas data yang dapat disimpan." };
  }

  try {
    JSON.parse(content);
  } catch {
    return { error: "Isi catatan handover tidak valid." };
  }

  return { title, handoverDate, content };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = getNoteId(rawId);
  if (!id) return Response.json({ error: "Catatan handover tidak ditemukan." }, { status: 404 });

  try {
    const validation = validatePayload((await request.json()) as HandoverPayload);
    if ("error" in validation) return Response.json(validation, { status: 400 });

    const [note] = await getDb()
      .update(handoverNotes)
      .set({
        title: validation.title,
        handoverDate: validation.handoverDate,
        content: validation.content,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(handoverNotes.id, id))
      .returning();

    if (!note) return Response.json({ error: "Catatan handover tidak ditemukan." }, { status: 404 });
    return Response.json({ note });
  } catch {
    return Response.json(
      { error: "Perubahan status handover belum dapat disimpan." },
      { status: 500 },
    );
  }
}
