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
import { QtyText } from "./HexPrimitives";
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
    <div className="w-64 rounded-2xl border border-white/[0.1] bg-[#1a1a1a]/95 p-3.5 text-xs text-[#e7e7e7] shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
        <span className="font-medium text-white tabular-nums">{pt.month}</span>
        {pt.month >= "2026-07" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[11px] text-[#e7e7e7]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            Wind-down
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5 tabular-nums">
        <div className="flex justify-between">
          <span className="text-[#898989]">Historical idle</span>
          <span className="font-medium text-amber-300">
            {formatQty(pt.actual_idle_stock, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#898989]">Simulated idle</span>
          <span className="font-medium text-teal-300">
            {formatQty(pt.simulated_idle_stock, unit)}
          </span>
        </div>
        <div className="flex justify-between border-t border-white/[0.06] pt-1.5">
          <span className="text-[#898989]">Idle saved</span>
          <span
            className={`font-medium ${
              delta >= 0 ? "text-emerald-400" : "text-amber-300"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {formatQty(delta, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#898989]">Actual receipts</span>
          <span className="text-[#e7e7e7]">
            {formatQty(pt.actual_receipts, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#898989]">Simulated receipts</span>
          <span className="text-violet-300">
            {formatQty(pt.simulated_receipts, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#898989]">Site consumption</span>
          <span className="font-medium text-white">
            {formatQty(pt.actual_consumption, unit)}
          </span>
        </div>

        {shortage > 0 && (
          <div className="mt-2 border-t border-white/[0.08] pt-2 text-rose-400">
            <div className="flex justify-between font-medium">
              <span>Simulated shortage</span>
              <span>{formatQty(shortage, unit)}</span>
            </div>
            {stockoutGodowns.length > 0 && (
              <div className="mt-0.5 text-[#a0a0a0]">
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
      className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a]"
    >
      {/* Card Header */}
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[17px] font-medium text-[#e7e7e7]">
              {chartMode === "idle"
                ? "Idle stock trajectory (44 months)"
                : "Vendor receipts vs site usage"}
            </h3>
            {scopedGodown && (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-0.5 text-xs text-[#a0a0a0]">
                Project-wide
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-[#a0a0a0]">
            {scopedGodown
              ? "Project-wide backtest series · "
              : "Click any point to jump to that month · "}
            {activePoint && (
              <span className="tabular-nums">
                {activeMonth} delta:{" "}
                <QtyText
                  value={
                    activeDelta >= 0
                      ? -Math.abs(activeDelta)
                      : Math.abs(activeDelta)
                  }
                  unit={summary.unit}
                  signed
                  className={
                    activeDelta >= 0
                      ? "font-medium text-emerald-400"
                      : "font-medium text-amber-300"
                  }
                />
              </span>
            )}
          </p>
        </div>

        {/* Pill Segmented Control */}
        <div className="inline-flex shrink-0 self-start rounded-full border border-white/[0.06] bg-white/[0.05] p-1 sm:self-center">
          <button
            type="button"
            aria-pressed={chartMode === "idle"}
            onClick={() => setChartMode("idle")}
            className={`rounded-full px-3.5 py-1.5 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
              chartMode === "idle"
                ? "bg-white font-medium text-black shadow-sm"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Idle stock
          </button>
          <button
            type="button"
            aria-pressed={chartMode === "receipts"}
            onClick={() => setChartMode("receipts")}
            className={`rounded-full px-3.5 py-1.5 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
              chartMode === "receipts"
                ? "bg-white font-medium text-black shadow-sm"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Receipts vs usage
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="px-6 pt-5 pb-4">
        <div className="h-[320px] w-full">
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
                <defs>
                  <linearGradient
                    id="hp-actual-idle-grad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="hp-sim-idle-grad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#5eead4" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="#5eead4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#898989" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#898989" }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                  tickFormatter={(v: number) =>
                    summary.unit === "MT"
                      ? `${v.toFixed(1)}`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : `${v}`
                  }
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.16)", strokeWidth: 1 }}
                  content={<ChartTooltip unit={summary.unit} />}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "10px",
                    color: "#a0a0a0",
                  }}
                />
                <ReferenceLine
                  x="2026-07"
                  stroke="rgba(255,255,255,0.22)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Receipts end",
                    position: "insideTopRight",
                    fill: "#898989",
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  x={activeMonth}
                  stroke="#a78bfa"
                  strokeWidth={1.25}
                  strokeDasharray="3 3"
                />
                <Bar
                  dataKey="simulated_shortage_qty"
                  name={`Shortage (${summary.unit})`}
                  fill="#fb7185"
                  fillOpacity={0.38}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={10}
                />
                <Area
                  type="monotone"
                  dataKey="actual_idle_stock"
                  name={`Actual idle (${summary.unit})`}
                  stroke="#fbbf24"
                  fill="url(#hp-actual-idle-grad)"
                  strokeWidth={1.75}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="simulated_idle_stock"
                  name={`Simulated plan (${summary.unit})`}
                  stroke="#5eead4"
                  fill="url(#hp-sim-idle-grad)"
                  strokeWidth={2}
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
                        r={3.75}
                        fill="#fb7185"
                        stroke="#1a1a1a"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{
                    r: 4.5,
                    fill: "#5eead4",
                    stroke: "#1a1a1a",
                    strokeWidth: 1.5,
                  }}
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
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#898989" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#898989" }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                  tickFormatter={(v: number) =>
                    summary.unit === "MT"
                      ? `${v.toFixed(1)}`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : `${v}`
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  content={<ChartTooltip unit={summary.unit} />}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "10px",
                    color: "#a0a0a0",
                  }}
                />
                <ReferenceLine
                  x={activeMonth}
                  stroke="#a78bfa"
                  strokeWidth={1.25}
                  strokeDasharray="3 3"
                />
                <Bar
                  dataKey="actual_receipts"
                  name={`Actual receipts (${summary.unit})`}
                  fill="rgba(255,255,255,0.18)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={12}
                />
                <Bar
                  dataKey="simulated_receipts"
                  name={`Simulated receipts (${summary.unit})`}
                  fill="#a78bfa"
                  fillOpacity={0.85}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={12}
                />
                <Line
                  type="monotone"
                  dataKey="actual_consumption"
                  name={`Site consumption (${summary.unit})`}
                  stroke="#5eead4"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4.5,
                    fill: "#5eead4",
                    stroke: "#1a1a1a",
                    strokeWidth: 1.5,
                  }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Docked Timeline Scrubber */}
      {footerSlot}
    </section>
  );
}
