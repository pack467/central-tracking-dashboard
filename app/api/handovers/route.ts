import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { handoverNotes } from "@/db/schema";

type HandoverPayload = {
  title?: unknown;
  handoverDate?: unknown;
  content?: unknown;
};

function validatePayload(payload: HandoverPayload) {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const handoverDate = typeof payload.handoverDate === "string" ? payload.handoverDate.trim() : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";

  if (!title || !handoverDate || !content) {
    return { error: "Judul, tanggal, dan isi catatan handover wajib diisi." };
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

export async function GET() {
  try {
    const notes = await getDb()
      .select()
      .from(handoverNotes)
      .orderBy(desc(handoverNotes.handoverDate), desc(handoverNotes.id))
      .limit(40);

    return Response.json({ notes });
  } catch {
    return Response.json(
      { error: "Catatan handover belum dapat dimuat. Coba lagi beberapa saat lagi." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const validation = validatePayload((await request.json()) as HandoverPayload);
    if ("error" in validation) return Response.json(validation, { status: 400 });

    const [note] = await getDb()
      .insert(handoverNotes)
      .values({
        title: validation.title,
        handoverDate: validation.handoverDate,
        content: validation.content,
      })
      .returning();

    return Response.json({ note }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Catatan handover belum dapat disimpan. Periksa koneksi lalu coba lagi." },
      { status: 500 },
    );
  }
}
