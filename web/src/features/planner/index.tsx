"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type {
  ActiveGodown,
  MetadataPayload,
  SimulationAction,
  SimulationDecision,
} from "@/types/lumino";
import ActionCardsGrid from "./ActionCardsGrid";
import IdleStockChart from "./IdleStockChart";
import MonthScrubber, { type DecisionFilter } from "./MonthScrubber";
import TheBarScorecard from "./TheBarScorecard";
import TransferLogisticsPanel from "./TransferLogisticsPanel";
import {
  collectTransfersFromActions,
  FLAGSHIP_ITEM_CODE,
  type PlannerBacktestComparison,
} from "./plannerTypes";

export default function PlannerView() {
  const [metadata, setMetadata] = useState<MetadataPayload | null>(null);
  const [actions, setActions] = useState<SimulationAction[]>([]);
  const [summaries, setSummaries] = useState<PlannerBacktestComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItemCode, setSelectedItemCode] =
    useState<string>(FLAGSHIP_ITEM_CODE);
  const [monthIndex, setMonthIndex] = useState<number>(8); // 2023-11: rich transfer + order activity
  const [selectedGodown, setSelectedGodown] = useState<"ALL" | ActiveGodown>(
    "ALL"
  );
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("ALL");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPlannerData() {
      try {
        const [metaRes, simRes, btRes] = await Promise.all([
          fetch("/data/metadata.json"),
          fetch("/data/simulation_default.json"),
          fetch("/data/backtest_summary.json"),
        ]);

        if (!metaRes.ok || !simRes.ok || !btRes.ok) {
          throw new Error(
            "Failed to load Track C simulation JSONs from /data/."
          );
        }

        const [metaJson, simJson, btJson] = (await Promise.all([
          metaRes.json(),
          simRes.json(),
          btRes.json(),
        ])) as [
          MetadataPayload,
          SimulationAction[],
          PlannerBacktestComparison[]
        ];

        if (!cancelled) {
          setMetadata(metaJson);
          setActions(simJson);
          setSummaries(btJson);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unknown simulation load error"
          );
          setLoading(false);
        }
      }
    }

    loadPlannerData();
    return () => {
      cancelled = true;
    };
  }, []);

  const months = useMemo(
    () => metadata?.date_range.months ?? [],
    [metadata]
  );

  // Playback timer for month-by-month causal replay
  useEffect(() => {
    if (!isPlaying || months.length === 0) return;
    const timer = window.setInterval(() => {
      setMonthIndex((prev) => {
        if (prev >= months.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [isPlaying, months.length]);

  const activeMonth = months[monthIndex] ?? "2023-03";

  const selectedItem = useMemo(() => {
    if (!metadata) return null;
    return (
      metadata.items.find((i) => i.item_code === selectedItemCode) ??
      metadata.items[0] ??
      null
    );
  }, [metadata, selectedItemCode]);

  const selectedSummary = useMemo(() => {
    return (
      summaries.find((s) => s.item_code === selectedItemCode) ??
      summaries[0] ??
      null
    );
  }, [summaries, selectedItemCode]);

  // Actions for the selected item across all 44 months
  const itemActions = useMemo(
    () => actions.filter((a) => a.item_code === selectedItemCode),
    [actions, selectedItemCode]
  );

  // Actions for the selected item + active month (all 6 godowns)
  const monthActionsAllGodowns = useMemo(
    () => itemActions.filter((a) => a.month === activeMonth),
    [itemActions, activeMonth]
  );

  // Decision counts for the active month (across 6 godowns)
  const decisionCounts = useMemo(() => {
    const counts: Record<SimulationDecision, number> = {
      ORDER: 0,
      HOLD: 0,
      TRANSFER_IN: 0,
      TRANSFER_OUT: 0,
      WAIT: 0,
    };
    for (const a of monthActionsAllGodowns) {
      counts[a.decision] += 1;
    }
    return counts;
  }, [monthActionsAllGodowns]);

  // Filtered actions for Monthly Action Cards
  const filteredMonthActions = useMemo(() => {
    return monthActionsAllGodowns.filter((a) => {
      if (selectedGodown !== "ALL" && a.godown !== selectedGodown) return false;
      if (decisionFilter === "ALL") return true;
      if (decisionFilter === "TRANSFER") {
        return a.decision === "TRANSFER_IN" || a.decision === "TRANSFER_OUT";
      }
      return a.decision === decisionFilter;
    });
  }, [monthActionsAllGodowns, selectedGodown, decisionFilter]);

  const contractorIdleStock =
    monthActionsAllGodowns[0]?.contractor_idle_stock ?? 0;

  const totalProjectedDemand = useMemo(
    () =>
      monthActionsAllGodowns.reduce(
        (acc, a) => acc + a.projected_monthly_demand,
        0
      ),
    [monthActionsAllGodowns]
  );

  const monthTransferRoutes = useMemo(
    () => collectTransfersFromActions(monthActionsAllGodowns),
    [monthActionsAllGodowns]
  );

  const allItemTransferRoutes = useMemo(
    () => collectTransfersFromActions(itemActions),
    [itemActions]
  );

  const handleTogglePlay = () => {
    if (!isPlaying && monthIndex >= months.length - 1) {
      setMonthIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSelectMonthByString = (m: string) => {
    const idx = months.indexOf(m);
    if (idx !== -1) {
      setIsPlaying(false);
      setMonthIndex(idx);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-600 shadow-xs">
        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
        Loading 44-month causal replay &amp; LP logistics simulation...
      </div>
    );
  }

  if (error || !metadata || !selectedItem || !selectedSummary) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div>
          <div className="font-semibold">Unable to load Planner simulation</div>
          <p className="mt-1 text-xs text-rose-700">
            {error ?? "Missing pre-aggregated JSON payloads in /public/data/."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. "The Bar" Headline Scorecard + 16-SKU Matrix */}
      <TheBarScorecard
        selected={selectedSummary}
        allSummaries={summaries}
        onSelectItem={(code) => {
          setSelectedItemCode(code);
          setDecisionFilter("ALL");
        }}
      />

      {/* 2. Interactive Month Scrubber + Filters */}
      <MonthScrubber
        months={months}
        monthIndex={monthIndex}
        onChangeMonthIndex={(idx) => {
          setIsPlaying(false);
          setMonthIndex(idx);
        }}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        items={metadata.items}
        selectedItemCode={selectedItemCode}
        onChangeItemCode={(code) => {
          setSelectedItemCode(code);
          setDecisionFilter("ALL");
        }}
        godowns={metadata.godowns}
        selectedGodown={selectedGodown}
        onChangeGodown={setSelectedGodown}
        decisionFilter={decisionFilter}
        onChangeDecisionFilter={setDecisionFilter}
        selectedItem={selectedItem}
        contractorIdleStock={contractorIdleStock}
        totalProjectedDemand={totalProjectedDemand}
        decisionCounts={decisionCounts}
      />

      {/* 3. Actual vs. Planned Idle Stock Curve (Recharts) */}
      <IdleStockChart
        summary={selectedSummary}
        activeMonth={activeMonth}
        onSelectMonth={handleSelectMonthByString}
      />

      {/* 4. Monthly Action Cards (6 Active Godowns) */}
      <ActionCardsGrid
        actions={filteredMonthActions}
        activeMonth={activeMonth}
      />

      {/* 5. Inter-Godown Transfer Logistics Panel */}
      <TransferLogisticsPanel
        monthRoutes={monthTransferRoutes}
        allItemRoutes={allItemTransferRoutes}
        activeMonth={activeMonth}
        unit={selectedItem.unit}
        leadTimeDays={selectedItem.lead_time_days}
      />
    </div>
  );
}
