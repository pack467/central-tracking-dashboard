"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/app/components/ui/Toast";
import { useMasterMutation, usePeople, useRoles, useTeamRecords } from "@/app/hooks/useMasterData";
import type { useMasterRoute } from "@/app/hooks/useMasterRoute";
import { canMaster, type MasterRole } from "@/app/lib/permissions";
import { MASTER_LABELS } from "@/app/lib/master-data-route";
import { masterPeople, masterRoles } from "@/app/services/master-data-v2";
import type { MasterSnapshotV2, Person, Role } from "@/app/types/master-data";
import { DeleteDialog } from "./DeleteDialog";
import { ListEmpty, ListError, ListSkeleton, MasterPager } from "./list-chrome";
import { MasterFilters } from "./MasterFilters";
import { PeopleList, type PersonStatusTarget } from "./PeopleList";
import { PersonDetail } from "./PersonDetail";
import { PersonFormModal } from "./PersonFormModal";
import { RoleFormModal } from "./RoleFormModal";
import { RolesList } from "./RolesList";
import { PersonImpact, TeamStatusDialog, type TeamTarget } from "./TeamStatusDialog";
import { primaryClass, type MasterUsers } from "./master-ui";

type Route = ReturnType<typeof useMasterRoute>;
interface Props { route: Route; catalog: MasterSnapshotV2; access: MasterRole; users: MasterUsers }

/** People and roles: the single source of staff identity (stage 1 of the scope review). */
export function TeamPanel({ route, catalog, access, users }: Props) {
  const entity = route.entity === "role" ? "role" : "person", { query } = route, toast = useToast(), mutate = useMasterMutation();
  const records = useTeamRecords<Person | Role>(entity, query), roles = useRoles(), people = usePeople();
  const [personForm, setPersonForm] = useState<{ person?: Person }>();
  const [roleForm, setRoleForm] = useState<{ role?: Role }>();
  const [target, setTarget] = useState<TeamTarget>();
  const [removing, setRemoving] = useState<{ person: Person } | { role: Role }>(), [highlighted, setHighlighted] = useState("");
  useEffect(
    () => { if (!highlighted) return; const timer = setTimeout(() => setHighlighted(""), 2200); return () => clearTimeout(timer); },
    [highlighted]
  );
  const data = records.data;
  const label = MASTER_LABELS[entity];
  const filtered = !!(query.q || query.status && query.status !== "all" || query.roleKey && query.roleKey !== "all");
  const manualOrder = entity === "role" && (!query.sort || query.sort === "order");
  const createAllowed = canMaster(access, entity, "create");
  const add = createAllowed ? (
    <button type="button" className={primaryClass} onClick={() => entity === "person" ? setPersonForm({}) : setRoleForm({})}><Plus size={16} />Tambah {label}</button>
  ) : undefined;
  const settle = (id: string, message = "Master Data tersimpan.") => {
    setHighlighted(id);
    setPersonForm(undefined);
    setRoleForm(undefined);
    setTarget(undefined);
    setRemoving(undefined);
    toast.success(message);
    records.refetch();
  };
  async function reorder(role: Role, direction: number) {
    try {
      await mutate(async () => { await masterRoles.reorder(role.key, direction); });
      setHighlighted(role.key);
    } catch (error) {
      toast.critical(error instanceof Error ? error.message : "Gagal mengubah urutan.");
    }
  }
  const pager = data && data.data.length ? (
    <MasterPager
      meta={data.meta}
      pageSize={query.pageSize || 10}
      onPage={page => route.setQuery({ page })}
      onSize={pageSize => route.setQuery({ pageSize })}
    />
  ) : undefined;
  const statusTarget = (person: Person, status: PersonStatusTarget) => setTarget({ kind: "person", row: person, status });
  return (
    <>
      <section aria-label={`Daftar ${label}`} className="space-y-3">
        <MasterFilters
          entity={entity}
          query={query}
          catalog={catalog}
          setQuery={route.setQuery}
          resultCount={data?.meta.total}
          resultLabel={label.toLowerCase()}
          addButton={add}
        />
        {records.isLoading ? (
          <ListSkeleton count={entity === "person" ? 10 : 5} />
        ) : records.error ? (
          <ListError message={records.error.message} onRetry={records.refetch} />
        ) : !data?.data.length ? (
          <ListEmpty filtered={filtered} label={label} onReset={() => route.select(entity)} action={add} />
        ) : entity === "person" ? (
          <PeopleList
            rows={data.data as Person[]}
            roles={roles}
            access={access}
            highlighted={highlighted}
            footer={pager}
            onDetail={route.openDetail}
            onEdit={person => setPersonForm({ person })}
            onStatus={statusTarget}
            onDelete={person => setRemoving({ person })}
          />
        ) : (
          <RolesList
            rows={data.data as Role[]}
            order={roles.map(role => role.key)}
            manualOrder={manualOrder}
            access={access}
            highlighted={highlighted}
            footer={pager}
            onEdit={role => setRoleForm({ role })}
            onStatus={(role, status) => setTarget({ kind: "role", row: role, status })}
            onDelete={role => setRemoving({ role })}
            onReorder={(role, direction) => void reorder(role, direction)}
            onViewPeople={roleKey => route.select("person", { roleKey })}
          />
        )}
      </section>
      {personForm ? (
        <PersonFormModal
          person={personForm.person}
          roles={roles}
          people={people}
          onClose={() => setPersonForm(undefined)}
          onSaved={person => settle(person.id)}
        />
      ) : roleForm ? (
        <RoleFormModal role={roleForm.role} roles={roles} onClose={() => setRoleForm(undefined)} onSaved={role => settle(role.key)} />
      ) : target ? (
        <TeamStatusDialog
          target={target}
          onClose={() => setTarget(undefined)}
          onSaved={() => settle(target.kind === "person" ? target.row.id : target.row.key)}
          onOpenPeople={roleKey => { setTarget(undefined); route.select("person", { roleKey }); }}
        />
      ) : removing
        ? "person" in removing ? (
          <DeleteDialog
            label="Personel"
            name={removing.person.fullName}
            alternative="Nonaktifkan"
            load={async signal => {
              const usage = await masterPeople.usage(removing.person.id, signal);
              return { canDelete: usage.canDelete, reason: usage.deleteReason, summary: <PersonImpact usage={usage} /> };
            }}
            onDelete={() => masterPeople.delete(removing.person.id)}
            onClose={() => setRemoving(undefined)}
            onDeleted={() => { setRemoving(undefined); route.closeDetail(); toast.success("Personel dihapus."); records.refetch(); }}
          />
        ) : (
          <DeleteDialog
            label="Peran"
            name={removing.role.name}
            alternative="Nonaktifkan"
            load={async signal => {
              const usage = await masterRoles.usage(removing.role.key, signal);
              return { canDelete: usage.canDelete, reason: usage.deleteReason };
            }}
            onDelete={() => masterRoles.delete(removing.role.key)}
            onClose={() => setRemoving(undefined)}
            onDeleted={() => { setRemoving(undefined); toast.success("Peran dihapus."); records.refetch(); }}
          />
        )
        : entity === "person" && route.detail && (
          <PersonDetail
            key={route.detail}
            id={route.detail}
            catalog={catalog}
            roles={roles}
            users={users}
            access={access}
            onClose={route.closeDetail}
            onEdit={person => setPersonForm({ person })}
            onStatus={statusTarget}
            onDelete={person => setRemoving({ person })}
            onOpenRecord={route.openRecord}
          />
        )}
    </>
  );
}
