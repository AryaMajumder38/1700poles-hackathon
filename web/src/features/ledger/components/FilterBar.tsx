"use client";

import { useMemo } from "react";
import { Boxes, Building2, Calendar, Filter, Lock } from "lucide-react";
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
  const currentItem = useMemo(
    () => items.find((i) => i.item_code === selectedItemCode) || items[0],
    [items, selectedItemCode]
  );

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

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-4">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-900">
              Inventory Explorer Filters
            </h3>
            <span className="text-xs text-slate-500">
              (Live filter {items.length} items across {godowns.length} godowns)
            </span>
          </div>

          {/* Quick Timeline Presets */}
          {hasMonths && firstMonth && lastMonth && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="mr-1 hidden font-medium text-slate-500 sm:inline">
                Timeline:
              </span>
              <button
                type="button"
                aria-pressed={isFullRangeActive}
                onClick={() => onPresetDateRange(firstMonth, lastMonth)}
                className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                  isFullRangeActive
                    ? "bg-amber-100 text-amber-800 font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Full ({months.length}M)
              </button>
              {effectiveReceiptsEnd && (
                <button
                  type="button"
                  aria-pressed={isReceiptsActiveRange}
                  onClick={() => onPresetDateRange(firstMonth, effectiveReceiptsEnd)}
                  className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                    isReceiptsActiveRange
                      ? "bg-amber-100 text-amber-800 font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Receipts Active (to {formatMonthShort(effectiveReceiptsEnd)})
                </button>
              )}
              {hasPostFreeze && effectiveReceiptsEnd && (
                <button
                  type="button"
                  aria-pressed={isPostFreezeRange}
                  onClick={() => onPresetDateRange(effectiveReceiptsEnd, lastMonth)}
                  className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                    isPostFreezeRange
                      ? "bg-amber-100 text-amber-800 font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Post-Freeze ({formatMonthShort(effectiveReceiptsEnd)}–{formatMonthShort(lastMonth)})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Primary Controls Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* 1. Item Selector (takes 6 cols) */}
          <div className="min-w-0 lg:col-span-6">
            <label
              htmlFor="item-selector"
              className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700"
            >
              <Boxes className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <span>Catalog SKU / Item:</span>
              {currentItem && (
                <span className="ml-auto inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  UOM: {currentItem.unit} • {currentItem.role} • Lead: {currentItem.lead_time_days}d
                </span>
              )}
            </label>
            <select
              id="item-selector"
              value={selectedItemCode}
              disabled={items.length === 0}
              onChange={(e) => onSelectItemCode(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 font-sans text-sm text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {items.map((item) => (
                <option key={item.item_code} value={item.item_code}>
                  {item.item_code} — {item.item_name} [{item.unit}]
                </option>
              ))}
            </select>
          </div>

          {/* 2. Godown Selector (takes 3 cols) */}
          <div className="min-w-0 lg:col-span-3">
            <label
              htmlFor="godown-selector"
              className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <span>Godown Scope:</span>
              {lockedGodown && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                  <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                  Site Scoped
                </span>
              )}
            </label>
            <select
              id="godown-selector"
              value={lockedGodown ?? selectedGodown}
              disabled={Boolean(lockedGodown)}
              onChange={(e) => {
                if (!lockedGodown) onSelectGodown(e.target.value);
              }}
              className={`w-full min-w-0 rounded-lg border px-3 py-2 text-sm focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 ${
                lockedGodown
                  ? "border-amber-300 bg-amber-50/70 text-amber-950 font-semibold cursor-not-allowed"
                  : "border-slate-300 bg-white text-slate-900 cursor-pointer"
              }`}
            >
              {lockedGodown ? (
                <option value={lockedGodown}>{lockedGodown}</option>
              ) : (
                <>
                  <option value="ALL">
                    All {godowns.length} Active Godowns (Aggregated)
                  </option>
                  {godowns.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* 3. Date Range (takes 3 cols) */}
          <div className="min-w-0 lg:col-span-3">
            <label
              htmlFor="start-month-selector"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <span>Timeline Window:</span>
            </label>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <select
                id="start-month-selector"
                aria-label="Start Month"
                value={startMonth}
                disabled={!hasMonths}
                onChange={(e) => onSelectStartMonth(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {months.map((m) => (
                  <option key={m} value={m} disabled={Boolean(endMonth) && m > endMonth}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                id="end-month-selector"
                aria-label="End Month"
                value={endMonth}
                disabled={!hasMonths}
                onChange={(e) => onSelectEndMonth(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {months.map((m) => (
                  <option key={m} value={m} disabled={Boolean(startMonth) && m < startMonth}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
