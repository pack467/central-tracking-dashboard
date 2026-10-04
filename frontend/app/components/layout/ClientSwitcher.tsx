"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useClient, ClientOrganization, ClientId } from "@/app/context/ClientContext";
import { useToast } from "@/app/components/ui/Toast";
import { NoImagePlaceholder } from "@/app/components/ui/NoImagePlaceholder";

export function ClientSwitcher() {
  const { activeClient, clients, setActiveClientId } = useClient();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notify = useToast();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = (client: ClientOrganization) => {
    if (client.id !== activeClient.id) {
      setActiveClientId(client.id as ClientId);
      notify.info(`Beralih ke pemantauan klien: ${client.shortName}`, {
        id: "client-switch-toast",
        duration: 3500,
      });
    }
    setIsOpen(false);
  };

  return (
    <div
      className="client-switcher-container relative inline-flex items-center"
      ref={containerRef}
    >
      <button
        type="button"
        className={`client-switcher-btn flex items-center gap-[8px] p-[4px_10px] rounded-[8px] text-[var(--ink-primary)] text-[12px] cursor-pointer [transition:all_0.15s_ease] select-none ${
          isOpen
            ? "active bg-[rgba(56,189,248,0.12)] border border-[var(--accent-blue)] [box-shadow:0_0_14px_rgba(56,189,248,0.2)]"
            : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(56,189,248,0.08)] hover:border-[var(--accent-blue-border)]"
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Klien aktif: ${activeClient.name}. Klik untuk beralih organisasi`}
        title={`Organisasi/Klien: ${activeClient.name}`}
      >
        <span className="client-icon-badge grid place-items-center text-[var(--ink-muted)] opacity-85">
          <Building2 size={14} className="client-building-icon" />
        </span>

        <span className="client-name-group flex flex-col text-left leading-[1.15]">
          <span className="client-name text-[12px] font-bold text-[var(--ink-primary)] whitespace-nowrap">{activeClient.shortName}</span>
        </span>

        <ChevronDown
          size={14}
          className={`client-chevron text-[var(--ink-muted)] [transition:transform_0.2s_ease] ml-[2px] ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="client-dropdown-menu absolute top-[calc(100%+6px)] left-0 w-[min(330px,calc(100vw-32px))] max-w-[calc(100vw-32px)] max-[768px]:min-w-[280px] z-[60] bg-[#0d1527] border border-[rgba(255,255,255,0.14)] [box-shadow:0_16px_36px_rgba(0,0,0,0.65),_0_0_1px_rgba(255,255,255,0.25)] rounded-[12px] p-[8px] backdrop-blur-[16px] animate-[clientDropdownFadeIn_0.15s_ease-out]"
            role="listbox"
            aria-label="Pilih Organisasi / Klien Operasional"
          >
            <div className="client-dropdown-header p-[6px_8px_8px] [border-bottom:1px_solid_rgba(255,_255,_255,_0.07)] mb-[6px]">
              <span className="client-dropdown-title block text-[9.5px] font-extrabold tracking-[0.7px] text-[var(--accent-blue)] uppercase">PILIH KLIEN OPERASIONAL</span>
            </div>

            <div className="client-dropdown-list flex flex-col gap-[4px] max-h-[360px] overflow-y-auto overscroll-contain [scrollbar-width:thin] pr-[2px]">
              {clients.map((client) => {
                const isSelected = client.id === activeClient.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`client-dropdown-item flex items-center gap-[10px] w-full p-[8px_10px] rounded-[8px] text-left cursor-pointer [transition:all_0.15s_ease] ${
                      isSelected
                        ? "selected border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.09)]"
                        : "border border-transparent bg-transparent hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)]"
                    }`}
                    onClick={() => handleSelect(client)}
                  >
                    <NoImagePlaceholder />

                    <div className="client-item-info flex-1 min-w-0">
                      <div className="client-item-title-row flex items-center justify-between gap-[6px]">
                        <span className="client-item-name text-[12.5px] font-semibold text-[var(--ink-primary)]">{client.name}</span>
                      </div>
                      <div className="client-item-meta text-[10px] text-[var(--accent-blue)] mt-[3px] font-medium">
                        <span className="client-item-systems">
                          {client.systemsCount} Monitored Systems
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="client-item-check text-[var(--accent-blue)] shrink-0 ml-[6px]">
                        <Check size={15} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
