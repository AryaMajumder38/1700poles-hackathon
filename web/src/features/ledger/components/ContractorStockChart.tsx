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
    <section className="min-w-0 rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-[17px] font-medium text-[#e7e7e7]">
          Contractor idle stock vs. field consumption
        </h3>
        <p className="mt-1 text-sm text-[#a0a0a0]">
          Project-wide across all 6 districts — contractor holdings against actual site consumption ({unit}).
        </p>
      </div>

      <div className="h-80 w-full min-w-0">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#898989]">
            No contractor stock data points available for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 18, right: 8, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="contractorIdleStockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5eead4" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#5eead4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#898989" }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="qty"
                tick={{ fontSize: 11, fill: "#898989" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val: number) => formatQty(val, unit)}
                width={60}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="rounded-xl border border-white/[0.1] bg-[#1a1a1a]/95 p-3 text-xs text-[#e7e7e7] shadow-2xl backdrop-blur-md">
                      <div className="mb-2 flex items-center justify-between gap-4 border-b border-white/[0.08] pb-1.5 font-medium text-[#e7e7e7]">
                        <span className="tabular-nums">{label}</span>
                        <span className="text-[#898989]">{unit}</span>
                      </div>
                      <div className="space-y-1.5">
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
                              <span className="flex items-center gap-1.5 text-[#a0a0a0]">
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.name}
                              </span>
                              <span className="font-medium tabular-nums text-white">
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
                align="left"
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, color: "#898989", paddingTop: 12 }}
              />

              {showFreezeLine && receiptsEndMonth && (
                <ReferenceLine
                  x={receiptsEndMonth}
                  stroke="#fb7185"
                  strokeDasharray="3 3"
                  yAxisId="qty"
                  label={{
                    value: `Receipts end (${formatMonthShort(receiptsEndMonth)})`,
                    position: "top",
                    fill: "#fb7185",
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                />
              )}

              <Bar
                yAxisId="qty"
                dataKey="net_issues"
                name="Net issues"
                fill="#fbbf24"
                radius={[2, 2, 0, 0]}
                maxBarSize={16}
              />

              <Bar
                yAxisId="qty"
                dataKey="total_consumption"
                name="Consumption"
                fill="#5eead4"
                radius={[2, 2, 0, 0]}
                maxBarSize={16}
              />

              <Area
                yAxisId="qty"
                type="monotone"
                dataKey="closing_contractor_stock"
                name="Contractor idle"
                stroke="#e7e7e7"
                strokeWidth={2}
                fill="url(#contractorIdleStockGrad)"
                fillOpacity={1}
                dot={false}
                activeDot={{ r: 4, fill: "#ffffff", stroke: "#5eead4", strokeWidth: 2 }}
              />

              <Area
                yAxisId="qty"
                type="monotone"
                dataKey="project_godown_stock"
                name="Godown stock"
                stroke="#a78bfa"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
                activeDot={{ r: 3.5, fill: "#a78bfa", strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
