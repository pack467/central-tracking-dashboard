/**
 * The "Perlu ditinjau", "Tinjau referensi" and JSON backup/restore features were
 * cancelled by the Master Data scope review (28 Oct 2026). Their code is kept in
 * the tree; this single flag keeps every entry point (menu, header, URL params,
 * filters, chips, usage split) hidden. Flip it to `true` to bring them back.
 */
export const MASTER_DATA_P0_ENABLED: boolean = false;
