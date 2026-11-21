"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { ActiveGodown } from "@/types/lumino";
import styles from "./plannerHex.module.css";
import type { TransferRouteRow } from "./plannerTypes";
import { shortGodownName } from "./plannerTypes";

const HEX_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,100..125,600..800;1,100..125,600..800&family=Cormorant+Garamond:ital,wght@1,300;1,400&family=IBM+Plex+Mono:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";

/**
 * Loads the Hex design-system Google Font substitutes (Archivo, Cormorant Garamond,
 * IBM Plex Sans, IBM Plex Mono) strictly on client mount without modifying Track A's layout.tsx.
 */
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

/**
 * 10px L-shaped drafting registration marks placed at the four corners of major assemblies.
 */
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

/**
 * Signature Hex small geometric rose sparkle (short radial lines) paired beside italic opening phrases.
 */
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

/**
 * Engineered Plate primary button with 1px corners, gradient border, and 4 signature corner loops.
 */
interface PrimaryPlateButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "light" | "dark";
  size?: "sm" | "md";
  children: ReactNode;
}

export function PrimaryPlateButton({
  variant = "light",
  size = "md",
  className = "",
  children,
  ...rest
}: PrimaryPlateButtonProps) {
  const loopBorder = variant === "dark" ? "#ad8eb6" : "#cda0a5";
  const loopBg = variant === "dark" ? "#14141c" : "#fffcfc";
  const sizeClass =
    size === "sm" ? "h-[38px] px-3.5 text-xs" : "h-[42px] px-4 text-[13px]";

  return (
    <button
      type="button"
      className={`${
        variant === "dark" ? styles.primaryPlateDark : styles.primaryPlate
      } ${sizeClass} ${className}`}
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

/**
 * Signature Hex fading horizontal rule bundle (1px rules spaced 3px apart with descending opacity).
 */
export function FadingRulesDivider() {
  const opacities = [0.85, 0.58, 0.36, 0.2, 0.09];
  return (
    <div aria-hidden="true" className="flex flex-col gap-[3px] py-2">
      {opacities.map((op, i) => (
        <div
          key={i}
          className="h-px w-full"
          style={{
            background: `linear-gradient(90deg, rgba(175,169,177,${op * 0.7}) 0%, rgba(219,215,218,${op}) 20%, rgba(219,215,218,${op}) 80%, rgba(175,169,177,${op * 0.7}) 100%)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Relative geographic schematic positions for the 6 Active Kanpur Construction Godowns.
 * Strictly excludes KANPUR CLOSER per AGENTS.md domain rules.
 */
const GODOWN_COORDS: Record<ActiveGodown, { x: number; y: number; dx: number; dy: number }> = {
  "KANPUR FARRUKHABAD": { x: 84, y: 34, dx: 0, dy: -12 },
  "KANPUR KANNAUJ": { x: 186, y: 40, dx: 0, dy: -12 },
  "KANPUR ETAWAH": { x: 64, y: 112, dx: 0, dy: 16 },
  "KANPUR AURAIYA": { x: 158, y: 128, dx: 0, dy: 16 },
  "KANPUR DEHAT": { x: 254, y: 110, dx: 0, dy: 16 },
  "KANPUR NAGAR": { x: 334, y: 74, dx: 0, dy: -12 },
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

/**
 * Spare 1px Technical Line Illustration depicting the 6 Kanpur godowns and active LP transfer arcs.
 */
export function KanpurNetworkDiagram({
  routes,
}: {
  routes: TransferRouteRow[];
}) {
  const activePairs = new Map<string, { from: ActiveGodown; to: ActiveGodown; count: number; totalQty: number }>();
  const activeDonors = new Set<ActiveGodown>();
  const activeReceivers = new Set<ActiveGodown>();

  for (const r of routes) {
    activeDonors.add(r.from_godown);
    activeReceivers.add(r.to_godown);
    const key = `${r.from_godown}->${r.to_godown}`;
    const existing = activePairs.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalQty += r.qty;
    } else {
      activePairs.set(key, {
        from: r.from_godown,
        to: r.to_godown,
        count: 1,
        totalQty: r.qty,
      });
    }
  }

  return (
    <div className="relative overflow-hidden border border-[#dbd7da] bg-[#fffcfc] p-2.5">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.0833em] text-[#89828d]">
        <span className={styles.fontMono}>FIG. 02 — KANPUR 6-GODOWN LP TOPOLOGY</span>
        <span className={styles.fontMono}>
          {routes.length > 0 ? `${activePairs.size} ACTIVE CORRIDOR${activePairs.size > 1 ? "S" : ""}` : "STANDBY MESH"}
        </span>
      </div>
      <svg
        viewBox="0 0 400 160"
        className="h-[136px] w-full"
        role="img"
        aria-label="Schematic network topology of the 6 active Kanpur godowns and inter-godown transfer routes"
      >
        {/* Subtle perspective base trapezoid */}
        <polygon
          points="36,144 366,144 384,22 20,22"
          fill="rgba(49,38,59,0.025)"
          stroke="#e9e5e8"
          strokeWidth="1"
        />
        <line x1="28" y1="82" x2="375" y2="82" stroke="#e9e5e8" strokeWidth="0.75" strokeDasharray="3 4" />
        <line x1="200" y1="22" x2="200" y2="144" stroke="#e9e5e8" strokeWidth="0.75" strokeDasharray="3 4" />

        {/* Baseline passive road corridors (1px muted eggplant) */}
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

        {/* Active LP transfer curved arcs */}
        {Array.from(activePairs.values()).map((edge, idx) => {
          const p1 = GODOWN_COORDS[edge.from];
          const p2 = GODOWN_COORDS[edge.to];
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2 - 18;
          return (
            <g key={`arc-${idx}`}>
              <path
                d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                fill="none"
                stroke="#2c7a62"
                strokeWidth="1.6"
              />
              <circle cx={mx} cy={my + 9} r="2.2" fill="#ad8eb6" />
            </g>
          );
        })}

        {/* 6 Active Godown Nodes */}
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
                  stroke={isReceiver ? "rgba(44,122,98,0.3)" : "rgba(173,142,182,0.45)"}
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
