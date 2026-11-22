"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useRbacSession } from "@/features/planner/rbacBridge";
import type {
  ActiveGodown,
  MetadataPayload,
  SetImbalanceRow,
  SetRatioMode,
} from "@/types/lumino";
import CellBottleneckInspector from "./CellBottleneckInspector";
import ImbalanceHeatmap from "./ImbalanceHeatmap";
import RatioModeBanner from "./RatioModeBanner";
import SharedChildAlertPanel from "./SharedChildAlertPanel";
import { isActiveGodown } from "./setsUtils";

function pickDefaultCell(
  rows: SetImbalanceRow[],
  setNo: string
): { godown: ActiveGodown; month: string } | null {
  const matching = rows.filter((r) => r.set_no === setNo);
  if (matching.length === 0) return null;

  // Prefer the cell with the highest stranded_parent_qty so judges immediately see an impactful bottleneck
  let best = matching[0];
  for (const row of matching) {
    if (row.stranded_parent_qty > best.stranded_parent_qty) {
      best = row;
    }
  }
  return { godown: best.godown, month: best.month };
}

export default function SetsView() {
  const { session } = useRbacSession();
  const inspectorRef = useRef<HTMLDivElement | null>(null);
  const [metadata, setMetadata] = useState<MetadataPayload | null>(null);
  const [allRows, setAllRows] = useState<SetImbalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ratioMode, setRatioMode] = useState<SetRatioMode>("empirical");
  const [selectedSetNo, setSelectedSetNo] = useState<string>("1.071");
  const [selectedGodown, setSelectedGodown] =
    useState<ActiveGodown>("KANPUR NAGAR");
  const [selectedMonth, setSelectedMonth] = useState<string>("2024-06");
  const [reloadNonce, setReloadNonce] = useState(0);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadNonce((n) => n + 1);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadSetsData() {
      try {
        const [metaRes, setsRes] = await Promise.all([
          fetch("/data/metadata.json", { signal: controller.signal }),
          fetch("/data/sets_imbalance.json", { signal: controller.signal }),
        ]);

        if (!metaRes.ok || !setsRes.ok) {
          throw new Error(
            "Failed to load Job 3 kit imbalance data from /data/sets_imbalance.json."
          );
        }

        const [metaJson, setsJson] = (await Promise.all([
          metaRes.json(),
          setsRes.json(),
        ])) as [MetadataPayload, SetImbalanceRow[]];

        if (controller.signal.aborted) return;

        setMetadata(metaJson);
        setAllRows(setsJson);
        const defaultSet = metaJson.sets[0]?.set_no ?? "1.071";
        setSelectedSetNo(defaultSet);

        const empiricalRows = setsJson.filter(
          (r) => r.ratio_mode === "empirical"
        );
        const initialCell = pickDefaultCell(empiricalRows, defaultSet);
        if (initialCell) {
          setSelectedGodown(initialCell.godown);
          setSelectedMonth(initialCell.month);
        }
        setError(null);
        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unknown error loading set imbalance data."
        );
        setLoading(false);
      }
    }

    loadSetsData();
    return () => {
      controller.abort();
    };
  }, [reloadNonce]);

  const lockedGodown: ActiveGodown | null = useMemo(() => {
    if (session.roleType !== "SITE_MANAGER") {
      return null;
    }
    const warehouseName = session.warehouseName;
    if (!isActiveGodown(warehouseName)) {
      return null;
    }
    const validGodowns = metadata?.godowns ?? [];
    if (validGodowns.length > 0 && !validGodowns.includes(warehouseName)) {
      return null;
    }
    return warehouseName;
  }, [session.roleType, session.warehouseName, metadata]);

  const visibleGodowns: ActiveGodown[] = useMemo(() => {
    if (!metadata) return [];
    return lockedGodown ? [lockedGodown] : metadata.godowns;
  }, [metadata, lockedGodown]);

  const rowsForMode = useMemo(() => {
    return allRows.filter((r) => {
      if (r.ratio_mode !== ratioMode) return false;
      if (lockedGodown && r.godown !== lockedGodown) return false;
      return true;
    });
  }, [allRows, ratioMode, lockedGodown]);

  const effectiveGodown: ActiveGodown = lockedGodown ?? selectedGodown;

  const selectedRow = useMemo(() => {
    const exact = rowsForMode.find(
      (r) =>
        r.set_no === selectedSetNo &&
        r.godown === effectiveGodown &&
        r.month === selectedMonth
    );
    if (exact) return exact;
    const fallbackCell = pickDefaultCell(rowsForMode, selectedSetNo);
    if (fallbackCell) {
      return (
        rowsForMode.find(
          (r) =>
            r.set_no === selectedSetNo &&
            r.godown === fallbackCell.godown &&
            r.month === fallbackCell.month
        ) ?? null
      );
    }
    return null;
  }, [rowsForMode, selectedSetNo, effectiveGodown, selectedMonth]);

  const activeGodown: ActiveGodown = selectedRow?.godown ?? effectiveGodown;
  const activeMonth: string = selectedRow?.month ?? selectedMonth;

  function handleSelectSet(nextSetNo: string) {
    setSelectedSetNo(nextSetNo);
    const cell = pickDefaultCell(rowsForMode, nextSetNo);
    if (cell) {
      setSelectedGodown(cell.godown);
      setSelectedMonth(cell.month);
    }
  }

  function scrollToInspector() {
    requestAnimationFrame(() => {
      inspectorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleSelectCell(
    godown: ActiveGodown,
    month: string,
    shouldScroll = false
  ) {
    setSelectedGodown(lockedGodown ?? godown);
    setSelectedMonth(month);
    if (shouldScroll) {
      scrollToInspector();
    }
  }

  function handleJumpFromSharedAlert(
    setNo: string,
    godown: ActiveGodown,
    month: string
  ) {
    setSelectedSetNo(setNo);
    setSelectedGodown(lockedGodown ?? godown);
    setSelectedMonth(month);
    scrollToInspector();
  }

  if (loading) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading kit balance data"
        className="space-y-6 min-w-0"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-44 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-4 w-72 max-w-full rounded-full bg-white/[0.04] animate-pulse" />
          </div>
          <div className="h-9 w-52 rounded-full bg-white/[0.05] border border-white/[0.06] animate-pulse" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="rounded-[20px] border border-white/[0.06] bg-[#1a1a1a] p-5 space-y-3"
            >
              <div className="flex justify-between">
                <div className="h-3 w-16 rounded-full bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-24 rounded-full bg-white/[0.05] animate-pulse" />
              </div>
              <div className="h-5 w-36 rounded-full bg-white/[0.07] animate-pulse" />
              <div className="h-3 w-44 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>

        <div className="rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-6">
          <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-[#898989]">
            <Loader2 className="h-4 w-4 animate-spin text-[#a0a0a0]" />
            Loading kit balance data...
          </div>
        </div>
      </section>
    );
  }

  if (error || !metadata) {
    return (
      <section
        role="alert"
        className="flex flex-col gap-4 rounded-[24px] border border-white/[0.08] bg-[#1a1a1a] p-5 sm:p-6 text-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.75)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-[#e7e7e7]">
              Unable to load kit balance data
            </p>
            <p className="mt-0.5 text-xs text-[#a0a0a0]">
              {error ?? "Metadata payload was unavailable."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-white px-4 text-sm font-medium text-black hover:opacity-90 active:opacity-80 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] cursor-pointer sm:self-center"
        >
          <RefreshCw className="h-3.5 w-3.5 text-black/75" />
          Retry
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* RBAC Site-Scoped Indicator */}
      {lockedGodown && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-xs text-[#a0a0a0]">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.75)]"
              aria-hidden="true"
            />
            <span className="font-medium text-[#e7e7e7]">
              Site scoped: {lockedGodown}
            </span>
            <span className="text-[#898989]">
              ({session.staffName} · {session.staffTitle})
            </span>
          </div>
          <span className="text-[#898989]">
            Switch to Head Admin in the top bar to view all 6 godowns.
          </span>
        </div>
      )}

      {/* 1. Header + Ratio Mode Toggle & Explanation */}
      <RatioModeBanner
        ratioMode={ratioMode}
        onChangeMode={setRatioMode}
        sets={metadata.sets}
        allRows={allRows}
      />

      {/* 2. Set Selector, KPI Summary & Imbalance Heatmap */}
      <ImbalanceHeatmap
        sets={metadata.sets}
        godowns={visibleGodowns}
        months={metadata.date_range.months}
        rowsForMode={rowsForMode}
        selectedSetNo={selectedSetNo}
        onSelectSet={handleSelectSet}
        selectedGodown={activeGodown}
        selectedMonth={activeMonth}
        onSelectCell={handleSelectCell}
      />

      {/* 3. Cell Drill-Down / Bottleneck Inspector */}
      <div ref={inspectorRef} className="scroll-mt-24">
        <CellBottleneckInspector row={selectedRow} />
      </div>

      {/* 4. Shared Child (MNB010174 — G.I. Nuts & Bolts) Alert Panel */}
      <SharedChildAlertPanel
        key={lockedGodown ?? "all-godowns"}
        rowsForMode={rowsForMode}
        ratioMode={ratioMode}
        lockedGodown={lockedGodown}
        onJumpToCell={handleJumpFromSharedAlert}
      />
    </div>
  );
}
