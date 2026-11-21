"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { ActiveGodown } from "@/types/lumino";
import type { TransferRouteRow } from "./plannerTypes";
import { shortGodownName } from "./plannerTypes";

const HEX_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,100..125,600..800;1,100..125,600..800&family=Cormorant+Garamond:ital,wght@1,300;1,400&family=IBM+Plex+Mono:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";

export function HexFontLoader() {
  useEffect(() => {
    const id = "lumino-planner-hex-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = HEX_FONTS_HREF;
    document.head.appendChild(link);
  }, []);
  return null;
}

export function CornerMarks({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const stroke = tone === "dark" ? "#6a565b" : "#afa9b1";
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 h-2.5 w-2.5"
        style={{
          borderTop: `1px solid ${stroke}`,
          borderLeft: `1px solid ${stroke}`,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-2.5 w-2.5"
        style={{
          borderTop: `1px solid ${stroke}`,
          borderRight: `1px solid ${stroke}`,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5"
        style={{
          borderBottom: `1px solid ${stroke}`,
          borderLeft: `1px solid ${stroke}`,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 h-2.5 w-2.5"
        style={{
          borderBottom: `1px solid ${stroke}`,
          borderRight: `1px solid ${stroke}`,
        }}
      />
    </>
  );
}

export function SparkleGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 2V7.5M12 16.5V22M2 12H7.5M16.5 12H22M4.93 4.93L8.82 8.82M15.18 15.18L19.07 19.07M19.07 4.93L15.18 8.82M8.82 15.18L4.93 19.07"
        stroke="#cda0a5"
        strokeWidth="1.25"
        strokeLinecap="square"
      />
    </svg>
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
  const loopBorder = variant === "dark" ? "#ad8eb6" : "#cda0a5";
  const loopBg = variant === "dark" ? "#14141c" : "#fffcfc";

  return (
    <button
      type="button"
      className={`${
        variant === "dark" ? "hp-btn-primary-dark" : "hp-btn-primary"
      } ${className}`}
      {...rest}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-[3px] -left-[3px] h-[5px] w-[5px] rounded-full"
        style={{ border: `1px solid ${loopBorder}`, backgroundColor: loopBg }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-[3px] -right-[3px] h-[5px] w-[5px] rounded-full"
        style={{ border: `1px solid ${loopBorder}`, backgroundColor: loopBg }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[3px] -left-[3px] h-[5px] w-[5px] rounded-full"
        style={{ border: `1px solid ${loopBorder}`, backgroundColor: loopBg }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[3px] -bottom-[3px] h-[5px] w-[5px] rounded-full"
        style={{ border: `1px solid ${loopBorder}`, backgroundColor: loopBg }}
      />
      {children}
    </button>
  );
}

export function FadingRulesDivider() {
  const opacities = [0.85, 0.56, 0.34, 0.18, 0.08];
  return (
    <div aria-hidden="true" className="flex flex-col gap-[3px] py-1">
      {opacities.map((op, i) => (
        <div
          key={i}
          className="h-px w-full"
          style={{
            background: `linear-gradient(90deg, rgba(175,169,177,${op * 0.65}) 0%, rgba(219,215,218,${op}) 20%, rgba(219,215,218,${op}) 80%, rgba(175,169,177,${op * 0.65}) 100%)`,
          }}
        />
      ))}
    </div>
  );
}

const GODOWN_COORDS: Record<
  ActiveGodown,
  { x: number; y: number; dx: number; dy: number }
> = {
  "KANPUR FARRUKHABAD": { x: 86, y: 38, dx: 0, dy: -13 },
  "KANPUR KANNAUJ": { x: 194, y: 42, dx: 0, dy: -13 },
  "KANPUR ETAWAH": { x: 64, y: 120, dx: 0, dy: 17 },
  "KANPUR AURAIYA": { x: 164, y: 134, dx: 0, dy: 17 },
  "KANPUR DEHAT": { x: 266, y: 118, dx: 0, dy: 17 },
  "KANPUR NAGAR": { x: 344, y: 76, dx: 0, dy: -13 },
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
    <div className="relative border border-[#dbd7da] bg-[#fffcfc] px-4 py-3">
      <CornerMarks tone="light" />
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.0833em] text-[#89828d] hp-mono">
        <span>KANPUR 6-GODOWN CORRIDOR GRAPH</span>
        <span>
          {activePairs.size > 0
            ? `${activePairs.size} ACTIVE ROUTE${activePairs.size > 1 ? "S" : ""}`
            : "STANDBY"}
        </span>
      </div>
      <svg
        viewBox="0 0 410 168"
        className="h-[152px] w-full"
        role="img"
        aria-label="Schematic line diagram of the 6 active Kanpur godowns and LP transfer routes"
      >
        <polygon
          points="32,150 378,150 394,20 18,20"
          fill="rgba(49,38,59,0.02)"
          stroke="#e9e5e8"
          strokeWidth="1"
        />
        <line
          x1="24"
          y1="86"
          x2="386"
          y2="86"
          stroke="#e9e5e8"
          strokeWidth="0.75"
          strokeDasharray="3 4"
        />
        <line
          x1="205"
          y1="20"
          x2="205"
          y2="150"
          stroke="#e9e5e8"
          strokeWidth="0.75"
          strokeDasharray="3 4"
        />

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
              stroke="rgba(49,38,59,0.16)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          );
        })}

        {Array.from(activePairs.values()).map((edge, idx) => {
          const p1 = GODOWN_COORDS[edge.from];
          const p2 = GODOWN_COORDS[edge.to];
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2 - 20;
          return (
            <g key={`arc-${idx}`}>
              <path
                d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                fill="none"
                stroke="#2c7a62"
                strokeWidth="1.6"
              />
              <circle cx={mx} cy={my + 10} r="2.2" fill="#ad8eb6" />
            </g>
          );
        })}

        {(Object.keys(GODOWN_COORDS) as ActiveGodown[]).map((g) => {
          const pos = GODOWN_COORDS[g];
          const isDonor = activeDonors.has(g);
          const isReceiver = activeReceivers.has(g);
          const fill = isReceiver
            ? "#2c7a62"
            : isDonor
            ? "#ad8eb6"
            : "#fffcfc";
          const stroke = isReceiver
            ? "#2c7a62"
            : isDonor
            ? "#31263b"
            : "#43394c";
          return (
            <g key={g}>
              {(isDonor || isReceiver) && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="10"
                  fill="none"
                  stroke={
                    isReceiver
                      ? "rgba(44,122,98,0.32)"
                      : "rgba(173,142,182,0.45)"
                  }
                  strokeWidth="1"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="4.5"
                fill={fill}
                stroke={stroke}
                strokeWidth="1.25"
              />
              <text
                x={pos.x + pos.dx}
                y={pos.y + pos.dy}
                textAnchor="middle"
                fill="#31263b"
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: "8.5px",
                  letterSpacing: "0.06em",
                  fontWeight: isDonor || isReceiver ? 600 : 400,
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
