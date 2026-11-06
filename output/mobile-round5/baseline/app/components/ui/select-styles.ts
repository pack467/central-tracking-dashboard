/** Shared with Shifter/PIC and every single select. All utilities are literal. */
export const SELECT_STYLES = {
  trigger: "[&[data-select-trigger]]:h-[34px] [&[data-select-trigger]]:min-h-[34px] [&[data-select-trigger]]:px-3 [&[data-select-trigger]]:gap-2 [&[data-select-trigger]]:text-[11.5px] [&[data-select-trigger]]:font-normal [&[data-select-trigger]]:font-sans max-md:[&[data-select-trigger]]:h-11 max-md:[&[data-select-trigger]]:min-h-11 [@media(pointer:coarse)]:[&[data-select-trigger]]:h-11 [@media(pointer:coarse)]:[&[data-select-trigger]]:min-h-11 relative inline-flex min-w-0 items-center gap-2 rounded-lg border border-[#334155] bg-[#0f172a] text-left text-[#cbd5e1] transition-[border-color,box-shadow,background-color] duration-150 hover:border-[#475569] disabled:cursor-not-allowed disabled:opacity-40 max-md:min-h-11 [@media(pointer:coarse)]:min-h-11 [&[role=combobox]:focus-visible]:outline-none [&[role=combobox]:focus-visible]:border-[#38bdf8]/70 [&[role=combobox]:focus-visible]:shadow-[0_0_0_3px_rgba(56,189,248,0.15)] motion-reduce:transition-none",
  active: "[&[role=combobox]]:border-[#38bdf8]/40 [&[role=combobox]]:bg-[#38bdf8]/10 [&[role=combobox]]:text-[#38bdf8]",
  panel: "rounded-[10px] border border-[#334155] bg-[#1e293b] p-1 text-[#cbd5e1] shadow-[0_12px_32px_rgba(0,0,0,0.35)] opacity-100 translate-y-0 transition-[opacity,translate] duration-[120ms] starting:opacity-0 starting:translate-y-1 motion-reduce:transition-none",
  option: "relative flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] leading-[18px] text-[#cbd5e1] cursor-pointer hover:bg-[#243044] max-md:min-h-12 [@media(pointer:coarse)]:min-h-12",
  selected: "bg-[rgba(56,189,248,0.14)] text-[#f8fafc] font-medium",
  keyboard: "bg-[#243044] ring-1 ring-inset ring-[#38bdf8]/35",
  disabled: "opacity-40 cursor-not-allowed",
  search: "h-9 w-full min-w-0 rounded-md border border-[#334155] bg-[#0f172a] pl-8 pr-3 text-[13px] text-[#f8fafc] placeholder:text-[#94a3b8] max-md:h-11 max-md:text-[16px] [@media(pointer:coarse)]:text-[16px] [&[role=combobox]:focus]:outline-none [&[role=combobox]:focus]:border-[#38bdf8]/70 [&[role=combobox]:focus]:shadow-[0_0_0_3px_rgba(56,189,248,0.15)]",
  action: "min-h-9 rounded-md px-2 text-[11px] font-semibold text-[#38bdf8] hover:bg-[#243044] max-md:min-h-11 [@media(pointer:coarse)]:min-h-11",
} as const;
