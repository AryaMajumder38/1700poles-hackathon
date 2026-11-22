"use client";

import { useMemo } from "react";
import type { ActiveGodown, ItemMaster } from "@/types/lumino";
import { formatMonthShort } from "../utils";

interface FilterBarProps {
  items: ItemMaster[];
  selectedItemCode: string;
  onSelectItemCode: (code: string) => void;
  godowns: ActiveGodown[];
  selectedGodown: string; // "ALL" or ActiveGodown
  onSelectGodown: (godown: string) => void;
  lockedGodown?: ActiveGodown | null;
  months: string[];
  receiptsEndMonth?: string;
  startMonth: string;
  endMonth: string;
  onSelectStartMonth: (m: string) => void;
  onSelectEndMonth: (m: string) => void;
  onPresetDateRange: (start: string, end: string) => void;
}

export function FilterBar({
  items,
  selectedItemCode,
  onSelectItemCode,
  godowns,
  selectedGodown,
  onSelectGodown,
  lockedGodown = null,
  months,
  receiptsEndMonth,
  startMonth,
  endMonth,
  onSelectStartMonth,
  onSelectEndMonth,
  onPresetDateRange,
}: FilterBarProps) {
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const hasMonths = Boolean(firstMonth && lastMonth);

  const effectiveReceiptsEnd = useMemo(() => {
    if (!hasMonths || !receiptsEndMonth) return undefined;
    return months.includes(receiptsEndMonth) ? receiptsEndMonth : undefined;
  }, [hasMonths, months, receiptsEndMonth]);

  const hasPostFreeze = Boolean(
    effectiveReceiptsEnd && lastMonth && effectiveReceiptsEnd < lastMonth
  );

  const isFullRangeActive = Boolean(
    hasMonths && startMonth === firstMonth && endMonth === lastMonth
  );
  const isReceiptsActiveRange = Boolean(
    hasMonths &&
      effectiveReceiptsEnd &&
      startMonth === firstMonth &&
      endMonth === effectiveReceiptsEnd
  );
  const isPostFreezeRange = Boolean(
    hasPostFreeze &&
      effectiveReceiptsEnd &&
      startMonth === effectiveReceiptsEnd &&
      endMonth === lastMonth
  );

  const selectBaseClassName =
    "h-9 min-w-0 border border-white/[0.09] bg-[#1a1a1a] text-sm text-[#e7e7e7] transition-colors duration-150 hover:border-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:border-white/20 cursor-pointer disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-[#151515] disabled:text-[#666666]";

  const optionClassName = "bg-[#1a1a1a] text-[#e7e7e7]";

  return (
    <div
      role="region"
      aria-label="Ledger filters"
      className="flex min-w-0 flex-wrap items-center gap-2.5"
    >
      {/* Item Selector */}
      <select
        id="item-selector"
        aria-label="Catalog SKU or item"
        value={selectedItemCode}
        disabled={items.length === 0}
        onChange={(e) => onSelectItemCode(e.target.value)}
        className={`${selectBaseClassName} w-full rounded-xl px-3.5 sm:w-auto sm:min-w-[260px] sm:max-w-sm sm:flex-1`}
      >
        {items.map((item) => (
          <option
            key={item.item_code}
            value={item.item_code}
            className={optionClassName}
          >
            {item.item_code} — {item.item_name} ({item.unit})
          </option>
        ))}
      </select>

      {/* Godown Selector */}
      <select
        id="godown-selector"
        aria-label="Godown scope"
        value={lockedGodown ?? selectedGodown}
        disabled={Boolean(lockedGodown)}
        onChange={(e) => {
          if (!lockedGodown) onSelectGodown(e.target.value);
        }}
        className={`${selectBaseClassName} w-full rounded-full px-3.5 sm:w-auto sm:min-w-[190px]`}
      >
        {lockedGodown ? (
          <option value={lockedGodown} className={optionClassName}>
            {lockedGodown}
          </option>
        ) : (
          <>
            <option value="ALL" className={optionClassName}>
              All {godowns.length} godowns
            </option>
            {godowns.map((g) => (
              <option key={g} value={g} className={optionClassName}>
                {g}
              </option>
            ))}
          </>
        )}
      </select>

      {/* Month Range Selects */}
      <div className="flex w-full items-center gap-1.5 sm:w-auto">
        <select
          id="start-month-selector"
          aria-label="Start month"
          value={startMonth}
          disabled={!hasMonths}
          onChange={(e) => onSelectStartMonth(e.target.value)}
          className={`${selectBaseClassName} flex-1 rounded-full px-3 tabular-nums sm:w-[116px] sm:flex-none`}
        >
          {months.map((m) => (
            <option
              key={m}
              value={m}
              disabled={Boolean(endMonth) && m > endMonth}
              className={optionClassName}
            >
              {m}
            </option>
          ))}
        </select>
        <span className="text-xs text-[#898989]" aria-hidden="true">
          –
        </span>
        <select
          id="end-month-selector"
          aria-label="End month"
          value={endMonth}
          disabled={!hasMonths}
          onChange={(e) => onSelectEndMonth(e.target.value)}
          className={`${selectBaseClassName} flex-1 rounded-full px-3 tabular-nums sm:w-[116px] sm:flex-none`}
        >
          {months.map((m) => (
            <option
              key={m}
              value={m}
              disabled={Boolean(startMonth) && m < startMonth}
              className={optionClassName}
            >
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline Presets Segmented Control */}
      {hasMonths && firstMonth && lastMonth && (
        <div
          role="group"
          aria-label="Timeline presets"
          className="inline-flex flex-wrap items-center rounded-full border border-white/[0.06] bg-white/[0.05] p-1 sm:ml-auto"
        >
          <button
            type="button"
            aria-pressed={isFullRangeActive}
            onClick={() => onPresetDateRange(firstMonth, lastMonth)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
              isFullRangeActive
                ? "bg-white text-black shadow-sm"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            All ({months.length}m)
          </button>
          {effectiveReceiptsEnd && (
            <button
              type="button"
              aria-pressed={isReceiptsActiveRange}
              title={`Up to ${formatMonthShort(effectiveReceiptsEnd)}`}
              onClick={() => onPresetDateRange(firstMonth, effectiveReceiptsEnd)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
                isReceiptsActiveRange
                  ? "bg-white text-black shadow-sm"
                  : "text-[#a0a0a0] hover:text-white"
              }`}
            >
              Receipts active
            </button>
          )}
          {hasPostFreeze && effectiveReceiptsEnd && (
            <button
              type="button"
              aria-pressed={isPostFreezeRange}
              title={`${formatMonthShort(effectiveReceiptsEnd)}–${formatMonthShort(lastMonth)}`}
              onClick={() => onPresetDateRange(effectiveReceiptsEnd, lastMonth)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
                isPostFreezeRange
                  ? "bg-white text-black shadow-sm"
                  : "text-[#a0a0a0] hover:text-white"
              }`}
            >
              Post-freeze
            </button>
          )}
        </div>
      )}
    </div>
  );
}
