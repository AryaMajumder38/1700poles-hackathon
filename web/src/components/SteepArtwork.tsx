"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * Minimal geometric Lumino emblem — crisp isometric pole-and-frame mark.
 */
export function LuminoEmblem({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 2.75L20.25 7.5V16.5L12 21.25L3.75 16.5V7.5L12 2.75Z"
        stroke="rgba(255,255,255,0.72)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 2.75V21.25M12 11.75L20.25 7.5M12 11.75L3.75 7.5"
        stroke="rgba(255,255,255,0.34)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.1L13.15 10.6L17.2 11.75L13.15 12.9L12 17.4L10.85 12.9L6.8 11.75L10.85 10.6L12 6.1Z"
        fill="#ffffff"
      />
    </svg>
  );
}

/**
 * Crisp 4-ray starlight burst icon for Copilot launcher and editorial accents.
 */
export function StarburstIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M10 1.25C10.35 6.45 13.55 9.65 18.75 10C13.55 10.35 10.35 13.55 10 18.75C9.65 13.55 6.45 10.35 1.25 10C6.45 9.65 9.65 6.45 10 1.25Z" />
    </svg>
  );
}

/**
 * Opening-stage atmospheric twilight backdrop:
 * #15101e -> #121212 gradient with blurred teal & violet atmospheric lights
 * and an ultra-subtle SVG feTurbulence monochrome grain overlay.
 */
export function AtmosphericBackdrop() {
  const uid = useId().replace(/:/g, "");
  const grainId = `steep-backdrop-grain-${uid}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Vertical starlight wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #15101e 0%, #14111b 42%, #121212 100%)",
        }}
      />

      {/* Lower-center violet atmospheric bloom */}
      <div
        className="steep-aura absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(139,92,246,0.20) 0%, rgba(139,92,246,0.06) 48%, rgba(18,18,18,0) 76%)",
        }}
      />

      {/* Bottom-left teal atmospheric bloom */}
      <div
        className="steep-aura absolute -bottom-28 -left-24 h-[360px] w-[540px] rounded-full blur-[110px]"
        style={{
          animationDelay: "-5.5s",
          background:
            "radial-gradient(ellipse at center, rgba(45,212,191,0.13) 0%, rgba(45,212,191,0.04) 50%, rgba(18,18,18,0) 76%)",
        }}
      />

      {/* Subtle warm top-right horizon refraction */}
      <div
        className="steep-aura absolute -right-24 -top-20 h-[280px] w-[420px] rounded-full blur-[100px]"
        style={{
          animationDelay: "-9s",
          background:
            "radial-gradient(ellipse at center, rgba(251,191,36,0.07) 0%, rgba(139,92,246,0.05) 45%, rgba(18,18,18,0) 75%)",
        }}
      />

      {/* Ultra-subtle monochrome turbulence grain */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.035]">
        <filter id={grainId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainId})`} />
      </svg>

      {/* Bottom fade cleanly into #121212 canvas */}
      <div
        className="absolute inset-x-0 bottom-0 h-24"
        style={{
          background:
            "linear-gradient(180deg, rgba(18,18,18,0) 0%, #121212 100%)",
        }}
      />
    </div>
  );
}

/**
 * Interactive 3D-tilting isometric wireframe construction representing
 * Lumino's 6 Kanpur godown tiers & stacked PCC pole infrastructure.
 * Features one illuminated violet->gold spectral plane with grain & glow,
 * a tapering teal->violet diagonal transfer beam, animated dashed flow pulses,
 * and 3 twinkling 4-ray starbursts.
 */
export function SpectralYardPrism3D({
  className = "",
}: {
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (reducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    const clampedX = Math.max(-1, Math.min(1, nx));
    const clampedY = Math.max(-1, Math.min(1, ny));
    setTilt({
      rx: Number((-clampedY * 6.5).toFixed(2)),
      ry: Number((clampedX * 6.8).toFixed(2)),
    });
  }

  function handlePointerLeave() {
    setHovered(false);
    setTilt({ rx: 0, ry: 0 });
  }

  const planeGradId = `yard-plane-grad-${uid}`;
  const beamGradId = `yard-beam-grad-${uid}`;
  const glowFilterId = `yard-plane-glow-${uid}`;
  const grainFilterId = `yard-plane-grain-${uid}`;
  const planeClipId = `yard-plane-clip-${uid}`;

  // 6 Kanpur godown tiers arranged in 2 stepped isometric rows (3 foreground + 3 rear)
  const yardBays = [
    { id: "auraiya", cx: 112, cy: 186, h: 24 },
    { id: "dehat", cx: 170, cy: 214, h: 32 },
    { id: "etawah", cx: 228, cy: 242, h: 28 },
    { id: "farrukhabad", cx: 196, cy: 146, h: 22 },
    { id: "kannauj", cx: 256, cy: 174, h: 36 },
    { id: "nagar", cx: 316, cy: 202, h: 26 },
  ];

  return (
    <div
      ref={containerRef}
      onPointerEnter={() => setHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`group relative select-none ${className}`}
      aria-label="Interactive isometric wireframe of Lumino's 6 Kanpur godown bays and PCC pole transfer corridors"
      role="img"
    >
      <div
        className="relative mx-auto w-full max-w-[460px] will-change-transform"
        style={{
          transform: reducedMotion
            ? undefined
            : `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: hovered
            ? "transform 120ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Subtle hover aura rim behind the prism */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-6 rounded-full blur-3xl transition-opacity duration-500 ${
            hovered ? "opacity-90" : "opacity-55"
          }`}
          style={{
            background:
              "radial-gradient(circle at 56% 44%, rgba(139,92,246,0.22) 0%, rgba(251,191,36,0.10) 36%, rgba(45,212,191,0.08) 62%, transparent 80%)",
          }}
        />

        <svg
          viewBox="0 0 460 300"
          fill="none"
          className="relative z-10 h-auto w-full overflow-visible"
        >
          <defs>
            {/* Violet -> Warm Gold Spectral Plane Gradient */}
            <linearGradient
              id={planeGradId}
              x1="214"
              y1="42"
              x2="318"
              y2="216"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.92" />
              <stop offset="46%" stopColor="#a78bfa" stopOpacity="0.72" />
              <stop offset="78%" stopColor="#f59e0b" stopOpacity="0.68" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.88" />
            </linearGradient>

            {/* Tapering Teal -> Violet Transfer Beam */}
            <linearGradient
              id={beamGradId}
              x1="96"
              y1="176"
              x2="372"
              y2="112"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.68" />
              <stop offset="52%" stopColor="#5eead4" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.72" />
            </linearGradient>

            {/* Soft outer bloom for the spectral plane */}
            <filter
              id={glowFilterId}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="14" />
            </filter>

            {/* Fine architectural grain inside the spectral plane */}
            <filter id={grainFilterId} x="0%" y="0%" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="2"
                stitchTiles="stitch"
                result="noise"
              />
              <feColorMatrix
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.16 0"
                in="noise"
                result="softNoise"
              />
              <feComposite
                in="softNoise"
                in2="SourceGraphic"
                operator="in"
                result="clippedNoise"
              />
              <feBlend in="SourceGraphic" in2="clippedNoise" mode="screen" />
            </filter>

            <clipPath id={planeClipId}>
              <polygon points="236,36 306,70 306,204 236,170" />
            </clipPath>
          </defs>

          {/* Isometric Construction Ground Grid */}
          <g stroke="rgba(255,255,255,0.09)" strokeWidth="0.85">
            <line x1="56" y1="196" x2="246" y2="104" />
            <line x1="94" y1="216" x2="284" y2="124" />
            <line x1="132" y1="236" x2="322" y2="144" />
            <line x1="170" y1="256" x2="360" y2="164" />
            <line x1="208" y1="276" x2="398" y2="184" />

            <line x1="208" y1="106" x2="396" y2="198" />
            <line x1="168" y1="126" x2="356" y2="218" />
            <line x1="128" y1="146" x2="316" y2="238" />
            <line x1="88" y1="166" x2="276" y2="258" />
          </g>

          {/* Subtle blurred glow duplicate behind the illuminated spectral plane */}
          <polygon
            points="236,36 306,70 306,204 236,170"
            fill={`url(#${planeGradId})`}
            opacity={hovered ? "0.52" : "0.36"}
            filter={`url(#${glowFilterId})`}
            className="transition-opacity duration-300"
          />

          {/* Tapered Teal-to-Violet Spectral Transfer Beam cutting diagonally across the rig */}
          <polygon
            points="106,184 342,102 356,120 116,192"
            fill={`url(#${beamGradId})`}
            opacity={hovered ? "0.62" : "0.46"}
            className="transition-opacity duration-300"
          />
          <line
            x1="108"
            y1="187"
            x2="348"
            y2="110"
            stroke="#5eead4"
            strokeOpacity="0.45"
            strokeWidth="0.9"
          />

          {/* 6 Kanpur Godown Isometric Bay Tiers */}
          {yardBays.map((bay) => {
            const w = 26;
            const d = 13;
            const topY = bay.cy - bay.h;
            return (
              <g key={bay.id}>
                {/* Subtle dark interior fill so bays have depth without paint */}
                <polygon
                  points={`${bay.cx},${topY} ${bay.cx + w},${topY + d} ${bay.cx},${topY + d * 2} ${bay.cx - w},${topY + d}`}
                  fill="rgba(255,255,255,0.025)"
                  stroke="rgba(255,255,255,0.42)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                {/* Left isometric face */}
                <polygon
                  points={`${bay.cx - w},${topY + d} ${bay.cx},${topY + d * 2} ${bay.cx},${bay.cy + d * 2} ${bay.cx - w},${bay.cy + d}`}
                  fill="rgba(18,18,18,0.68)"
                  stroke="rgba(255,255,255,0.34)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                {/* Right isometric face */}
                <polygon
                  points={`${bay.cx},${topY + d * 2} ${bay.cx + w},${topY + d} ${bay.cx + w},${bay.cy + d} ${bay.cx},${bay.cy + d * 2}`}
                  fill="rgba(255,255,255,0.015)"
                  stroke="rgba(255,255,255,0.42)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                {/* Stacked PCC pole horizontal rack lines on top face */}
                <line
                  x1={bay.cx - 12}
                  y1={topY + 9}
                  x2={bay.cx + 12}
                  y2={topY + 21}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="0.85"
                />
                <line
                  x1={bay.cx - 6}
                  y1={topY + 6}
                  x2={bay.cx + 16}
                  y2={topY + 17}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="0.85"
                />
              </g>
            );
          })}

          {/* Tall Isometric Gantry & Stacked Pole Wireframe Prism */}
          <g className="steep-float">
            {/* Back structural wireframe prism */}
            <polygon
              points="168,70 236,36 306,70 238,104"
              fill="rgba(255,255,255,0.02)"
              stroke="rgba(255,255,255,0.44)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <line
              x1="168"
              y1="70"
              x2="168"
              y2="204"
              stroke="rgba(255,255,255,0.36)"
              strokeWidth="1"
            />
            <line
              x1="238"
              y1="104"
              x2="238"
              y2="238"
              stroke="rgba(255,255,255,0.46)"
              strokeWidth="1"
            />
            <line
              x1="168"
              y1="204"
              x2="238"
              y2="238"
              stroke="rgba(255,255,255,0.34)"
              strokeWidth="1"
            />
            <line
              x1="238"
              y1="238"
              x2="306"
              y2="204"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="1"
            />

            {/* Internal stacked PCC pole tier lines inside left prism face */}
            {[104, 130, 156, 182].map((y) => (
              <line
                key={y}
                x1="168"
                y1={y}
                x2="238"
                y2={y + 34}
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="0.9"
              />
            ))}

            {/* ONE Tall Illuminated Spectral Plane (Violet -> Warm Gold + Grain) */}
            <g clipPath={`url(#${planeClipId})`}>
              <polygon
                points="236,36 306,70 306,204 236,170"
                fill={`url(#${planeGradId})`}
                filter={`url(#${grainFilterId})`}
                opacity={hovered ? "0.94" : "0.84"}
                className="transition-opacity duration-300"
              />
              {/* Subtle internal architectural refraction lines */}
              <line
                x1="236"
                y1="82"
                x2="306"
                y2="116"
                stroke="rgba(255,255,255,0.26)"
                strokeWidth="0.75"
              />
              <line
                x1="236"
                y1="128"
                x2="306"
                y2="162"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="0.75"
              />
            </g>

            {/* Crisp white 1px wireframe edge around the spectral plane */}
            <polygon
              points="236,36 306,70 306,204 236,170"
              fill="none"
              stroke={
                hovered ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.56)"
              }
              strokeWidth="1.05"
              strokeLinejoin="round"
              className="transition-colors duration-300"
            />
          </g>

          {/* Animated Dashed Inter-Godown Flow Pulses */}
          <path
            d="M 112 162 L 196 124 L 256 138 L 316 176"
            stroke="#5eead4"
            strokeOpacity="0.62"
            strokeWidth="1.2"
            strokeDasharray="6 10"
            strokeLinecap="round"
            className="steep-flow-dash"
          />
          <path
            d="M 170 182 L 228 214 L 316 176"
            stroke="#a78bfa"
            strokeOpacity="0.65"
            strokeWidth="1.15"
            strokeDasharray="5 11"
            strokeLinecap="round"
            className="steep-flow-dash"
            style={{ animationDelay: "-2.1s" }}
          />

          {/* Tiny glowing yard nodes */}
          {[
            [112, 162, "#5eead4"],
            [196, 124, "#e7e7e7"],
            [256, 138, "#fcd34d"],
            [316, 176, "#a78bfa"],
          ].map(([x, y, fill]) => (
            <circle
              key={`${x}-${y}`}
              cx={x as number}
              cy={y as number}
              r="2.2"
              fill={fill as string}
            />
          ))}

          {/* 3 Tiny 4-Ray Twinkling Starbursts (17px, 12px, 9px) */}
          <g className="steep-twinkle" style={{ animationDelay: "0s" }}>
            <path
              d="M324 52 C324.4 58.2 327.8 61.6 334 62 C327.8 62.4 324.4 65.8 324 72 C323.6 65.8 320.2 62.4 314 62 C320.2 61.6 323.6 58.2 324 52 Z"
              fill="#ffffff"
            />
          </g>
          <g className="steep-twinkle" style={{ animationDelay: "-1.4s" }}>
            <path
              d="M148 82 C148.3 86.2 150.8 88.7 155 89 C150.8 89.3 148.3 91.8 148 96 C147.7 91.8 145.2 89.3 141 89 C145.2 88.7 147.7 86.2 148 82 Z"
              fill="#e7e7e7"
            />
          </g>
          <g className="steep-twinkle" style={{ animationDelay: "-2.7s" }}>
            <path
              d="M358 172 C358.2 174.9 360.1 176.8 363 177 C360.1 177.2 358.2 179.1 358 182 C357.8 179.1 355.9 177.2 353 177 C355.9 176.8 357.8 174.9 358 172 Z"
              fill="#5eead4"
            />
          </g>

          {/* Subtle blueprint labels */}
          <g
            fontFamily="var(--font-mono)"
            fontSize="9"
            fill="rgba(255,255,255,0.34)"
            letterSpacing="0.06em"
          >
            <text x="64" y="256">
              6 ACTIVE GODOWNS
            </text>
            <text x="316" y="88">
              MPO010014
            </text>
          </g>
        </svg>

        {/* Subtle interactive caption on hover */}
        <div
          className={`pointer-events-none mt-1 flex items-center justify-center gap-2 text-[11px] transition-opacity duration-300 ${
            hovered ? "opacity-90 text-[#a0a0a0]" : "opacity-55 text-[#898989]"
          }`}
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-teal-300/80"
          />
          <span className="font-mono tracking-tight">
            Kanpur RDSS · 6 bays · zero-lookahead replay
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Steep's signature closing threshold doorway illustration (~360px wide):
 * Crisp 1px off-white perspective doorway + slightly open angled door leaf
 * with a small rounded handle on a single imperfect horizontal ground line,
 * revealing a glowing starlit wedge with distant 2-4px pale stars and a
 * twinkling 4-point starburst.
 */
export function ThresholdDoorArtwork({
  className = "",
}: {
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const wedgeGradId = `threshold-wedge-${uid}`;
  const spillGradId = `threshold-spill-${uid}`;
  const glowFilterId = `threshold-glow-${uid}`;

  return (
    <div
      className={`mx-auto w-full max-w-[360px] select-none ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 360 250" fill="none" className="h-auto w-full">
        <defs>
          <linearGradient
            id={wedgeGradId}
            x1="158"
            y1="32"
            x2="220"
            y2="206"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#261c42" stopOpacity="0.95" />
            <stop offset="52%" stopColor="#1b2d38" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#141414" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient
            id={spillGradId}
            x1="194"
            y1="204"
            x2="178"
            y2="246"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#5eead4" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#121212" stopOpacity="0" />
          </linearGradient>

          <filter
            id={glowFilterId}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        {/* Faint ambient glow behind the starlit opening */}
        <polygon
          points="154,36 220,36 220,204 154,204"
          fill="#8b5cf6"
          opacity="0.16"
          filter={`url(#${glowFilterId})`}
        />

        {/* Subtle light spill onto the ground */}
        <polygon
          points="166,204 220,204 248,238 134,238"
          fill={`url(#${spillGradId})`}
        />

        {/* Narrow glowing starlit wedge visible through the open door */}
        <polygon
          points="166,38 220,38 220,204 166,204"
          fill={`url(#${wedgeGradId})`}
        />

        {/* Distant pale 2-4px stars inside the starlit wedge */}
        <circle cx="196" cy="74" r="1.2" fill="#e7e7e7" opacity="0.72" />
        <circle cx="209" cy="108" r="1.6" fill="#5eead4" opacity="0.62" />
        <circle cx="188" cy="144" r="1.1" fill="#ffffff" opacity="0.58" />
        <circle cx="205" cy="166" r="1.4" fill="#fcd34d" opacity="0.52" />
        <circle cx="182" cy="96" r="0.9" fill="#e7e7e7" opacity="0.48" />

        {/* One gently twinkling 4-point starburst inside the doorway */}
        <g className="steep-twinkle">
          <path
            d="M196 112 C196.35 117.4 199.6 120.65 205 121 C199.6 121.35 196.35 124.6 196 130 C195.65 124.6 192.4 121.35 187 121 C192.4 120.65 195.65 117.4 196 112 Z"
            fill="#ffffff"
          />
        </g>

        {/* Outer perspective doorway jamb / frame (1px off-white) */}
        <path
          d="M136 204 V34 H224 V204"
          stroke="rgba(231,231,231,0.58)"
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        <path
          d="M142 204 V39 H219 V204"
          stroke="rgba(231,231,231,0.22)"
          strokeWidth="0.85"
        />

        {/* Slightly open angled door leaf swung toward the viewer on the left hinge */}
        <polygon
          points="142,39 170,48 170,213 142,204"
          fill="#151515"
          stroke="rgba(231,231,231,0.68)"
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        {/* Subtle inner panel line on door leaf */}
        <polygon
          points="147,50 165,56 165,196 147,190"
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="0.85"
          strokeLinejoin="round"
        />
        {/* Door edge thickness sliver */}
        <line
          x1="173"
          y1="49"
          x2="173"
          y2="212"
          stroke="rgba(231,231,231,0.28)"
          strokeWidth="0.85"
        />

        {/* Small rounded door handle */}
        <circle
          cx="162.5"
          cy="128"
          r="2.4"
          fill="#121212"
          stroke="rgba(231,231,231,0.78)"
          strokeWidth="1"
        />

        {/* Single imperfect horizontal ground line */}
        <path
          d="M28 205.5 Q94 203.8 142 204.2 M219 204.2 Q276 205.1 334 203.6"
          stroke="rgba(255,255,255,0.34)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M170 213.2 Q196 206.4 224 204.2"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.85"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

interface SteepFooterProps {
  activeTab: "ledger" | "planner" | "sets";
  onSelectTab: (tab: "ledger" | "planner" | "sets") => void;
  onOpenCopilot: () => void;
}

const KANPUR_GODOWNS = [
  "Kanpur Auraiya",
  "Kanpur Dehat",
  "Kanpur Etawah",
  "Kanpur Farrukhabad",
  "Kanpur Kannauj",
  "Kanpur Nagar",
] as const;

/**
 * Restrained 5-column Steep directory footer on #1a1a1a.
 */
export function SteepFooter({
  activeTab,
  onSelectTab,
  onOpenCopilot,
}: SteepFooterProps) {
  return (
    <footer className="border-t border-white/[0.06] bg-[#1a1a1a] text-[#a0a0a0]">
      <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Column 1: Minimal Emblem & Project Scope */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <LuminoEmblem className="h-5 w-5 shrink-0" />
              <span className="text-[15px] font-medium text-white">Lumino</span>
            </div>
            <p className="max-w-[220px] text-xs leading-relaxed text-[#898989]">
              Consumption-driven stock visibility, causal ordering replay, and
              kit set diagnostics for Kanpur RDSS.
            </p>
          </div>

          {/* Column 2: Workspace Navigation */}
          <div>
            <h3 className="text-xs font-medium text-[#e7e7e7]">Workspace</h3>
            <ul className="mt-3.5 space-y-2.5 text-[13px]">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTab("ledger")}
                  className={`transition-colors cursor-pointer ${
                    activeTab === "ledger"
                      ? "text-white"
                      : "text-[#898989] hover:text-[#e7e7e7]"
                  }`}
                >
                  See It — Stock Ledger
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTab("planner")}
                  className={`transition-colors cursor-pointer ${
                    activeTab === "planner"
                      ? "text-white"
                      : "text-[#898989] hover:text-[#e7e7e7]"
                  }`}
                >
                  Plan It — Causal Replay
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTab("sets")}
                  className={`transition-colors cursor-pointer ${
                    activeTab === "sets"
                      ? "text-white"
                      : "text-[#898989] hover:text-[#e7e7e7]"
                  }`}
                >
                  Match Sets — Kit Balance
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenCopilot}
                  className="text-[#898989] transition-colors hover:text-[#e7e7e7] cursor-pointer"
                >
                  Ops Copilot
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Kanpur 6 Godowns */}
          <div>
            <h3 className="text-xs font-medium text-[#e7e7e7]">
              Kanpur 6 Godowns
            </h3>
            <ul className="mt-3.5 space-y-2 text-[13px] text-[#898989]">
              {KANPUR_GODOWNS.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>

          {/* Column 4: Domain Guardrails */}
          <div>
            <h3 className="text-xs font-medium text-[#e7e7e7]">
              Domain Guardrails
            </h3>
            <ul className="mt-3.5 space-y-2 text-[13px] text-[#898989]">
              <li>Kanpur Closer excluded</li>
              <li>Project-wide contractor stock</li>
              <li>Strict per-UOM totals</li>
              <li>Wind-down after 2026-07</li>
            </ul>
          </div>

          {/* Column 5: System Architecture */}
          <div>
            <h3 className="text-xs font-medium text-[#e7e7e7]">
              System Architecture
            </h3>
            <ul className="mt-3.5 space-y-2 text-[13px] text-[#898989]">
              <li>Pre-aggregated JSON ledger</li>
              <li>Zero-lookahead simulation</li>
              <li>BOM &amp; empirical kit ratios</li>
              <li>Dataset-grounded Copilot</li>
            </ul>
          </div>
        </div>

        {/* Bottom metadata row */}
        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-[#898989] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Lumino Industries · 1,700 Poles Hackathon — Team Bold Bytes
          </span>
          <span className="font-mono text-[11px] tabular-nums text-[#898989]">
            2023-03 → 2026-10 · 44 months · 6 godowns · 16 SKUs
          </span>
        </div>
      </div>
    </footer>
  );
}
