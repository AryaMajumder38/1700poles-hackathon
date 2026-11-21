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
import { formatQty } from "../utils";

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
  itemName: string;
}

export function GodownFlowChart({
  data,
  unit,
  godownName,
  itemName,
}: GodownFlowChartProps) {
  const displayTitle = useMemo(() => {
    return godownName === "ALL"
      ? `All Godowns (Aggregated) — Monthly Physical Flows & Closing Stock`
      : `${godownName} — Monthly Physical Flows & Closing Stock`;
  }, [godownName]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            {displayTitle}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Monthly Inflows (Receipts, Transfers In) vs Outflows (Issues, Transfers Out) overlaid with Godown Closing Stock [{unit}]
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 border border-purple-200">
            Solid Line: Closing Stock
          </span>
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
            Bars: Material Flows
          </span>
        </div>
      </div>

      <div className="h-80 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No ledger data points available for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                tickFormatter={(val) => formatQty(val, unit)}
                width={65}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
                      <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5 flex justify-between">
                        <span>{label}</span>
                        <span className="text-slate-500 font-normal">{unit}</span>
                      </div>
                      <div className="space-y-1">
                        {payload.map((entry) => (
                          <div
                            key={entry.dataKey as string}
                            className="flex items-center justify-between gap-4"
                          >
                            <span className="flex items-center gap-1.5 text-slate-600">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.name}:
                            </span>
                            <span className="font-semibold text-slate-900 font-mono">
                              {formatQty(Number(entry.value), unit)} {unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
              />

              {/* Marker for July 2026 Procurement Freeze */}
              <ReferenceLine
                x="2026-07"
                stroke="#ef4444"
                strokeDasharray="4 4"
                yAxisId="qty"
                label={{
                  value: "Receipts Freeze (Jul '26)",
                  position: "top",
                  fill: "#dc2626",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

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
