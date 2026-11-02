"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { parseQuery, serializeQuery, search, type Schema, type Query } from '@/app/lib/query-state';
import { withQuery, isActivePath } from '@/app/lib/routes';

export function useUrlQuery<S extends Schema>(schema: S, scope: boolean | string = true) {
  const pathname = usePathname();
  const enabled = typeof scope === 'string' ? isActivePath(pathname, scope) : scope;
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.toString();
  const signature = JSON.stringify(Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, v.default])));
  // Schema readers supply their enum lists from the active client's data.
  const values = useMemo(() => parseQuery(schema, new URLSearchParams(raw)), [schema, raw]);
  const canonical = serializeQuery(schema, values);
  const pending = useRef<{ pathname: string; raw: string; patch: Partial<Query<S>>; history: 'push' | 'replace' } | null>(null);
  const lastCanonical = useRef('');
  useEffect(() => {
    const key = `${pathname}?${raw}=>${canonical}`;
    if (!enabled) return;
    if (canonical !== raw && lastCanonical.current !== key) {
      lastCanonical.current = key;
      router.replace(withQuery(pathname, canonical), { scroll: false });
    } else if (canonical === raw) lastCanonical.current = '';
  }, [pathname, raw, canonical, router, signature, enabled]);
  const update = useCallback((patch: Partial<Query<S>>, history: 'push' | 'replace' = 'replace') => {
    if (!enabled) return;
    if (pending.current?.pathname === pathname && pending.current.raw === raw) {
      Object.assign(pending.current.patch, patch);
      if (history === 'push') pending.current.history = history;
      return;
    }
    pending.current = { pathname, raw, patch, history };
    queueMicrotask(() => {
      const next = pending.current;
      pending.current = null;
      if (!next) return;
      const query = serializeQuery(schema, { ...values, ...next.patch });
      if (query !== raw) router[next.history](withQuery(pathname, query), { scroll: false });
    });
  }, [pathname, raw, router, schema, values, enabled]);
  const field = <K extends keyof Query<S>>(key: K, history: 'push' | 'replace' = 'replace') => (next: string | number | ((old: Query<S>[K]) => Query<S>[K])) => {
    const value = typeof next === 'function' ? next(values[key]) : next;
    update({ ...(key !== 'page' && 'page' in schema ? { page: 1 } : {}), [key]: value } as Partial<Query<S>>, history);
  };
  return { values, update, field, query: canonical, pathname };
}

/** Draft typing is local; committed operational searches use replace after 300ms. */
export function useUrlSearch(value: string, commit: (value: string) => void) {
  const path = usePathname();
  const [draft, setDraft] = useState<{ path: string; source: string; text: string; committed: boolean; target: string } | null>(null);
  const commitRef = useRef(commit);
  useEffect(() => { commitRef.current = commit; }, [commit]);
  const active = draft?.path === path && (draft.source === value || draft.target === value);
  useEffect(() => {
    if (!active || !draft || draft.committed) return;
    const timer = setTimeout(() => {
      const safe = search.parse(draft.text);
      setDraft({ ...draft, committed: true, target: safe });
      commitRef.current(safe);
    }, 300);
    return () => clearTimeout(timer);
  }, [active, draft]);
  const set = (text: string | null) => setDraft(text === null ? null : { path, source: value, text, committed: false, target: value });
  return { input: active ? draft!.text : value, effective: active && draft!.committed && !search.parse(draft!.text) ? draft!.text : value, set };
}
