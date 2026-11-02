import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const handoverNotes = sqliteTable(
  "handover_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    handoverDate: text("handover_date").notNull(),
    content: text("content").notNull(),
    revision: integer("revision").notNull().default(1),
    createRequestId: text("create_request_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_handover_notes_handover_date").on(table.handoverDate),
    uniqueIndex("idx_handover_notes_create_request").on(table.createRequestId),
  ],
);
