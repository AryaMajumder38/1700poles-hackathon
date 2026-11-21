"use client";

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
  itemCode: string;
  itemName: string;
}

export function ContractorStockChart({
  data,
  unit,
  itemCode,
  itemName,
}: ContractorStockChartProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">
              Project-Wide Contractor Stock vs. Actual Field Consumption
            </h4>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
              Project-Wide Scope (All 6 Districts)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Lumino ERP tracks consumption at project scope. Visualizes contractor hoarding vs field erection [{unit}].
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            Shaded Area: Contractor Idle Stock
          </span>
        </div>
      </div>

      <div className="h-80 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No contractor stock data points available for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
