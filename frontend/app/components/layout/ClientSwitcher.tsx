"use client";
import { Building2 } from "lucide-react";
import { useClient, ClientOrganization, ClientId } from "@/app/context/ClientContext";
import { useToast } from "@/app/components/ui/Toast";
import { Select } from "@/app/components/ui/Select";

export function ClientSwitcher() {
  const { activeClient, clients, setActiveClientId } = useClient();
  const notify = useToast();
  const handleSelect = (client: ClientOrganization) => {
    if (client.id !== activeClient.id) {
      setActiveClientId(client.id as ClientId);
      notify.info(`Beralih ke pemantauan klien: ${client.shortName}`, {
        id: "client-switch-toast",
        duration: 3500,
      });
    }

  };

  return <div className="client-switcher-container relative inline-flex items-center">
    <Select id="active-client-select" label="Pilih klien" aria-label={`Klien aktif: ${activeClient.name}. Klik untuk beralih organisasi`} title={`Organisasi/Klien: ${activeClient.name}`} value={activeClient.id} onValueChange={id => { const client = clients.find(client => client.id === id); if (client) handleSelect(client); }} active icon={<Building2 size={16} />} options={clients.map(client => ({ value: client.id, label: client.name, meta: client.systemsCount + " Monitored Systems" }))} className="app-client-switcher h-8 px-2.5 text-[12px] max-lg:h-10 max-md:px-1.5 max-md:gap-1.5 max-md:w-auto max-md:min-w-[84px] max-md:max-w-[148px]" renderValue={() => <span className="app-client-name text-[12px] max-md:text-[11px] font-bold min-w-0 truncate"><span className="hidden md:inline">{activeClient.shortName}</span><span className="md:hidden">{activeClient.code}</span></span>} />
  </div>;
}
