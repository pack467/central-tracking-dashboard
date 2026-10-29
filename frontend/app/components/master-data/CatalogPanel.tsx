"use client";
import { useEffect, useState } from "react";
import { ArrowDownUp, Plus } from "lucide-react";
import { useClient } from "@/app/context/ClientContext";
import { useToast } from "@/app/components/ui/Toast";
import { useMasterMutation, useMasterRecords, useMasterReview } from "@/app/hooks/useMasterData";
import type { useMasterRoute } from "@/app/hooks/useMasterRoute";
import { masterId } from "@/app/lib/master-data-model";
import { MASTER_DATA_P0_ENABLED } from "@/app/lib/master-data-flags";
import { MASTER_LABELS } from "@/app/lib/master-data-route";
import { canMaster, type MasterRole } from "@/app/lib/permissions";
import { masterDataV2 } from "@/app/services/master-data-v2";
import type { MasterEntity, MasterInputMap, MasterSnapshotV2 } from "@/app/types/master-data";
import { CategoryOrderSheet } from "./CategoryOrderSheet";
import { DeleteDialog } from "./DeleteDialog";
import { ListEmpty, ListError, ListSkeleton, MasterPager } from "./list-chrome";
import { MasterDetail } from "./MasterDetail";
import { MasterFilters } from "./MasterFilters";
import { MasterForm } from "./MasterForm";
import { MasterList } from "./MasterList";
import { MasterReviewView } from "./MasterReviewView";
import { MasterStatusDialog, ImpactSummary } from "./MasterStatusDialog";
import { buttonClass, primaryClass, masterRowId, masterRowName, type MasterRow, type MasterUsers } from "./master-ui";

type Route = ReturnType<typeof useMasterRoute>;
interface Props { route: Route; catalog: MasterSnapshotV2; access: MasterRole; users: MasterUsers }

/** Organizations, projects, systems, categories and severities: the original Master Data catalog. */
export function CatalogPanel({ route, catalog, access, users }: Props) {
  const entity = route.entity as MasterEntity, { query } = route;
  const records = useMasterRecords(entity, query);
  const review = useMasterReview();
  const { activeClientId } = useClient();
  const toast = useToast();
  const mutate = useMasterMutation();
  const [form, setForm] = useState<{ entity: MasterEntity; row?: MasterRow; requestKey: string }>();
  const [statusRow, setStatusRow] = useState<MasterRow>();
  const [deleteRow, setDeleteRow] = useState<MasterRow>();
  const [ordering, setOrdering] = useState(false);
  const [detailSection, setDetailSection] = useState<"relations">();
  const [highlighted, setHighlighted] = useState("");
  useEffect(
    () => { if (!highlighted) return; const timer = setTimeout(() => setHighlighted(""), 2200); return () => clearTimeout(timer); },
    [highlighted]
  );
  const data = records.data;
  const filtered = !!(query.q ||
      query.review ||
      query.status && query.status !== "all" ||
      query.kind && query.kind !== "all" ||
      query.organizationId && query.organizationId !== "all" ||
      query.projectId && query.projectId !== "all");
  const startForm = (row?: MasterRow) => setForm({ entity, row, requestKey: masterId("request") });
  function saved(row: MasterRow) { setHighlighted(masterRowId(entity, row)); setForm(undefined); setStatusRow(undefined); toast.success("Master Data tersimpan."); records.refetch(); }
  async function save(input: MasterInputMap[MasterEntity]) {
    if (!form) return;
    await mutate(async () => {
      const result = form.row
        ? await masterDataV2.update(form.entity, masterRowId(form.entity, form.row), input, form.requestKey)
        : await masterDataV2.create(form.entity, input, form.requestKey);
      saved(result);
    });
  }
  /** One atomic operation: every active category gets its new place in a single write. */
  async function saveOrder(ids: string[]) {
    await mutate(async () => { await masterDataV2.reorderCategories(ids); });
    setOrdering(false);
    toast.success("Urutan kategori tersimpan.");
    records.refetch();
  }
  const reviewCount = review.findings.length, createAllowed = canMaster(access, entity, "create");
  const add = createAllowed ? (
    <button type="button" className={primaryClass} onClick={() => startForm()}><Plus size={16} />Tambah {MASTER_LABELS[entity]}</button>
  ) : undefined;
  const orderButton = entity === "category" && canMaster(access, entity, "update") ? (
    <button type="button" className={`${buttonClass} min-w-11`} onClick={() => setOrdering(true)} aria-haspopup="dialog" aria-label="Atur urutan kategori"><ArrowDownUp size={16} aria-hidden="true" /><span className="max-sm:hidden">Atur urutan</span></button>
  ) : undefined;
  const footer = data && data.data.length ? (
    <MasterPager
      meta={data.meta}
      pageSize={query.pageSize || 10}
      onPage={page => route.setQuery({ page })}
      onSize={pageSize => route.setQuery({ pageSize })}
    />
  ) : undefined;
  if (MASTER_DATA_P0_ENABLED && route.view === "review")
    return (
      <MasterReviewView
        route={route}
        catalog={catalog}
        role={access}
        review={review}
        onClose={route.closeReview}
        onOpenReference={route.openReference}
        onCloseReference={route.closeReference}
        onOpenRecord={route.openRecord}
        onReviewType={route.setReviewType}
      />
    );
  return (
    <>
      <section aria-label={`Daftar ${MASTER_LABELS[entity]}`} className="space-y-3">
        <MasterFilters
          entity={entity}
          query={query}
          catalog={catalog}
          setQuery={route.setQuery}
          reviewCount={reviewCount}
          onReviewChange={reviewOnly => route.setQuery({ review: reviewOnly })}
          resultCount={data?.meta.total}
          resultLabel={MASTER_LABELS[entity].toLowerCase()}
          addButton={add}
          extraButton={orderButton}
        />
        {records.isLoading ? (
          <ListSkeleton count={entity === "organization" ? 8 : entity === "category" ? 7 : entity === "severity" ? 4 : 10} />
        ) : records.error ? (
          <ListError message={records.error.message} onRetry={records.refetch} />
        ) : !data?.data.length ? (
          <ListEmpty filtered={filtered} label={MASTER_LABELS[entity]} onReset={() => route.select(entity)} action={add} />
        ) : (
          <MasterList
            entity={entity}
            rows={data.data}
            catalog={catalog}
            users={users}
            role={access}
            highlighted={highlighted}
            review={MASTER_DATA_P0_ENABLED ? review : undefined}
            footer={footer}
            onReview={route.openReview}
            onDetail={(id, section) => { setDetailSection(section); route.openDetail(id); }}
            onEdit={startForm}
            onStatus={setStatusRow}
            onDelete={setDeleteRow}
          />
        )}
      </section>
      {ordering && <CategoryOrderSheet categories={catalog.categories} onClose={() => setOrdering(false)} onSave={saveOrder} />}
      {form ? (
        <MasterForm
          key={`${form.entity}:${form.row ? masterRowId(form.entity, form.row) : "new"}`}
          entity={form.entity}
          row={form.row}
          catalog={catalog}
          users={users}
          activeOrganizationId={activeClientId}
          onClose={() => setForm(undefined)}
          onSave={save}
        />
      ) : statusRow ? (
        <MasterStatusDialog entity={entity} row={statusRow} onClose={() => setStatusRow(undefined)} onSaved={saved} />
      ) : deleteRow ? (
        <DeleteDialog
          label={MASTER_LABELS[entity]}
          name={masterRowName(entity, deleteRow)}
          alternative={entity === "category" ? "Nonaktifkan" : "Arsipkan"}
          load={async signal => {
            const impact = await masterDataV2.getImpact(entity, masterRowId(entity, deleteRow), signal);
            return { canDelete: !!impact.canDelete, reason: impact.deleteReason, summary: <ImpactSummary impact={impact} /> };
          }}
          onDelete={() => masterDataV2.delete(entity, masterRowId(entity, deleteRow))}
          onClose={() => setDeleteRow(undefined)}
          onDeleted={() => { setDeleteRow(undefined); route.closeDetail(); toast.success(`${MASTER_LABELS[entity]} dihapus.`); records.refetch(); }}
        />
      ) : route.detail && (
        <MasterDetail
          key={`${entity}:${route.detail}`}
          initialSection={detailSection}
          entity={entity}
          id={route.detail}
          catalog={catalog}
          users={users}
          role={access}
          review={MASTER_DATA_P0_ENABLED ? review : undefined}
          onClose={route.closeDetail}
          onEdit={startForm}
          onStatus={setStatusRow}
          onDelete={setDeleteRow}
          onRelation={route.select}
          onOpenRecord={route.openRecord}
          onReview={route.openReview}
        />
      )}
    </>
  );
}
