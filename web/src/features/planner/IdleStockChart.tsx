"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ItemUnit } from "@/types/lumino";
import type {
  PlannerBacktestComparison,
  PlannerMonthlyPoint,
} from "./plannerTypes";
import { formatQty, shortGodownName } from "./plannerTypes";

interface IdleStockChartProps {
  summary: PlannerBacktestComparison;
  activeMonth: string;
  onSelectMonth: (month: string) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: PlannerMonthlyPoint }>;
  unit: ItemUnit;
}

function ChartTooltip({ active, payload, unit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  const shortage = pt.simulated_shortage_qty ?? 0;
  const stockoutGodowns = pt.stockout_godowns ?? [];
  const delta = pt.actual_idle_stock - pt.simulated_idle_stock;

  return (
    <div className="w-64 rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="font-mono font-bold text-amber-400">{pt.month}</span>
        {pt.month >= "2026-07" && (
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
            Wind-Down
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1.5 tabular-nums">
        <div className="flex justify-between">
          <span className="text-slate-400">Historical Idle:</span>
          <span className="font-semibold text-amber-300">
            {formatQty(pt.actual_idle_stock, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Simulated Idle:</span>
          <span className="font-semibold text-emerald-400">
            {formatQty(pt.simulated_idle_stock, unit)}
          </span>
        </div>
        <div className="flex justify-between border-t border-slate-800 pt-1">
          <span className="text-slate-400">Idle Saved:</span>
          <span
            className={`font-semibold ${
              delta >= 0 ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {formatQty(delta, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Actual Receipts:</span>
          <span>{formatQty(pt.actual_receipts, unit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Simulated Receipts:</span>
          <span className="text-sky-300">
            {formatQty(pt.simulated_receipts, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Site Consumption:</span>
          <span>{formatQty(pt.actual_consumption, unit)}</span>
        </div>

        {shortage > 0 && (
          <div className="mt-1.5 rounded border border-rose-500/40 bg-rose-950/70 p-2 text-rose-200">
            <div className="flex justify-between font-semibold">
              <span>Simulated Shortage:</span>
              <span>{formatQty(shortage, unit)}</span>
            </div>
            {stockoutGodowns.length > 0 && (
              <div className="mt-0.5 text-[10px] text-rose-300">
                Affected:{" "}
                {stockoutGodowns.map((g) => shortGodownName(g)).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IdleStockChart({
  summary,
  activeMonth,
  onSelectMonth,
}: IdleStockChartProps) {
  const [chartMode, setChartMode] = useState<"idle" | "receipts">("idle");

  const chartData = summary.monthly_series.map((pt) => ({
    ...pt,
    shortage_marker:
      (pt.simulated_shortage_qty ?? 0) > 0 ? pt.simulated_idle_stock : null,
  }));

  const stockoutMonthCount = summary.monthly_series.filter(
    (pt) => (pt.simulated_shortage_qty ?? 0) > 0
  ).length;

  return (
    <section
      aria-label="Actual vs Planned Idle Stock Curve"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 sm:text-base">
            {chartMode === "idle"
              ? "Actual vs. Simulated Godown Idle Stock (44 Months)"
              : "Actual vs. Simulated Vendor Receipts & Consumption"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Vertical cursor synced to{" "}
            <span className="font-mono font-semibold text-slate-800">
              {activeMonth}
            </span>{" "}
            • Unit:{" "}
            <span className="font-mono font-semibold text-slate-800">
              {summary.unit}
            </span>{" "}
            • Red shortage bars highlight all {stockoutMonthCount} months with
            unfilled local godown demand.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setChartMode("idle")}
            className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
              chartMode === "idle"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Idle Stock Curve
          </button>
          <button
            type="button"
            onClick={() => setChartMode("receipts")}
            className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
              chartMode === "receipts"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Receipts vs Usage
          </button>
        </div>
      </div>

      <div className="mt-4 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === "idle" ? (
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 16, left: 6, bottom: 4 }}
              onClick={(state) => {
                if (state && typeof state.activeLabel === "string") {
                  onSelectMonth(state.activeLabel);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748b" }}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                width={64}
                tickFormatter={(v: number) =>
                  summary.unit === "MT"
                    ? `${v.toFixed(1)}`
                    : v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : `${v}`
                }
              />
              <Tooltip content={<ChartTooltip unit={summary.unit} />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "6px" }} />
              <ReferenceLine
                x="2026-07"
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: "Receipts End",
                  position: "insideTopRight",
                  fill: "#b45309",
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                x={activeMonth}
                stroke="#0f172a"
                strokeWidth={2}
              />
              <Bar
                dataKey="simulated_shortage_qty"
                name={`Simulated Shortage (${summary.unit})`}
                fill="#f43f5e"
                fillOpacity={0.45}
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
              />
              <Area
                type="monotone"
                dataKey="actual_idle_stock"
                name={`Actual Historical Idle (${summary.unit})`}
                stroke="#d97706"
                fill="#fef3c7"
                fillOpacity={0.45}
                strokeWidth={2.2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="simulated_idle_stock"
                name={`Simulated Plan Idle (${summary.unit})`}
                stroke="#059669"
                strokeWidth={2.6}
                dot={(dotProps) => {
                  const pt = dotProps.payload as PlannerMonthlyPoint | undefined;
                  if (
                    !pt ||
                    !pt.simulated_shortage_qty ||
                    pt.simulated_shortage_qty <= 0 ||
                    typeof dotProps.cx !== "number" ||
                    typeof dotProps.cy !== "number"
                  ) {
                    return <g key={`empty-${dotProps.index}`} />;
                  }
                  return (
                    <circle
                      key={`shortage-${dotProps.index}`}
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={4}
                      fill="#e11d48"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 5, fill: "#059669" }}
              />
            </ComposedChart>
          ) : (
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 16, left: 6, bottom: 4 }}
              onClick={(state) => {
                if (state && typeof state.activeLabel === "string") {
                  onSelectMonth(state.activeLabel);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748b" }}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                width={64}
                tickFormatter={(v: number) =>
                  summary.unit === "MT"
                    ? `${v.toFixed(1)}`
                    : v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : `${v}`
                }
              />
              <Tooltip content={<ChartTooltip unit={summary.unit} />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "6px" }} />
              <ReferenceLine
                x={activeMonth}
                stroke="#0f172a"
                strokeWidth={2}
              />
              <Bar
                dataKey="actual_receipts"
                name={`Actual Receipts (${summary.unit})`}
                fill="#f59e0b"
                fillOpacity={0.55}
                maxBarSize={14}
              />
              <Bar
                dataKey="simulated_receipts"
                name={`Simulated Receipts (${summary.unit})`}
                fill="#0284c7"
                fillOpacity={0.8}
                maxBarSize={14}
              />
              <Line
                type="monotone"
                dataKey="actual_consumption"
                name={`Actual Site Consumption (${summary.unit})`}
                stroke="#0f172a"
                strokeWidth={2.2}
                dot={false}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
