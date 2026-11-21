"use client";

import { useMemo } from "react";
import { Boxes, Building2, Calendar, Filter } from "lucide-react";
import type { ActiveGodown, ItemMaster } from "@/types/lumino";

interface FilterBarProps {
  items: ItemMaster[];
  selectedItemCode: string;
  onSelectItemCode: (code: string) => void;
  godowns: ActiveGodown[];
  selectedGodown: string; // "ALL" or ActiveGodown
  onSelectGodown: (godown: string) => void;
  months: string[];
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
  months,
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-4">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Inventory Explorer Filters
            </h3>
            <span className="text-xs text-slate-500">
              (Live filter 16 items across 6 godowns)
            </span>
          </div>

          {/* Quick Timeline Presets */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium mr-1 hidden sm:inline">Timeline:</span>
            <button
              type="button"
              onClick={() => onPresetDateRange(months[0], months[months.length - 1])}
              className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                startMonth === months[0] && endMonth === months[months.length - 1]
                  ? "bg-amber-100 text-amber-800 font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Full (44M)
            </button>
            <button
              type="button"
              onClick={() => onPresetDateRange("2023-03", "2026-07")}
              className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                startMonth === "2023-03" && endMonth === "2026-07"
                  ? "bg-amber-100 text-amber-800 font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Receipts Active (to Jul &apos;26)
            </button>
            <button
              type="button"
              onClick={() => onPresetDateRange("2026-07", "2026-10")}
              className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                startMonth === "2026-07" && endMonth === "2026-10"
                  ? "bg-amber-100 text-amber-800 font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Post-Freeze (Jul-Oct &apos;26)
            </button>
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* 1. Item Selector (takes 6 cols) */}
          <div className="lg:col-span-6">
            <label
              htmlFor="item-selector"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
            >
              <Boxes className="h-3.5 w-3.5 text-slate-500" />
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
              onChange={(e) => onSelectItemCode(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-sans cursor-pointer"
            >
              {items.map((item) => (
                <option key={item.item_code} value={item.item_code}>
                  {item.item_code} — {item.item_name} [{item.unit}]
                </option>
              ))}
            </select>
          </div>

          {/* 2. Godown Selector (takes 3 cols) */}
          <div className="lg:col-span-3">
            <label
              htmlFor="godown-selector"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
            >
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Godown Scope:</span>
            </label>
            <select
              id="godown-selector"
              value={selectedGodown}
              onChange={(e) => onSelectGodown(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All 6 Active Godowns (Aggregated)</option>
              {godowns.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Date Range Range (takes 3 cols) */}
          <div className="lg:col-span-3">
            <label
              htmlFor="start-month-selector"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Timeline Window:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                id="start-month-selector"
                aria-label="Start Month"
                value={startMonth}
                onChange={(e) => onSelectStartMonth(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m} value={m} disabled={m > endMonth}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                id="end-month-selector"
                aria-label="End Month"
                value={endMonth}
                onChange={(e) => onSelectEndMonth(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m} value={m} disabled={m < startMonth}>
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
