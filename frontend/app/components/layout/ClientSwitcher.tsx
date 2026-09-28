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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
      className="client-switcher-container [position:relative] [display:inline-flex] [align-items:center]"
      ref={containerRef}
    >
      <button
        type="button"
        className={`client-switcher-btn [display:flex] [align-items:center] [gap:8px] [padding:4px_10px] [border-radius:8px] [color:var(--ink-primary)] [font-size:12px]! [cursor:pointer] [transition:all_0.15s_ease] [user-select:none] ${
          isOpen
            ? "active [background:rgba(56,_189,_248,_0.12)]! [border:1px_solid_var(--accent-blue)]! [box-shadow:0_0_14px_rgba(56,_189,_248,_0.2)]"
            : "[background:rgba(255,_255,_255,_0.04)]! [border:1px_solid_rgba(255,_255,_255,_0.12)]! [&:hover]:[background:rgba(56,_189,_248,_0.08)]! [&:hover]:[border:1px_solid_var(--accent-blue-border)]!"
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Klien aktif: ${activeClient.name}. Klik untuk beralih organisasi`}
        title={`Organisasi/Klien: ${activeClient.name}`}
      >
        <span className="client-icon-badge [display:grid] [place-items:center] [color:var(--ink-muted)] [opacity:0.85]">
          <Building2 size={14} className="client-building-icon" />
        </span>

        <span className="client-name-group [display:flex] [flex-direction:column] [text-align:left] [line-height:1.15]">
          <span className="client-name [font-size:12px] [font-weight:700] [color:var(--ink-primary)] [white-space:nowrap]">{activeClient.shortName}</span>
        </span>

        <ChevronDown
          size={14}
          className={`client-chevron [color:var(--ink-muted)] [transition:transform_0.2s_ease] [margin-left:2px] ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="client-dropdown-menu [position:absolute] [top:calc(100%_+_6px)] [left:0] [min-width:330px] [max-width:380px] [z-index:60] [background:#0d1527] [border:1px_solid_rgba(255,_255,_255,_0.14)] [box-shadow:0_16px_36px_rgba(0,_0,_0,_0.65),_0_0_1px_rgba(255,_255,_255,_0.25)] [border-radius:12px] [padding:8px] [backdrop-filter:blur(16px)] [animation:clientDropdownFadeIn_0.15s_ease-out]"
          role="listbox"
          aria-label="Pilih Organisasi / Klien Operasional"
        >
          <div className="client-dropdown-header [padding:6px_8px_8px] [border-bottom:1px_solid_rgba(255,_255,_255,_0.07)] [margin-bottom:6px]">
            <span className="client-dropdown-title [display:block] [font-size:9.5px] [font-weight:800] [letter-spacing:0.7px] [color:var(--accent-blue)] [text-transform:uppercase]">PILIH KLIEN OPERASIONAL</span>
          </div>

          <div className="client-dropdown-list [display:flex] [flex-direction:column] [gap:4px]">
            {clients.map((client) => {
              const isSelected = client.id === activeClient.id;
              return (
                <button
                  key={client.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`client-dropdown-item [display:flex] [align-items:center] [gap:10px] [width:100%] [padding:8px_10px] [border-radius:8px] [text-align:left] [cursor:pointer] [transition:all_0.15s_ease] ${
                    isSelected
                      ? "selected [border:1px_solid_rgba(56,_189,_248,_0.3)]! [background:rgba(56,_189,_248,_0.09)]!"
                      : "[border:1px_solid_transparent]! [background:transparent]! [&:hover]:[background:rgba(255,_255,_255,_0.05)]! [&:hover]:[border:1px_solid_rgba(255,_255,_255,_0.1)]!"
                  }`}
                  onClick={() => handleSelect(client)}
                >
                  <NoImagePlaceholder />

                  <div className="client-item-info [flex:1] [min-width:0]">
                    <div className="client-item-title-row [display:flex] [align-items:center] [justify-content:space-between] [gap:6px]">
                      <span className="client-item-name [font-size:12.5px] [font-weight:600] [color:var(--ink-primary)]">{client.name}</span>
                    </div>
                    <div className="client-item-meta [font-size:10px] [color:var(--accent-blue)] [margin-top:3px] [font-weight:500]">
                      <span className="client-item-systems">
                        {client.systemsCount} Monitored Systems
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="client-item-check [color:var(--accent-blue)] [flex-shrink:0] [margin-left:6px]">
                      <Check size={15} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
