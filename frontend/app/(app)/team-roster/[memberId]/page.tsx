import type { Metadata } from "next";
export async function generateMetadata({ params }: { params: Promise<{ memberId: string }> }): Promise<Metadata> {
  const { memberId } = await params;
  const id = /^[-a-z0-9]{1,50}$/i.test(memberId) ? memberId.toUpperCase() : "404";
  return { title: `Detail anggota #${id}` };
}
export default function Page() { return null; }
