"use client";

import { useId, useState, type MouseEvent } from "react";
import type { SetChildImbalance } from "@/types/lumino";
import type { CellVisualStatus } from "./setsUtils";

interface KitAssemblyWireframeProps {
  childrenItems: SetChildImbalance[];
  status: CellVisualStatus;
  hasBottleneck: boolean;
}

interface IsoCubeGeom {
  topFace: string;
  leftFace: string;
  rightFace: string;
  outerStroke: string;
  innerY: string;
  backHidden: string;
  topVertex: [number, number];
  bottomVertex: [number, number];
}

function buildIsoCube(cx: number, cy: number, r: number): IsoCubeGeom {
  const dx = +(r * 0.866).toFixed(2);
  const dy = +(r * 0.5).toFixed(2);

  const top: [number, number] = [cx, cy - r];
  const rt: [number, number] = [cx + dx, cy - dy];
  const rb: [number, number] = [cx + dx, cy + dy];
  const bot: [number, number] = [cx, cy + r];
  const lb: [number, number] = [cx - dx, cy + dy];
  const lt: [number, number] = [cx - dx, cy - dy];
  const mid: [number, number] = [cx, cy];

  const pt = (p: [number, number]) => `${p[0]},${p[1]}`;

  return {
    topFace: `${pt(top)} ${pt(rt)} ${pt(mid)} ${pt(lt)}`,
    leftFace: `${pt(lt)} ${pt(mid)} ${pt(bot)} ${pt(lb)}`,
    rightFace: `${pt(mid)} ${pt(rt)} ${pt(rb)} ${pt(bot)}`,
    outerStroke: `M${pt(top)} L${pt(rt)} L${pt(rb)} L${pt(bot)} L${pt(lb)} L${pt(lt)} Z`,
    innerY: `M${pt(lt)} L${pt(mid)} L${pt(rt)} M${pt(mid)} L${pt(bot)}`,
    backHidden: `M${pt(top)} L${pt(mid)} M${pt(lb)} L${pt(mid)} L${pt(rb)}`,
    topVertex: top,
    bottomVertex: bot,
  };
}

function buildStarburstPath(cx: number, cy: number, radius: number): string {
  const inner = +(radius * 0.22).toFixed(2);
  return [
    `M${cx},${cy - radius}`,
    `Q${cx + inner},${cy - inner} ${cx + radius},${cy}`,
    `Q${cx + inner},${cy + inner} ${cx},${cy + radius}`,
    `Q${cx - inner},${cy + inner} ${cx - radius},${cy}`,
    `Q${cx - inner},${cy - inner} ${cx},${cy - radius} Z`,
  ].join(" ");
}

const PARENT_CUBE = buildIsoCube(130, 42, 22);
const CHILD_CENTERS: [number, number][] = [
  [54, 112],
  [130, 124],
  [206, 112],
];
const CHILD_CUBES = CHILD_CENTERS.map(([x, y]) => buildIsoCube(x, y, 14));

export default function KitAssemblyWireframe({
  childrenItems,
  status,
  hasBottleneck,
}: KitAssemblyWireframeProps) {
  const uid = useId().replace(/:/g, "");
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  // Map up to 3 child cubes to actual child items; ensure bottleneck always lights a node
  const slotStates = CHILD_CUBES.map((_, idx) => {
    const child = childrenItems[idx];
    const isOverflowBottleneck =
      idx === 2 &&
      hasBottleneck &&
      !childrenItems.slice(0, 3).some((c) => c.is_bottleneck);

    const isBottleneck = Boolean(child?.is_bottleneck || isOverflowBottleneck);
    const isShared = Boolean(child?.is_shared_child);
    const isActive = idx < Math.max(childrenItems.length, 1);

    return { isBottleneck, isShared, isActive };
  });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: +(-ny * 10).toFixed(2),
      ry: +(nx * 12).toFixed(2),
    });
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0 });
  }

  const spectralGradId = `steep-spectral-${uid}`;
  const grainFilterId = `steep-grain-${uid}`;
  const auraGradId = `steep-aura-${uid}`;
  const bottleneckGradId = `steep-bn-${uid}`;
  const bottleneckGlowId = `steep-bnglow-${uid}`;

  const defaultVectorStroke =
    status === "balanced"
      ? "rgba(94, 234, 212, 0.42)"
      : "rgba(255, 255, 255, 0.28)";

  return (
    <div
      aria-hidden="true"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative hidden sm:flex h-[132px] w-[228px] shrink-0 items-center justify-center select-none"
      style={{ perspective: "900px" }}
    >
      <div
        className="h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <svg
          viewBox="0 0 260 156"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full overflow-visible"
        >
          <defs>
            {/* Violet-to-gold spectral gradient for the illuminated parent plane */}
            <linearGradient
              id={spectralGradId}
              x1="111"
              y1="22"
              x2="149"
              y2="46"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.92" />
              <stop offset="58%" stopColor="#c084fc" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
            </linearGradient>

            {/* Fine monochrome film-grain filter for illuminated spectral plane */}
            <filter
              id={grainFilterId}
              x="-15%"
              y="-15%"
              width="130%"
              height="130%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="1.45"
                numOctaves="2"
                stitchTiles="stitch"
                result="noise"
              />
              <feColorMatrix
                type="saturate"
                values="0"
                in="noise"
                result="monoNoise"
              />
              <feComponentTransfer in="monoNoise" result="softNoise">
                <feFuncA type="linear" slope="0.22" />
              </feComponentTransfer>
              <feBlend
                in="SourceGraphic"
                in2="softNoise"
                mode="overlay"
              />
            </filter>

            {/* Subtle atmospheric halo behind parent assembly */}
            <radialGradient id={auraGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#2dd4bf" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0" />
            </radialGradient>

            {/* Rose-to-amber bottleneck illumination for limiting child cube */}
            <linearGradient
              id={bottleneckGradId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.82" />
            </linearGradient>

            <radialGradient id={bottleneckGlowId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.48" />
              <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Soft ambient starlight behind parent cube */}
          <ellipse cx="130" cy="44" rx="56" ry="34" fill={`url(#${auraGradId})`} />

          {/* Isometric linking vectors from parent cube to child cubes */}
          {CHILD_CUBES.map((cube, idx) => {
            const slot = slotStates[idx];
            const startX = idx === 0 ? 115 : idx === 2 ? 145 : 130;
            const startY = idx === 1 ? 64 : 58;
            const midY = idx === 1 ? 86 : 78;
            const [endX, endY] = cube.topVertex;
            const pathD =
              idx === 1
                ? `M${startX},${startY} L${endX},${endY}`
                : `M${startX},${startY} L${startX},${midY} L${endX},${midY} L${endX},${endY}`;

            const stroke = slot.isBottleneck
              ? "rgba(251, 113, 133, 0.78)"
              : slot.isActive
                ? defaultVectorStroke
                : "rgba(255, 255, 255, 0.12)";

            return (
              <g key={`vec-${idx}`}>
                <path
                  d={pathD}
                  stroke={stroke}
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {slot.isActive && (
                  <path
                    d={pathD}
                    stroke={
                      slot.isBottleneck
                        ? "rgba(252, 211, 77, 0.9)"
                        : "rgba(255, 255, 255, 0.55)"
                    }
                    strokeWidth="1"
                    strokeDasharray="3 11"
                    strokeLinecap="round"
                    className="steep-flow-dash"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="28"
                      to="0"
                      dur={slot.isBottleneck ? "1.8s" : "3.2s"}
                      repeatCount="indefinite"
                    />
                  </path>
                )}
              </g>
            );
          })}

          {/* Child Component Cubes */}
          {CHILD_CUBES.map((cube, idx) => {
            const slot = slotStates[idx];
            const [cx, cy] = CHILD_CENTERS[idx];

            return (
              <g
                key={`child-${idx}`}
                opacity={slot.isActive ? 1 : 0.32}
              >
                {/* Pulsing rose/amber halo when this child is the active bottleneck */}
                {slot.isBottleneck && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="26"
                    fill={`url(#${bottleneckGlowId})`}
                    className="motion-safe:animate-pulse"
                  />
                )}

                {/* Dark faceted side fills for subtle 3D volume */}
                <polygon
                  points={cube.leftFace}
                  fill="rgba(255,255,255,0.02)"
                />
                <polygon
                  points={cube.rightFace}
                  fill="rgba(255,255,255,0.045)"
                />

                {/* Top face: illuminated rose/amber if bottleneck, subtle violet tint if shared */}
                {slot.isBottleneck ? (
                  <polygon
                    points={cube.topFace}
                    fill={`url(#${bottleneckGradId})`}
                    className="motion-safe:animate-pulse"
                  />
                ) : slot.isShared ? (
                  <polygon
                    points={cube.topFace}
                    fill="rgba(167, 139, 250, 0.16)"
                  />
                ) : (
                  <polygon
                    points={cube.topFace}
                    fill="rgba(255,255,255,0.06)"
                  />
                )}

                {/* Crisp 1px isometric edges */}
                <path
                  d={cube.outerStroke}
                  stroke={
                    slot.isBottleneck
                      ? "rgba(251, 113, 133, 0.92)"
                      : slot.isShared
                        ? "rgba(167, 139, 250, 0.65)"
                        : "rgba(255, 255, 255, 0.42)"
                  }
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path
                  d={cube.innerY}
                  stroke={
                    slot.isBottleneck
                      ? "rgba(252, 211, 77, 0.72)"
                      : "rgba(255, 255, 255, 0.28)"
                  }
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Parent Assembly Cube (Hero Wireframe with ONE Illuminated Spectral Plane) */}
          <g>
            <polygon
              points={PARENT_CUBE.leftFace}
              fill="rgba(255, 255, 255, 0.025)"
            />
            <polygon
              points={PARENT_CUBE.rightFace}
              fill="rgba(255, 255, 255, 0.05)"
            />
            {/* Hidden back architectural construction lines */}
            <path
              d={PARENT_CUBE.backHidden}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="0.75"
              strokeDasharray="2 3"
            />
            {/* THE ONE selectively illuminated plane (violet → gold + monochrome grain) */}
            <polygon
              points={PARENT_CUBE.topFace}
              fill={`url(#${spectralGradId})`}
              filter={`url(#${grainFilterId})`}
            />
            {/* Fine 1px white isometric wireframe edges */}
            <path
              d={PARENT_CUBE.outerStroke}
              stroke="rgba(255, 255, 255, 0.56)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d={PARENT_CUBE.innerY}
              stroke="rgba(255, 255, 255, 0.42)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>

          {/* Two tiny twinkling 4-ray starbursts */}
          <path
            d={buildStarburstPath(176, 26, 7)}
            fill="#ffffff"
            fillOpacity="0.9"
            className="steep-twinkle"
          >
            <animate
              attributeName="opacity"
              values="0.35;0.95;0.35"
              dur="3.4s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d={buildStarburstPath(80, 56, 5)}
            fill="#fde68a"
            fillOpacity="0.85"
            className="steep-twinkle"
            style={{ animationDelay: "1.4s" }}
          >
            <animate
              attributeName="opacity"
              values="0.85;0.25;0.85"
              dur="4.1s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
    </div>
  );
}
