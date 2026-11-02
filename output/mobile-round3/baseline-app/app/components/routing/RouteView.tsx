"use client";
import { lazy, Suspense, useSyncExternalStore } from 'react';
import { useAppData } from './AppShell';
import {
  DashboardSkeleton,
  TicketsTableSkeleton,
  MonitoringScheduleSkeleton,
  ShiftLogSkeleton,
  ReportsSkeleton,
  TeamRosterSkeleton,
  RunbooksSkeleton,
  MasterDataSkeleton,
} from '@/app/components/ui/skeleton';

const OverviewView = lazy(() => import('../views/OverviewView').then(m => ({ default: m.OverviewView })));
const TicketsView = lazy(() => import('../views/TicketsView').then(m => ({ default: m.TicketsView })));
const MonitoringView = lazy(() => import('../views/MonitoringView').then(m => ({ default: m.MonitoringView })));
const ShiftLogView = lazy(() => import('../views/ShiftLogView').then(m => ({ default: m.ShiftLogView })));
const ReportsView = lazy(() => import('../views/ReportsView').then(m => ({ default: m.ReportsView })));
const TeamRosterView = lazy(() => import('../views/TeamRosterView').then(m => ({ default: m.TeamRosterView })));
const ProfileView = lazy(() => import('../views/ProfileView').then(m => ({ default: m.ProfileView })));
const NotificationsView = lazy(() => import('../views/NotificationsView').then(m => ({ default: m.NotificationsView })));
const RunbooksView = lazy(() => import('../views/RunbooksView').then(m => ({ default: m.RunbooksView })));
const MasterDataView = lazy(() => import('../views/MasterDataView').then(m => ({ default: m.MasterDataView })));

function getSkeletonForPage(page: Parameters<typeof RouteView>[0]['page']) {
  switch (page) {
    case 'overview':
      return <DashboardSkeleton />;
    case 'tickets':
      return <TicketsTableSkeleton />;
    case 'monitoring':
      return <MonitoringScheduleSkeleton />;
    case 'shiftLog':
      return <ShiftLogSkeleton />;
    case 'reports':
      return <ReportsSkeleton />;
    case 'teamRoster':
      return <TeamRosterSkeleton />;
    case 'runbooks':
      return <RunbooksSkeleton />;
    case 'masterData':
      return <MasterDataSkeleton />;
    default:
      return <DashboardSkeleton />;
  }
}

export function RouteView({ page }: { page: 'overview' | 'tickets' | 'monitoring' | 'shiftLog' | 'reports' | 'teamRoster' | 'profile' | 'notifications' | 'runbooks' | 'masterData' }) {
  // vinext resolves the SSR page subtree ahead of the client shell. Match the
  // hydration snapshot with a skeleton, then consume the mounted shell context.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? <MountedRouteView page={page} /> : getSkeletonForPage(page);
}
const subscribe = () => () => {};

function MountedRouteView({ page }: { page: Parameters<typeof RouteView>[0]['page'] }) {
  const d = useAppData();
  const fallback = getSkeletonForPage(page);

  return (
    <Suspense fallback={fallback}>
      {page === 'overview' && <OverviewView tickets={d.clientTickets} allTickets={d.tickets} onGoToTickets={() => d.handleNavigate('Tickets')} />}
      {page === 'tickets' && <TicketsView tickets={d.clientTickets} onSelectTicket={d.selectTicket} onNewTicket={d.openTicketCreate} />}
      {page === 'monitoring' && <MonitoringView assessments={d.assessments} onAssess={d.handleAssess} onRequestNote={d.setPendingNoteKey} onUpdateNote={d.handleUpdateNote} onOpenGuide={() => d.setGuideOpen(true)} currentHour={d.currentHour} />}
      {page === 'shiftLog' && <ShiftLogView workflow={d.handover} />}
      {page === 'reports' && <ReportsView tickets={d.clientTickets} assessments={d.assessments} handoverCount={d.handover.allTotal} />}
      {page === 'teamRoster' && <TeamRosterView members={d.members} onMembersChange={d.setMembers} />}
      {page === 'profile' && <ProfileView />}
      {page === 'notifications' && <NotificationsView />}
      {page === 'runbooks' && <RunbooksView />}
      {page === 'masterData' && <MasterDataView />}
    </Suspense>
  );
}
