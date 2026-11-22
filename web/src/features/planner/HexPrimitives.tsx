"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ActiveGodown, ItemUnit } from "@/types/lumino";
import type { TransferRouteRow } from "./plannerTypes";
import { formatPlainNumber, shortGodownName } from "./plannerTypes";

/** Retained export for compatibility; app uses global Newsreader/Inter/Mono fonts. */
export function HexFontLoader() {
  return null;
}

/** Retained export for compatibility; decorative corner marks removed per design brief. */
export function CornerMarks({ tone = "dark" }: { tone?: "light" | "dark" }) {
  void tone;
  return null;
}

const HAS_TEXT_COLOR_RE =
  /(?:^|\s)text-(?:white|black|transparent|current|\[|zinc|neutral|slate|gray|emerald|amber|rose|red|violet|teal|indigo|sky|cyan)/;

/** Formats a quantity with tabular numbers and muted UOM beside it (AGENTS.md rule). */
export function QtyText({
  value,
  unit,
  dashZero = false,
  signed = false,
  className = "",
}: {
  value: number;
  unit: ItemUnit;
  dashZero?: boolean;
  signed?: boolean;
  className?: string;
}) {
  if (!Number.isFinite(value) || (dashZero && value === 0)) {
    return <span className={`text-white/20 ${className}`}>—</span>;
  }
  const maxFrac = unit === "MT" ? 3 : unit === "KM" || unit === "KG" ? 1 : 0;
  const absFormatted = formatPlainNumber(Math.abs(value), maxFrac);
  const sign = signed
    ? value > 0
      ? "+"
      : value < 0
      ? "−"
      : ""
    : value < 0
    ? "−"
    : "";
  const defaultColor = HAS_TEXT_COLOR_RE.test(className) ? "" : "text-white";

  return (
    <span className={`tabular-nums ${defaultColor} ${className}`}>
      {sign}
      {absFormatted}
      <span className="ml-1 font-sans text-xs font-normal text-[#898989]">
        {unit}
      </span>
    </span>
  );
}

interface PrimaryPlateButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "light" | "dark";
  children: ReactNode;
}

export function PrimaryPlateButton({
  variant = "light",
  className = "",
  children,
  ...rest
}: PrimaryPlateButtonProps) {
  const base =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] disabled:opacity-40 cursor-pointer";
  const tone =
    variant === "dark"
      ? "bg-white text-black hover:opacity-90 active:opacity-80"
      : "bg-white/[0.06] text-[#e7e7e7] border border-white/[0.06] hover:bg-white/[0.11] active:bg-white/[0.16]";

  return (
    <button type="button" className={`${base} ${tone} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function FadingRulesDivider() {
  return <hr aria-hidden="true" className="border-t border-white/[0.06]" />;
}

const GODOWN_COORDS: Record<
  ActiveGodown,
  { x: number; y: number; dx: number; dy: number }
> = {
  "KANPUR FARRUKHABAD": { x: 102, y: 54, dx: 0, dy: -16 },
  "KANPUR KANNAUJ": { x: 214, y: 42, dx: 0, dy: -16 },
  "KANPUR ETAWAH": { x: 74, y: 124, dx: 0, dy: 20 },
  "KANPUR AURAIYA": { x: 178, y: 146, dx: 0, dy: 20 },
  "KANPUR DEHAT": { x: 292, y: 126, dx: 0, dy: 20 },
  "KANPUR NAGAR": { x: 356, y: 74, dx: 0, dy: -16 },
};

const BASE_CORRIDORS: Array<[ActiveGodown, ActiveGodown]> = [
  ["KANPUR FARRUKHABAD", "KANPUR KANNAUJ"],
  ["KANPUR FARRUKHABAD", "KANPUR ETAWAH"],
  ["KANPUR KANNAUJ", "KANPUR DEHAT"],
  ["KANPUR KANNAUJ", "KANPUR NAGAR"],
  ["KANPUR ETAWAH", "KANPUR AURAIYA"],
  ["KANPUR AURAIYA", "KANPUR DEHAT"],
  ["KANPUR DEHAT", "KANPUR NAGAR"],
];

const ARC_PALETTE = [
  { stroke: "#5eead4", glow: "rgba(94, 234, 212, 0.36)" },
  { stroke: "#a78bfa", glow: "rgba(167, 139, 250, 0.36)" },
  { stroke: "#fbbf24", glow: "rgba(251, 191, 36, 0.34)" },
];

const ISO_GRID_LEFT: Array<[number, number, number, number]> = [
  [36, 98, 224, 18],
  [76, 122, 264, 42],
  [116, 146, 304, 66],
  [156, 170, 344, 90],
  [196, 194, 384, 114],
];

const ISO_GRID_RIGHT: Array<[number, number, number, number]> = [
  [198, 18, 386, 98],
  [158, 42, 346, 122],
  [118, 66, 306, 146],
  [78, 90, 266, 170],
  [38, 114, 226, 194],
];

function Starburst({
  x,
  y,
  size = 9,
  color = "#e7e7e7",
  delay = "0s",
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
  delay?: string;
}) {
  const half = size / 2;
  return (
    <g
      className="hp-starburst"
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      <path
        d={`M ${x} ${y - half} Q ${x} ${y} ${x + half} ${y} Q ${x} ${y} ${x} ${
          y + half
        } Q ${x} ${y} ${x - half} ${y} Q ${x} ${y} ${x} ${y - half} Z`}
        fill={color}
      />
    </g>
  );
}

export function KanpurNetworkDiagram({
  routes,
}: {
  routes: TransferRouteRow[];
}) {
  const activePairs = new Map<
    string,
    { from: ActiveGodown; to: ActiveGodown; count: number }
  >();
  const activeDonors = new Set<ActiveGodown>();
  const activeReceivers = new Set<ActiveGodown>();

  for (const r of routes) {
    activeDonors.add(r.from_godown);
    activeReceivers.add(r.to_godown);
    const key = `${r.from_godown}->${r.to_godown}`;
    const existing = activePairs.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      activePairs.set(key, {
        from: r.from_godown,
        to: r.to_godown,
        count: 1,
      });
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-[#141414] px-4 py-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#e7e7e7]">
            Kanpur 6-godown corridor network
          </span>
          <span className="hidden items-center gap-3 text-[11px] text-[#898989] sm:inline-flex">
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-amber-300"
              />
              Donor
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-teal-300"
              />
              Receiver
            </span>
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-0.5 text-[11px] tabular-nums text-[#a0a0a0]">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              activePairs.size > 0
                ? "bg-teal-300 shadow-[0_0_6px_rgba(94,234,212,0.8)]"
                : "bg-white/25"
            }`}
          />
          {activePairs.size > 0
            ? `${activePairs.size} active route${activePairs.size > 1 ? "s" : ""}`
            : "Standby"}
        </span>
      </div>

      <svg
        viewBox="0 0 430 192"
        className="h-[180px] w-full"
        role="img"
        aria-label="Spectral isometric corridor diagram of the 6 active Kanpur godowns and LP transfer routes"
      >
        <defs>
          <radialGradient id="hp-net-aura-violet" cx="32%" cy="38%" r="55%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hp-net-aura-teal" cx="76%" cy="56%" r="50%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id="hp-net-iso-plane"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.14" />
            <stop offset="55%" stopColor="#2dd4bf" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.06" />
          </linearGradient>
          <filter
            id="hp-net-arc-glow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Atmospheric starlight washes */}
        <rect
          x="0"
          y="0"
          width="430"
          height="192"
          fill="url(#hp-net-aura-violet)"
        />
        <rect
          x="0"
          y="0"
          width="430"
          height="192"
          fill="url(#hp-net-aura-teal)"
        />

        {/* Selectively illuminated isometric construction facet */}
        <polygon
          points="214,22 386,96 214,174 42,96"
          fill="url(#hp-net-iso-plane)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
        />

        {/* Thin 1px isometric gridlines */}
        <g stroke="rgba(255,255,255,0.14)" strokeWidth="0.75" opacity="0.7">
          {ISO_GRID_LEFT.map(([x1, y1, x2, y2], i) => (
            <line key={`gl-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
          {ISO_GRID_RIGHT.map(([x1, y1, x2, y2], i) => (
            <line key={`gr-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>

        {/* Subtle 4-ray starburst accents */}
        <Starburst x={36} y={32} size={11} color="#a78bfa" delay="0s" />
        <Starburst x={398} y={36} size={9} color="#5eead4" delay="1.1s" />
        <Starburst x={392} y={162} size={10} color="#fcd34d" delay="2.2s" />

        {/* Crisp off-white architectural base corridors */}
        {BASE_CORRIDORS.map(([a, b], idx) => {
          const p1 = GODOWN_COORDS[a];
          const p2 = GODOWN_COORDS[b];
          return (
            <line
              key={`base-${idx}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          );
        })}

        {/* Glowing active donor -> receiver spectral arcs */}
        {Array.from(activePairs.values()).map((edge, idx) => {
          const p1 = GODOWN_COORDS[edge.from];
          const p2 = GODOWN_COORDS[edge.to];
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2 - 24;
          const dPath = `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
          const palette = ARC_PALETTE[idx % ARC_PALETTE.length];
          // Midpoint on quadratic bezier at t=0.5
          const midX = 0.25 * p1.x + 0.5 * mx + 0.25 * p2.x;
          const midY = 0.25 * p1.y + 0.5 * my + 0.25 * p2.y;

          return (
            <g key={`arc-${idx}`}>
              {/* Soft spectral glow trail */}
              <path
                d={dPath}
                fill="none"
                stroke={palette.glow}
                strokeWidth="4.5"
                strokeLinecap="round"
                filter="url(#hp-net-arc-glow)"
              />
              {/* Crisp structural arc */}
              <path
                d={dPath}
                fill="none"
                stroke={palette.stroke}
                strokeOpacity="0.45"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              {/* Animated light flow pulse */}
              <path
                d={dPath}
                fill="none"
                stroke={palette.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                className="hp-flow-arc"
              />
              {/* Midpoint flow jewel */}
              <circle
                cx={midX}
                cy={midY}
                r="2.4"
                fill="#ffffff"
                stroke={palette.stroke}
                strokeWidth="1.25"
              />
            </g>
          );
        })}

        {/* 6 Active Kanpur Godown Nodes */}
        {(Object.keys(GODOWN_COORDS) as ActiveGodown[]).map((g, idx) => {
          const pos = GODOWN_COORDS[g];
          const isDonor = activeDonors.has(g);
          const isReceiver = activeReceivers.has(g);
          const isActive = isDonor || isReceiver;

          const ringStroke =
            isDonor && isReceiver
              ? "#a78bfa"
              : isReceiver
              ? "#5eead4"
              : "#fbbf24";
          const fill =
            isDonor && isReceiver
              ? "#a78bfa"
              : isReceiver
              ? "#5eead4"
              : isDonor
              ? "#fbbf24"
              : "#1a1a1a";
          const stroke = isActive ? "#ffffff" : "rgba(255,255,255,0.45)";

          return (
            <g key={g}>
              {/* Isometric anchor diamond beneath node */}
              <polygon
                points={`${pos.x},${pos.y - 7.5} ${pos.x + 11},${pos.y} ${
                  pos.x
                },${pos.y + 7.5} ${pos.x - 11},${pos.y}`}
                fill="rgba(255,255,255,0.03)"
                stroke={isActive ? ringStroke : "rgba(255,255,255,0.16)"}
                strokeOpacity={isActive ? 0.45 : 0.6}
                strokeWidth="0.9"
              />

              {isActive && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="10.5"
                  fill="none"
                  stroke={ringStroke}
                  strokeWidth="1.15"
                  className="hp-node-ring"
                  style={{ animationDelay: `${idx * 0.35}s` }}
                />
              )}

              <circle
                cx={pos.x}
                cy={pos.y}
                r="4.2"
                fill={fill}
                stroke={stroke}
                strokeWidth="1.25"
              />

              <text
                x={pos.x + pos.dx}
                y={pos.y + pos.dy}
                textAnchor="middle"
                fill={isActive ? "#e7e7e7" : "#898989"}
                style={{
                  fontSize: "10px",
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: "0.01em",
                }}
              >
                {shortGodownName(g)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
