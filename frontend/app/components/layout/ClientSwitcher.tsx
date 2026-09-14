"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, ShieldCheck } from "lucide-react";
import { useClient, ClientOrganization, ClientId } from "@/app/context/ClientContext";
import { useToast } from "@/app/components/ui/Toast";

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
    <div className="client-switcher-container" ref={containerRef}>
      <button
        type="button"
        className={`client-switcher-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Klien aktif: ${activeClient.name}. Klik untuk beralih organisasi`}
        title={`Organisasi/Klien: ${activeClient.name} (${activeClient.tier})`}
      >
        <span className="client-icon-badge">
          <Building2 size={14} className="client-building-icon" />
        </span>

        <span
          className="client-avatar-badge"
          style={{
            backgroundColor: activeClient.avatarBg,
            color: activeClient.avatarColor,
            borderColor: activeClient.borderColor,
          }}
        >
          {activeClient.code}
        </span>

        <span className="client-name-group">
          <span className="client-label">KLIEN / TENANT</span>
          <span className="client-name">{activeClient.shortName}</span>
        </span>

        <span className="client-badge-tier">{activeClient.tier.split(" ")[0]}</span>

        <ChevronDown
          size={14}
          className={`client-chevron ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="client-dropdown-menu"
          role="listbox"
          aria-label="Pilih Organisasi / Klien Operasional"
        >
          <div className="client-dropdown-header">
            <span className="client-dropdown-title">PILIH KLIEN OPERASIONAL</span>
            <span className="client-dropdown-subtitle">
              Sistem, tiket, & alert terisolasi per tenant
            </span>
          </div>

          <div className="client-dropdown-list">
            {clients.map((client) => {
              const isSelected = client.id === activeClient.id;
              return (
                <button
                  key={client.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`client-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelect(client)}
                >
                  <div
                    className="client-item-avatar"
                    style={{
                      backgroundColor: client.avatarBg,
                      color: client.avatarColor,
                      borderColor: client.borderColor,
                    }}
                  >
                    {client.code}
                  </div>

                  <div className="client-item-info">
                    <div className="client-item-title-row">
                      <span className="client-item-name">{client.name}</span>
                      <span className="client-item-tier">
                        <ShieldCheck size={11} style={{ marginRight: 3 }} />
                        {client.tier}
                      </span>
                    </div>
                    <div className="client-item-tagline">{client.tagline}</div>
                    <div className="client-item-meta">
                      <span className="client-item-systems">
                        {client.systemsCount} Monitored Systems
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="client-item-check">
                      <Check size={15} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="client-dropdown-footer">
            <span>Shift NOC Roster bersifat global & mencakup seluruh klien.</span>
          </div>
        </div>
      )}
    </div>
  );
}
