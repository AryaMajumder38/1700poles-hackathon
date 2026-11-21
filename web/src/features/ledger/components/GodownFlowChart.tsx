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

export interface MonthlyChartDataPoint {
  month: string;
  receipts: number;
  transfers_in: number;
  transfers_out: number;
  issues: number;
  returns: number;
  closing_stock: number;
}

interface GodownFlowChartProps {
  data: MonthlyChartDataPoint[];
  unit: ItemUnit;
  godownName: string;
  receiptsEndMonth?: string;
}

export function GodownFlowChart({
  data,
  unit,
  godownName,
  receiptsEndMonth,
}: GodownFlowChartProps) {
  const displayTitle = useMemo(() => {
    return godownName === "ALL"
      ? `All Godowns (Aggregated) — Monthly Physical Flows & Closing Stock`
      : `${godownName} — Monthly Physical Flows & Closing Stock`;
  }, [godownName]);

  const showFreezeLine = useMemo(
    () => Boolean(receiptsEndMonth && data.some((d) => d.month === receiptsEndMonth)),
    [data, receiptsEndMonth]
  );

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900">
            {displayTitle}
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Monthly Inflows (Receipts, Transfers In) vs Outflows (Issues, Transfers Out) overlaid with Godown Closing Stock [{unit}]
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
            Solid Line: Closing Stock
          </span>
          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            Bars: Material Flows
          </span>
        </div>
      </div>

      <div className="h-80 w-full min-w-0">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No ledger data points available for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 18, right: 12, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="closingStockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
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

              {/* Marker for Procurement Freeze */}
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

              {/* Inflow Bars */}
              <Bar
                yAxisId="qty"
                dataKey="receipts"
                name="Vendor Receipts (+)"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                yAxisId="qty"
                dataKey="transfers_in"
                name="Transfers In (+)"
                fill="#0284c7"
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              />

              {/* Outflow Bars */}
              <Bar
                yAxisId="qty"
                dataKey="issues"
                name="Issues to Contractor (-)"
                fill="#f59e0b"
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                yAxisId="qty"
                dataKey="transfers_out"
                name="Transfers Out (-)"
                fill="#6366f1"
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                yAxisId="qty"
                dataKey="returns"
                name="Contractor Returns (+)"
                fill="#14b8a6"
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              />

              {/* Closing Stock Area & Line */}
              <Area
                yAxisId="qty"
                type="monotone"
                dataKey="closing_stock"
                name="Godown Closing Stock"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#closingStockGradient)"
                dot={false}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
