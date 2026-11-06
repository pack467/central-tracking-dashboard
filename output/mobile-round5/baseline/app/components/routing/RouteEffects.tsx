"use client";
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/auth';
import { Modal } from '@/app/components/ui/Modal';
import { paths, routes, detailId, isActivePath, pathForLabel } from '@/app/lib/routes';

export function RouteEffects() {
  const path = usePathname();
  const previous = useRef(path);
  const positions = useRef(new Map<string, number>());
  const restoring = useRef(false);
  useEffect(() => {
    const scroll = () => positions.current.set(previous.current, window.scrollY);
    const pop = () => { restoring.current = true; };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('scroll', scroll); window.removeEventListener('popstate', pop); };
  }, []);
  useEffect(() => {
    if (previous.current === path) { restoring.current = false; return; }
    const sameList = [
      [paths.tickets, ['escalations']],
      [paths.teamRoster, []],
      [paths.runbooks, ['credentials', 'links', 'escalation']],
    ].some(([base, reserved]) => {
      const root = base as string;
      const exclusions = reserved as string[];
      const wasDetail = detailId(previous.current, root, exclusions);
      const isDetail = detailId(path, root, exclusions);
      return (wasDetail || isDetail) && isActivePath(path, root) && isActivePath(previous.current, root);
    });
    if (!sameList) window.scrollTo(0, restoring.current ? positions.current.get(path) ?? 0 : 0);
    previous.current = path;
    restoring.current = false;
    let focused: HTMLElement | null = null;
    const focus = () => {
      const heading = document.querySelector<HTMLElement>('.page-content h1');
      if (!heading || sameList || heading === focused) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      focused = heading;
    };
    // Observe the incoming heading even when the previous page stays visible
    // while the router resolves its RSC payload or a lazy view loads.
    const observer = new MutationObserver(focus);
    observer.observe(document.querySelector('.page-content') ?? document.body, { childList: true, subtree: true });
    const timer = setTimeout(focus, 100);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [path]);
  // Fragments are never sent to the server; support the old profile bookmarks here.
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash.slice(1).toLowerCase();
    if (['profile', 'profil'].includes(hash)) router.replace(paths.profile);
    else if (['dashboard', 'tickets', 'monitoring', 'reports', 'runbooks'].includes(hash)) router.replace(pathForLabel(hash[0].toUpperCase() + hash.slice(1)));
  }, [router]);
  return null;
}
export function AuthGuard() {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace(routes.login(query ? `${pathname}?${query}` : pathname));
  }, [ready, user, pathname, query, router]);
  return null;
}
export function DetailNotFound({ title, href }: { title: string; href: string }) {
  const router = useRouter();
  return <Modal open label={title} onClose={() => router.push(href, { scroll: false })}>
      <p className="font-mono text-accent-blue">404</p><h2 className="mt-2 text-xl font-bold">{title}</h2>
      <p className="my-4 text-sm text-ink-secondary">ID tidak tersedia pada data aplikasi.</p>
      <Link className="inline-flex rounded-lg bg-accent-blue px-4 py-2 text-sm font-semibold text-slate-950 focus-visible:ring-2" href={href} scroll={false}>Kembali ke daftar</Link>
  </Modal>;
}
