import { paths } from "@/app/lib/routes";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { TeamSection } from "@/app/components/team/TeamSection";
import { TeamBackButton } from "@/app/components/team/TeamBackButton";

export const metadata: Metadata = {
  title: "Our Team — Central Tracking Dashboard",
  description:
    "Profil tim pengembang di balik Central Tracking Dashboard — PT Hutabyte Abhinaya Inovasi.",
};

export default function TeamPage() {
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500/20 selection:text-sky-300 no-scrollbar">
      {/* Background Grid Pattern & Radial Masks */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40 [background-image:linear-gradient(to_right,rgba(51,65,85,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.15)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"
        aria-hidden="true"
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md shrink-0">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          <Link
            href={paths.dashboard}
            className="inline-flex items-center group transition-opacity hover:opacity-90 py-1"
            title="Kembali ke Dashboard Utama"
          >
            <BrandLogo size={26} showText={true} compact={true} />
          </Link>

          <div className="flex items-center gap-3">
            <TeamBackButton />
          </div>
        </div>
      </header>

      {/* Main Content Area: Focus purely on Team Members */}
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar">
        <div className="my-auto w-full">
        <TeamSection
          title="Meet Our Team"
          eyebrow="Tim Pengembang"
          subtitle="Tim inti rekayasa sistem di balik Central Tracking Dashboard."
        />
        </div>
      </main>

      {/* Clean Global Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-3 sm:py-3.5 text-center text-slate-500 shrink-0">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <p className="text-slate-500 font-medium text-[11px] sm:text-xs tracking-wide">
            &copy; {new Date().getFullYear()} PT Hutabyte Abhinaya Inovasi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
