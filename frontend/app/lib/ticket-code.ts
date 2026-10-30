import type { Ticket } from "@/app/lib/types";

/**
 * The number shown for a ticket: the backend's third-party ticket id (REQ-2997, TS-856290, HTB-000001) when it has one, otherwise its id.
 * `id` stays the key for URLs, lists and saving: the third-party id is not unique (a few tickets share one).
 */
export const ticketCode = (ticket: Pick<Ticket, "id" | "backend">): string => ticket.backend?.thirdPartyId || ticket.id;
