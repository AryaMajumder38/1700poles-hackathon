"use client";

import { useState, type ReactNode } from "react";
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
  footerSlot?: ReactNode;
  scopedGodown?: string | null;
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
    <div className="w-64 rounded-[4px] border border-[#3a3138] bg-[#14141c]/95 p-3.5 text-xs text-[#f5c0c0] shadow-xl">
      <div className="flex items-center justify-between border-b border-[#3a3138] pb-2">
        <span className="hp-mono font-semibold text-[#ffffff]">{pt.month}</span>
        {pt.month >= "2026-07" && (
          <span className="hp-mono border border-[#f5c0c0]/40 px-1.5 py-0.5 text-[10px] uppercase text-[#f5c0c0]">
            Wind-Down
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5 tabular-nums">
        <div className="flex justify-between">
          <span className="text-[#99797d]">Historical Idle</span>
          <span className="font-medium text-[#e6c46a]">
            {formatQty(pt.actual_idle_stock, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#99797d]">Simulated Idle</span>
          <span className="font-medium text-[#7ad3b2]">
            {formatQty(pt.simulated_idle_stock, unit)}
          </span>
        </div>
        <div className="flex justify-between border-t border-dashed border-[#3a3138] pt-1.5">
          <span className="text-[#99797d]">Idle Saved</span>
          <span
            className={`font-semibold ${
              delta >= 0 ? "text-[#7ad3b2]" : "text-[#e6c46a]"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {formatQty(delta, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#99797d]">Actual Receipts</span>
          <span className="text-[#e3b2b3]">
            {formatQty(pt.actual_receipts, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#99797d]">Simulated Receipts</span>
          <span className="text-[#ad8eb6]">
            {formatQty(pt.simulated_receipts, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#99797d]">Site Consumption</span>
          <span className="text-[#ffffff]">
            {formatQty(pt.actual_consumption, unit)}
          </span>
        </div>

        {shortage > 0 && (
          <div className="mt-2 border border-[#b43c57]/50 bg-[#b43c57]/15 p-2 text-[#ffd4dc]">
            <div className="flex justify-between font-semibold">
              <span>Simulated Shortage</span>
              <span>{formatQty(shortage, unit)}</span>
            </div>
            {stockoutGodowns.length > 0 && (
              <div className="mt-0.5 text-[10px] text-[#f5c0c0]">
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
  footerSlot,
  scopedGodown,
}: IdleStockChartProps) {
  const [chartMode, setChartMode] = useState<"idle" | "receipts">("idle");

  const chartData = summary.monthly_series.map((pt) => ({
    ...pt,
    shortage_marker:
      (pt.simulated_shortage_qty ?? 0) > 0 ? pt.simulated_idle_stock : null,
  }));

  const activePoint = summary.monthly_series.find(
    (pt) => pt.month === activeMonth
  );
  const activeDelta = activePoint
    ? activePoint.actual_idle_stock - activePoint.simulated_idle_stock
    : 0;

  return (
    <section
      aria-label="Actual vs Planned Idle Stock Curve"
      className="hp-floating-panel overflow-hidden"
    >
      {/* Clean White Panel Header */}
      <div className="flex flex-col gap-3 border-b border-[#e9e5e8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="hp-heading text-lg font-extrabold text-[#14141c]">
              {chartMode === "idle" ? (
                <>
                  Idle stock trajectory{" "}
                  <span className="hp-italic text-[23px] font-light text-[#31263b]">
                    across 44 months
                  </span>
                </>
              ) : (
                <>
                  Vendor receipts &amp; site usage{" "}
                  <span className="hp-italic text-[23px] font-light text-[#31263b]">
                    cadence
                  </span>
                </>
              )}
            </h3>
            {scopedGodown && (
              <span className="hp-mono inline-flex items-center border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-sky-800">
                Project-Wide (6 Godowns)
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-light text-[#89828d]">
            {scopedGodown
              ? "Project-wide backtest series (consumption is tracked project-wide) · "
              : "Click any point on the curve to jump to that month · "}
            {activePoint && (
              <span className="hp-mono text-[#43394c]">
                {activeMonth} delta:{" "}
                <strong
                  style={{ color: activeDelta >= 0 ? "#2c7a62" : "#a98529" }}
                >
                  {activeDelta >= 0 ? "−" : "+"}
                  {formatQty(Math.abs(activeDelta), summary.unit)}
                </strong>
              </span>
            )}
          </p>
        </div>

        <div className="inline-flex shrink-0 self-start border border-[#dbd7da] bg-[#fffcfc] sm:self-center">
          <button
            type="button"
            aria-pressed={chartMode === "idle"}
            onClick={() => setChartMode("idle")}
            className={`hp-mono px-3.5 py-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#31263b] cursor-pointer ${
              chartMode === "idle"
                ? "bg-[#31263b] text-[#fffcfc]"
                : "text-[#43394c] hover:bg-[#e9e5e8]"
            }`}
          >
            Idle Stock
          </button>
          <button
            type="button"
            aria-pressed={chartMode === "receipts"}
            onClick={() => setChartMode("receipts")}
            className={`hp-mono border-l border-[#dbd7da] px-3.5 py-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#31263b] cursor-pointer ${
              chartMode === "receipts"
                ? "bg-[#31263b] text-[#fffcfc]"
                : "text-[#43394c] hover:bg-[#e9e5e8]"
            }`}
          >
            Receipts vs Usage
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="px-4 pt-5 pb-4 sm:px-6">
        <div className="h-[330px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === "idle" ? (
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 14, left: 4, bottom: 4 }}
                onClick={(state) => {
                  if (state && typeof state.activeLabel === "string") {
                    onSelectMonth(state.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9e5e8" />
                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 11,
                    fill: "#89828d",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                  axisLine={{ stroke: "#dbd7da" }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#89828d",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v: number) =>
                    summary.unit === "MT"
                      ? `${v.toFixed(1)}`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : `${v}`
                  }
                />
                <Tooltip content={<ChartTooltip unit={summary.unit} />} />
                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "10px",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                />
                <ReferenceLine
                  x="2026-07"
                  stroke="#a98529"
                  strokeDasharray="4 4"
                  label={{
                    value: "Receipts End",
                    position: "insideTopRight",
                    fill: "#93701d",
                    fontSize: 10,
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                />
                <ReferenceLine
                  x={activeMonth}
                  stroke="#31263b"
                  strokeWidth={1.5}
                />
                <Bar
                  dataKey="simulated_shortage_qty"
                  name={`Shortage (${summary.unit})`}
                  fill="#b43c57"
                  fillOpacity={0.34}
                  radius={[1, 1, 0, 0]}
                  maxBarSize={12}
                />
                <Area
                  type="monotone"
                  dataKey="actual_idle_stock"
                  name={`Actual Idle (${summary.unit})`}
                  stroke="#a98529"
                  fill="#a98529"
                  fillOpacity={0.11}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="simulated_idle_stock"
                  name={`Simulated Plan (${summary.unit})`}
                  stroke="#2c7a62"
                  strokeWidth={2.3}
                  dot={(dotProps) => {
                    const pt = dotProps.payload as
                      | PlannerMonthlyPoint
                      | undefined;
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
                        r={3.5}
                        fill="#b43c57"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 5, fill: "#2c7a62" }}
                />
              </ComposedChart>
            ) : (
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 14, left: 4, bottom: 4 }}
                onClick={(state) => {
                  if (state && typeof state.activeLabel === "string") {
                    onSelectMonth(state.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9e5e8" />
                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 11,
                    fill: "#89828d",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                  axisLine={{ stroke: "#dbd7da" }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#89828d",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v: number) =>
                    summary.unit === "MT"
                      ? `${v.toFixed(1)}`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : `${v}`
                  }
                />
                <Tooltip content={<ChartTooltip unit={summary.unit} />} />
                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "10px",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                />
                <ReferenceLine
                  x={activeMonth}
                  stroke="#31263b"
                  strokeWidth={1.5}
                />
                <Bar
                  dataKey="actual_receipts"
                  name={`Actual Receipts (${summary.unit})`}
                  fill="#a98529"
                  fillOpacity={0.45}
                  maxBarSize={12}
                />
                <Bar
                  dataKey="simulated_receipts"
                  name={`Simulated Receipts (${summary.unit})`}
                  fill="#7c6396"
                  fillOpacity={0.78}
                  maxBarSize={12}
                />
                <Line
                  type="monotone"
                  dataKey="actual_consumption"
                  name={`Site Consumption (${summary.unit})`}
                  stroke="#31263b"
                  strokeWidth={2.2}
                  dot={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Docked Charcoal Replay Strip */}
      {footerSlot}
    </section>
  );
}
