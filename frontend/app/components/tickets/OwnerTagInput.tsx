"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { User, X, Plus } from "lucide-react";
import { seedRosterMembers } from "@/app/lib/data";

export interface OwnerTagInputProps {
  owners: string[];
  onChange: (owners: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function OwnerTagInput({
  owners,
  onChange,
  placeholder = "Ketik nama atau pilih PIC...",
  disabled = false,
}: OwnerTagInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Available roster suggestions excluding already selected owners
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const existingLower = new Set(owners.map((o) => o.trim().toLowerCase()));

    const filtered = seedRosterMembers.filter(
      (m) => !existingLower.has(m.name.trim().toLowerCase())
    );

    if (!q) {
      return filtered.slice(0, 6);
    }

    return filtered.filter((m) => m.name.toLowerCase().includes(q));
  }, [query, owners]);

  const canAddCustom = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return false;
    const existingLower = new Set(owners.map((o) => o.trim().toLowerCase()));
    return !existingLower.has(trimmed.toLowerCase());
  }, [query, owners]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const addOwner = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existingLower = new Set(owners.map((o) => o.trim().toLowerCase()));
    if (existingLower.has(trimmed.toLowerCase())) return;

    onChange([...owners, trimmed]);
    setQuery("");
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeOwner = (nameToRemove: string) => {
    onChange(owners.filter((o) => o !== nameToRemove));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
      const total = suggestions.length + (canAddCustom ? 1 : 0);
      if (total > 0) {
        setHighlightedIndex((prev) => (prev + 1) % total);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const total = suggestions.length + (canAddCustom ? 1 : 0);
      if (total > 0) {
        setHighlightedIndex((prev) => (prev - 1 + total) % total);
      }
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0) {
        if (highlightedIndex < suggestions.length) {
          addOwner(suggestions[highlightedIndex].name);
        } else if (canAddCustom) {
          addOwner(query);
        }
      } else if (query.trim()) {
        addOwner(query);
      }
    } else if (e.key === "Backspace" && !query && owners.length > 0) {
      removeOwner(owners[owners.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="ticket-owners-wrapper">
      <div
        className={`ticket-owners-box ${isOpen ? "is-focused" : ""} ${disabled ? "is-disabled" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Rendered Chips */}
        {owners.map((ownerName) => (
          <span key={ownerName} className="ticket-owner-chip">
            <span className="ticket-owner-chip-icon">
              <User size={11} />
            </span>
            <span className="ticket-owner-chip-name">{ownerName}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOwner(ownerName);
                }}
                className="ticket-owner-chip-remove"
                title={`Hapus ${ownerName}`}
                aria-label={`Hapus ${ownerName}`}
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}

        {/* Input for typing/searching */}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={owners.length === 0 ? placeholder : "+ Tambah PIC..."}
            className="ticket-owners-input"
            disabled={disabled}
          />
        )}
      </div>

      {/* Autocomplete suggestions dropdown */}
      {isOpen && !disabled && (suggestions.length > 0 || canAddCustom) && (
        <div ref={dropdownRef} className="ticket-owners-dropdown" role="listbox">
          {suggestions.map((member, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={member.id}
                role="option"
                aria-selected={isHighlighted}
                className={`ticket-owners-option ${isHighlighted ? "is-active" : ""}`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => addOwner(member.name)}
              >
                <div className="ticket-owners-option-left">
                  <User size={12} className="ticket-owners-option-icon" />
                  <span className="ticket-owners-option-name">{member.name}</span>
                </div>
                <span className="ticket-owners-option-role">{member.role}</span>
              </div>
            );
          })}

          {canAddCustom && (
            <div
              role="option"
              aria-selected={highlightedIndex === suggestions.length}
              className={`ticket-owners-option ticket-owners-option-custom ${
                highlightedIndex === suggestions.length ? "is-active" : ""
              }`}
              onMouseEnter={() => setHighlightedIndex(suggestions.length)}
              onClick={() => addOwner(query)}
            >
              <div className="ticket-owners-option-left">
                <Plus size={12} className="ticket-owners-option-icon" />
                <span>
                  Gunakan <strong>&ldquo;{query.trim()}&rdquo;</strong>
                </span>
              </div>
              <span className="ticket-owners-option-role">Custom PIC</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
