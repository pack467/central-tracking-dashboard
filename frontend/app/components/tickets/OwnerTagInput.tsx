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
    <div ref={containerRef} className="relative w-full">
      <div
        className={`w-full min-h-[38px] [padding:4px_8px] [background-color:var(--input-bg)] [border:1px_solid_var(--panel-border)] rounded-[7px] box-border flex flex-wrap items-center gap-[6px] cursor-text [transition:border-color_0.12s_ease] [&.is-focused]:![border-color:var(--accent-blue)] [&.is-focused]:![box-shadow:none] [&.is-focused]:![outline:none] ${isOpen ? "is-focused" : ""} ${disabled ? "is-disabled" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Rendered Chips */}
        {owners.map((ownerName) => (
          <span
            key={ownerName}
            className="inline-flex items-center gap-[5px] h-[26px] [padding:0_7px_0_8px] [background:rgba(56,_189,_248,_0.08)] [border:1px_solid_rgba(56,_189,_248,_0.25)] rounded-[5px] [color:var(--ink-primary)] [font-size:11.5px] [font-weight:500] select-none [transition:border-color_0.1s_ease,_background-color_0.1s_ease]"
          >
            <span className="[color:var(--accent-blue)] flex items-center">
              <User size={11} />
            </span>
            <span className="[color:var(--ink-primary)] [font-size:11.5px] [line-height:1]">{ownerName}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOwner(ownerName);
                }}
                className="flex items-center justify-center w-[15px] h-[15px] rounded-[99px] [border:none] [background:transparent] [color:var(--ink-muted)] cursor-pointer p-0 ml-[2px] [transition:color_0.12s_ease,_background-color_0.12s_ease] [&:hover]:[color:#f87171] [&:hover]:[background:rgba(239,_68,_68,_0.15)]"
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
            className="![border:none] ![background:transparent] ![outline:none] ![color:var(--ink-primary)] ![font-size:12px] ![font-family:var(--font-sans)] ![padding:0_4px] ![height:26px] [flex:1_1_140px] [min-width:120px] ![box-shadow:none] [&::placeholder]:[color:var(--ink-muted)] [&::placeholder]:[font-size:11.5px]"
            disabled={disabled}
          />
        )}
      </div>

      {/* Autocomplete suggestions dropdown */}
      {isOpen && !disabled && (suggestions.length > 0 || canAddCustom) && (
        <div
          ref={dropdownRef}
          className="absolute [top:calc(100%_+_4px)] left-0 right-0 z-[1050] [background:#0b1329] [border:1px_solid_rgba(255,_255,_255,_0.14)] rounded-[8px] [box-shadow:0_12px_28px_-4px_rgba(0,_0,_0,_0.7),_0_4px_10px_-2px_rgba(0,_0,_0,_0.5)] max-h-[180px] overflow-y-auto p-[4px] flex flex-col gap-[2px]"
          role="listbox"
        >
          {suggestions.map((member, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={member.id}
                role="option"
                aria-selected={isHighlighted}
                className={`flex items-center justify-between [padding:6px_10px] rounded-[5px] cursor-pointer [transition:background-color_0.1s_ease] [font-size:12px] [&:hover]:[background:rgba(255,_255,_255,_0.08)] [&.is-active]:[background:rgba(255,_255,_255,_0.08)] ${isHighlighted ? "is-active" : ""}`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => addOwner(member.name)}
              >
                <div className="flex items-center gap-[7px] [color:var(--ink-primary)]">
                  <User size={12} className="[color:var(--accent-blue)] shrink-0" />
                  <span className="[font-weight:500]">{member.name}</span>
                </div>
                <span className="[font-size:10px] [color:var(--ink-muted)] [font-family:var(--font-mono)] [background:rgba(255,_255,_255,_0.04)] [padding:2px_6px] rounded-[4px] [border:1px_solid_rgba(255,_255,_255,_0.06)]">
                  {member.role}
                </span>
              </div>
            );
          })}

          {canAddCustom && (
            <div
              role="option"
              aria-selected={highlightedIndex === suggestions.length}
              className={`flex items-center justify-between [padding:6px_10px] rounded-[5px] cursor-pointer [transition:background-color_0.1s_ease] [font-size:12px] [&:hover]:[background:rgba(255,_255,_255,_0.08)] [&.is-active]:[background:rgba(255,_255,_255,_0.08)] [border-top:1px_solid_rgba(255,_255,_255,_0.07)] mt-[2px] pt-[6px] ${
                highlightedIndex === suggestions.length ? "is-active" : ""
              }`}
              onMouseEnter={() => setHighlightedIndex(suggestions.length)}
              onClick={() => addOwner(query)}
            >
              <div className="flex items-center gap-[7px] [color:var(--ink-primary)]">
                <Plus size={12} className="[color:var(--accent-blue)] shrink-0" />
                <span>
                  Gunakan <strong>&ldquo;{query.trim()}&rdquo;</strong>
                </span>
              </div>
              <span className="[font-size:10px] [color:var(--ink-muted)] [font-family:var(--font-mono)] [background:rgba(255,_255,_255,_0.04)] [padding:2px_6px] rounded-[4px] [border:1px_solid_rgba(255,_255,_255,_0.06)]">
                Custom PIC
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
