"use client";

import { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ItemUnit } from "@/types/lumino";
import { formatMonthShort, formatQty, formatWithUnit } from "../utils";

export interface ContractorChartDataPoint {
  month: string;
  net_issues: number; // total_issues - total_returns
  total_consumption: number;
  closing_contractor_stock: number;
  project_godown_stock: number;
  total_project_idle_stock: number;
}

interface ContractorStockChartProps {
  data: ContractorChartDataPoint[];
  unit: ItemUnit;
  receiptsEndMonth?: string;
}

export function ContractorStockChart({
  data,
  unit,
  receiptsEndMonth,
}: ContractorStockChartProps) {
  const showFreezeLine = useMemo(
    () => Boolean(receiptsEndMonth && data.some((d) => d.month === receiptsEndMonth)),
    [data, receiptsEndMonth]
  );

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">
              Project-Wide Contractor Stock vs. Actual Field Consumption
            </h4>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
              Project-Wide Scope (All 6 Districts)
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Lumino ERP tracks consumption at project scope. Visualizes contractor hoarding vs field erection [{unit}].
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
            Shaded Area: Contractor Idle Stock
          </span>
        </div>
      </div>

      <div className="h-80 w-full min-w-0">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No contractor stock data points available for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 18, right: 12, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="contractorStockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="godownStockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="qty"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(val: number) => formatQty(val, unit)}
                width={65}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
                      <div className="mb-1.5 flex justify-between gap-4 border-b border-slate-100 pb-1 font-bold text-slate-900">
                        <span>{label}</span>
                        <span className="font-normal text-slate-500">{unit}</span>
                      </div>
                      <div className="space-y-1">
                        {payload.map((entry, idx) => {
                          const entryKey =
                            typeof entry.dataKey === "string" || typeof entry.dataKey === "number"
                              ? String(entry.dataKey)
                              : typeof entry.name === "string" || typeof entry.name === "number"
                                ? String(entry.name)
                                : `series-${idx}`;
                          const numericValue =
                            typeof entry.value === "number"
                              ? entry.value
                              : Number(entry.value ?? 0);
                          return (
                            <div
                              key={entryKey}
                              className="flex items-center justify-between gap-4"
                            >
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.name}:
                              </span>
                              <span className="font-mono font-semibold tabular-nums text-slate-900">
                                {formatWithUnit(numericValue, unit)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />

              {showFreezeLine && receiptsEndMonth && (
                <ReferenceLine
                  x={receiptsEndMonth}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  yAxisId="qty"
                  label={{
                    value: `Receipts Freeze (${formatMonthShort(receiptsEndMonth)})`,
                    position: "top",
                    fill: "#dc2626",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Monthly Net Issues to Contractors */}
              <Bar
                yAxisId="qty"
                dataKey="net_issues"
                name="Net Monthly Issues to Contractors"
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
                maxBarSize={16}
              />

              {/* Monthly Consumption */}
              <Bar
                yAxisId="qty"
                dataKey="total_consumption"
                name="Actual Monthly Consumption"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
                maxBarSize={16}
              />

              {/* Contractor Idle Stock Area */}
              <Area
                yAxisId="qty"
                type="monotone"
                dataKey="closing_contractor_stock"
                name="Contractor Idle Stock (Field Pileup)"
                stroke="#d97706"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#contractorStockGradient)"
                dot={false}
                activeDot={{ r: 5 }}
              />

              {/* Project Godown Stock Line */}
              <Area
                yAxisId="qty"
                type="monotone"
                dataKey="project_godown_stock"
                name="Project Godown Stock"
                stroke="#6366f1"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#godownStockGradient)"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
