import type { Metadata } from "next";
export async function generateMetadata({ params }: { params: Promise<{ runbookId: string }> }): Promise<Metadata> {
  const { runbookId } = await params;
  const id = /^[-a-z0-9]{1,50}$/i.test(runbookId) ? runbookId.toUpperCase() : "404";
  return { title: `Detail SOP #${id}` };
}
export default function Page() { return null; }
