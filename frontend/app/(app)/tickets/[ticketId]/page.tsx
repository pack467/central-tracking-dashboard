import type { Metadata } from "next";
export async function generateMetadata({ params }: { params: Promise<{ ticketId: string }> }): Promise<Metadata> {
  const { ticketId } = await params;
  const id = /^[-a-z0-9]{1,50}$/i.test(ticketId) ? ticketId.toUpperCase() : "404";
  return { title: `Detail tiket #${id}` };
}
export default function Page() { return null; }
