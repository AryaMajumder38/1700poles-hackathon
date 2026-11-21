"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
  const [metadata, setMetadata] = useState<MetadataPayload | null>(null);
  const [allRows, setAllRows] = useState<SetImbalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ratioMode, setRatioMode] = useState<SetRatioMode>("empirical");
  const [selectedSetNo, setSelectedSetNo] = useState<string>("1.071");
  const [selectedGodown, setSelectedGodown] =
    useState<ActiveGodown>("KANPUR NAGAR");
  const [selectedMonth, setSelectedMonth] = useState<string>("2024-06");

  useEffect(() => {
    let cancelled = false;

    async function loadSetsData() {
      try {
        const [metaRes, setsRes] = await Promise.all([
          fetch("/data/metadata.json"),
          fetch("/data/sets_imbalance.json"),
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

        if (!cancelled) {
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
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unknown error loading set imbalance data."
          );
          setLoading(false);
        }
      }
    }

    loadSetsData();
    return () => {
      cancelled = true;
    };
  }, []);

  const rowsForMode = useMemo(
    () => allRows.filter((r) => r.ratio_mode === ratioMode),
    [allRows, ratioMode]
  );

  const selectedRow = useMemo(() => {
    return (
      rowsForMode.find(
        (r) =>
          r.set_no === selectedSetNo &&
          r.godown === selectedGodown &&
          r.month === selectedMonth
      ) ?? null
    );
  }, [rowsForMode, selectedSetNo, selectedGodown, selectedMonth]);

  function handleSelectSet(nextSetNo: string) {
    setSelectedSetNo(nextSetNo);
    const cell = pickDefaultCell(rowsForMode, nextSetNo);
    if (cell) {
      setSelectedGodown(cell.godown);
      setSelectedMonth(cell.month);
    }
  }

  function handleSelectCell(godown: ActiveGodown, month: string) {
    setSelectedGodown(godown);
    setSelectedMonth(month);
  }

  function handleJumpFromSharedAlert(
    setNo: string,
    godown: ActiveGodown,
    month: string
  ) {
    setSelectedSetNo(setNo);
    setSelectedGodown(godown);
    setSelectedMonth(month);
  }

  if (loading) {
    return (
      <section className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-600 shadow-xs">
        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
        Loading 1,584 parent-child kit balance evaluations...
      </section>
    );
  }

  if (error || !metadata) {
    return (
      <section className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div>
          <p className="font-semibold">Unable to load Match Sets diagnostics</p>
          <p className="mt-1 text-xs text-rose-800">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Ratio Mode Toggle Banner + BOM vs Empirical Data Discovery */}
      <RatioModeBanner
        ratioMode={ratioMode}
        onChangeMode={setRatioMode}
        sets={metadata.sets}
        allRows={allRows}
      />

      {/* 2. Set × Godown × Month Imbalance Heatmap */}
      <ImbalanceHeatmap
        sets={metadata.sets}
        godowns={metadata.godowns}
        months={metadata.date_range.months}
        rowsForMode={rowsForMode}
        selectedSetNo={selectedSetNo}
        onSelectSet={handleSelectSet}
        selectedGodown={selectedGodown}
        selectedMonth={selectedMonth}
        onSelectCell={handleSelectCell}
      />

      {/* 3. Cell Drill-Down / Bottleneck Inspector */}
      <CellBottleneckInspector row={selectedRow} />

      {/* 4. Shared Child (MNB010174 — G.I. Nuts & Bolts) Alert Panel */}
      <SharedChildAlertPanel
        rowsForMode={rowsForMode}
        ratioMode={ratioMode}
        onJumpToCell={handleJumpFromSharedAlert}
      />
    </div>
  );
}
