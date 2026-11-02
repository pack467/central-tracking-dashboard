# File aplikasi pada tugas Master Data v2

Dibandingkan snapshot frontend/app sebelum pekerjaan, bukan seluruh git diff pengguna.

## Baru

- [frontend/app/components/master-data/master-ui.tsx](../../frontend/app/components/master-data/master-ui.tsx)
- [frontend/app/components/master-data/MasterDetail.tsx](../../frontend/app/components/master-data/MasterDetail.tsx)
- [frontend/app/components/master-data/MasterFilters.tsx](../../frontend/app/components/master-data/MasterFilters.tsx)
- [frontend/app/components/master-data/MasterForm.tsx](../../frontend/app/components/master-data/MasterForm.tsx)
- [frontend/app/components/master-data/MasterList.tsx](../../frontend/app/components/master-data/MasterList.tsx)
- [frontend/app/components/master-data/MasterNavigation.tsx](../../frontend/app/components/master-data/MasterNavigation.tsx)
- [frontend/app/components/master-data/MasterStatusDialog.tsx](../../frontend/app/components/master-data/MasterStatusDialog.tsx)
- [frontend/app/components/tickets/TicketSystemSelect.tsx](../../frontend/app/components/tickets/TicketSystemSelect.tsx)
- [frontend/app/components/ui/MasterProjectName.tsx](../../frontend/app/components/ui/MasterProjectName.tsx)
- [frontend/app/hooks/useMasterData.ts](../../frontend/app/hooks/useMasterData.ts)
- [frontend/app/hooks/useMasterReferences.ts](../../frontend/app/hooks/useMasterReferences.ts)
- [frontend/app/hooks/useMasterRoute.ts](../../frontend/app/hooks/useMasterRoute.ts)
- [frontend/app/lib/master-data-model.ts](../../frontend/app/lib/master-data-model.ts)
- [frontend/app/lib/master-data-route.ts](../../frontend/app/lib/master-data-route.ts)
- [frontend/app/lib/permissions.ts](../../frontend/app/lib/permissions.ts)
- [frontend/app/services/legacy-master-adapter.ts](../../frontend/app/services/legacy-master-adapter.ts)
- [frontend/app/services/master-data-repository.ts](../../frontend/app/services/master-data-repository.ts)
- [frontend/app/services/master-data-v2.ts](../../frontend/app/services/master-data-v2.ts)

## Diubah

- [frontend/app/components/dashboard/MonitoringSchedule.tsx](../../frontend/app/components/dashboard/MonitoringSchedule.tsx)
- [frontend/app/components/dashboard/panel-viewer/CategoryDistributionView.tsx](../../frontend/app/components/dashboard/panel-viewer/CategoryDistributionView.tsx)
- [frontend/app/components/dashboard/panel-viewer/TicketVolumeView.tsx](../../frontend/app/components/dashboard/panel-viewer/TicketVolumeView.tsx)
- [frontend/app/components/dashboard/panel-viewer/UserRecapMobile.tsx](../../frontend/app/components/dashboard/panel-viewer/UserRecapMobile.tsx)
- [frontend/app/components/dashboard/TodayTicketRow.tsx](../../frontend/app/components/dashboard/TodayTicketRow.tsx)
- [frontend/app/components/handover/HandoverModal.tsx](../../frontend/app/components/handover/HandoverModal.tsx)
- [frontend/app/components/handover/ProjectSelect.tsx](../../frontend/app/components/handover/ProjectSelect.tsx)
- [frontend/app/components/monitoring/MonitoringHistorySection.tsx](../../frontend/app/components/monitoring/MonitoringHistorySection.tsx)
- [frontend/app/components/tickets/TicketCreateModal.tsx](../../frontend/app/components/tickets/TicketCreateModal.tsx)
- [frontend/app/components/tickets/TicketDetailDrawer.tsx](../../frontend/app/components/tickets/TicketDetailDrawer.tsx)
- [frontend/app/components/tickets/TicketEditModal.tsx](../../frontend/app/components/tickets/TicketEditModal.tsx)
- [frontend/app/components/tickets/TicketReportView.tsx](../../frontend/app/components/tickets/TicketReportView.tsx)
- [frontend/app/components/tickets/TicketTable.tsx](../../frontend/app/components/tickets/TicketTable.tsx)
- [frontend/app/components/ui/Modal.tsx](../../frontend/app/components/ui/Modal.tsx)
- [frontend/app/components/ui/skeleton/MasterDataSkeleton.tsx](../../frontend/app/components/ui/skeleton/MasterDataSkeleton.tsx)
- [frontend/app/components/views/MasterDataView.tsx](../../frontend/app/components/views/MasterDataView.tsx)
- [frontend/app/components/views/MonitoringView.tsx](../../frontend/app/components/views/MonitoringView.tsx)
- [frontend/app/components/views/ReportsView.tsx](../../frontend/app/components/views/ReportsView.tsx)
- [frontend/app/components/views/TicketsView.tsx](../../frontend/app/components/views/TicketsView.tsx)
- [frontend/app/context/ClientContext.tsx](../../frontend/app/context/ClientContext.tsx)
- [frontend/app/lib/clientData.ts](../../frontend/app/lib/clientData.ts)
- [frontend/app/lib/query-state.ts](../../frontend/app/lib/query-state.ts)
- [frontend/app/lib/types.ts](../../frontend/app/lib/types.ts)
- [frontend/app/services/mock-adapter.ts](../../frontend/app/services/mock-adapter.ts)
- [frontend/app/types/master-data.ts](../../frontend/app/types/master-data.ts)

## Dihapus setelah tidak ada import

- frontend/app/components/master-data/ClientFormModal.tsx
- frontend/app/components/master-data/ClientListTab.tsx
- frontend/app/components/master-data/ConfirmArchiveDialog.tsx
- frontend/app/components/master-data/ProjectDetailDrawer.tsx
- frontend/app/components/master-data/ProjectFormModal.tsx
- frontend/app/components/master-data/ProjectListTab.tsx
- frontend/app/components/master-data/SystemFormModal.tsx
- frontend/app/components/master-data/SystemListTab.tsx

