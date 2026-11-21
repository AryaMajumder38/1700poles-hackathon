"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  Activity,
  AlertTriangle,
  Compass,
  GitCompareArrows,
  Layers,
  RefreshCw,
  Warehouse,
  Zap,
} from "lucide-react";
import OpsCopilotDrawer from "@/features/copilot/OpsCopilotDrawer";
import LedgerView from "@/features/ledger";
import PlannerView from "@/features/planner";
import NavbarProfileDropdown from "@/features/planner/NavbarProfileDropdown";
import SetsView from "@/features/sets";
import type {
  ContractorStockRow,
  MetadataPayload,
  MonthlyLedgerRow,
} from "@/types/lumino";

type TabId = "ledger" | "planner" | "sets";

const FLAGSHIP_ITEM_CODE = "MPO010014";

function formatQty(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("ledger");
  const [metadata, setMetadata] = useState<MetadataPayload | null>(null);
  const [ledgerRows, setLedgerRows] = useState<MonthlyLedgerRow[]>([]);
  const [contractorRows, setContractorRows] = useState<ContractorStockRow[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadNonce((n) => n + 1);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadCoreData() {
      try {
        const [metaRes, ledgerRes, contractorRes] = await Promise.all([
          fetch("/data/metadata.json", { signal: controller.signal }),
          fetch("/data/ledger_monthly.json", { signal: controller.signal }),
          fetch("/data/contractor_stock.json", { signal: controller.signal }),
        ]);

        if (!metaRes.ok || !ledgerRes.ok || !contractorRes.ok) {
          throw new Error(
            "Failed to load pre-aggregated Lumino ledger data from /data/."
          );
        }

        const [metaJson, ledgerJson, contractorJson] = (await Promise.all([
          metaRes.json(),
          ledgerRes.json(),
          contractorRes.json(),
        ])) as [MetadataPayload, MonthlyLedgerRow[], ContractorStockRow[]];

        if (controller.signal.aborted) return;

        setMetadata(metaJson);
        setLedgerRows(ledgerJson);
        setContractorRows(contractorJson);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown load error");
        setLoading(false);
      }
    }

    loadCoreData();
    return () => {
      controller.abort();
    };
  }, [reloadNonce]);

  // Flagship KPI metrics for MPO010014 (PCC POLE 8.5 MTR 180 KG, PCS)
  // Strictly single-item UOM — never sums across distinct items or units.
  const flagshipStats = useMemo(() => {
    const poleLedger = ledgerRows.filter(
      (r) => r.item_code === FLAGSHIP_ITEM_CODE
    );
    const poleContractor = contractorRows.filter(
      (r) => r.item_code === FLAGSHIP_ITEM_CODE
    );

    if (poleLedger.length === 0 || poleContractor.length === 0) {
      return null;
    }

    const totalReceipts = poleLedger.reduce((acc, r) => acc + r.receipts, 0);
    const totalConsumption = poleContractor.reduce(
      (acc, r) => acc + r.total_consumption,
      0
    );

    let peakGodownStock = 0;
    let peakGodownMonth = "";
    let peakContractorStock = 0;
    let peakContractorMonth = "";

    for (const row of poleContractor) {
      if (row.project_godown_stock > peakGodownStock) {
        peakGodownStock = row.project_godown_stock;
        peakGodownMonth = row.month;
      }
      if (row.closing_contractor_stock > peakContractorStock) {
        peakContractorStock = row.closing_contractor_stock;
        peakContractorMonth = row.month;
      }
    }

    const lastRow = poleContractor[poleContractor.length - 1];

    return {
      unit: lastRow.unit,
      totalReceipts,
      totalConsumption,
      peakGodownStock,
      peakGodownMonth,
      peakContractorStock,
      peakContractorMonth,
      endingGodownStock: lastRow.project_godown_stock,
      endingContractorStock: lastRow.closing_contractor_stock,
    };
  }, [ledgerRows, contractorRows]);

  const tabs: {
    id: TabId;
    label: string;
    subtitle: string;
    icon: typeof Layers;
  }[] = [
    {
      id: "ledger",
      label: "See It",
      subtitle: "Godown & Contractor Ledger",
      icon: Layers,
    },
    {
      id: "planner",
      label: "Plan It",
      subtitle: "Causal Replay & Orders",
      icon: Compass,
    },
    {
      id: "sets",
      label: "Match Sets",
      subtitle: "Kit Ratio Diagnostics",
      icon: GitCompareArrows,
    },
  ];

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveTab(tabs[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Global Control-Room Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 text-slate-50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Brand Mark */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 shadow-sm">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400 truncate">
                  Lumino Industries • Bold Bytes
                </div>
                <div className="font-mono text-[11px] text-slate-400 truncate">
                  Kanpur RDSS Supply Chain
                </div>
              </div>
            </div>

            {/* Center: 3-View Navigation Tabs */}
            <div
              role="tablist"
              aria-label="Planner Modules"
              className="order-3 w-full sm:order-2 sm:w-auto flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1"
            >
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, index)}
                    title={tab.subtitle}
                    className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                      isActive
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Global RBAC Profile Switcher */}
            <div className="order-2 sm:order-3 flex items-center">
              <NavbarProfileDropdown metadata={metadata} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">
        {/* Global KPI Strip (3 Columns) */}
        {error ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-900 shadow-xs hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 cursor-pointer sm:self-center"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : (
          <section
            aria-label="Global Project KPIs"
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs min-w-0">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>PCC Poles Received vs Erected</span>
                <Activity className="h-4 w-4 text-amber-600 shrink-0" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {loading || !flagshipStats
                    ? "—"
                    : `${formatQty(flagshipStats.totalReceipts)} ${flagshipStats.unit}`}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {loading || !flagshipStats
                  ? "Loading MPO010014..."
                  : `${formatQty(flagshipStats.totalConsumption)} ${flagshipStats.unit} consumed on site`}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs min-w-0">
              <div className="flex items-center justify-between text-xs font-medium text-amber-900">
                <span>Peak Godown Idle (PCC Poles)</span>
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-amber-950">
                  {loading || !flagshipStats
                    ? "—"
                    : `${formatQty(flagshipStats.peakGodownStock)} ${flagshipStats.unit}`}
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800 tabular-nums">
                {loading || !flagshipStats
                  ? "Scanning ledger..."
                  : `Peak in ${flagshipStats.peakGodownMonth} • Contractor peak ${formatQty(flagshipStats.peakContractorStock)} ${flagshipStats.unit}`}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs min-w-0">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Tracked Network Scope</span>
                <Warehouse className="h-4 w-4 text-slate-600 shrink-0" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {loading || !metadata
                    ? "—"
                    : `${metadata.godowns.length} Godowns`}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {loading || !metadata
                  ? "Loading catalog..."
                  : `${metadata.items.length} SKUs • ${metadata.sets.length} Kit Sets • ${formatQty(ledgerRows.length)} ledger rows`}
              </p>
            </div>
          </section>
        )}

        {/* Active Track Feature View */}
        <div
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="pb-8 min-w-0"
        >
          {activeTab === "ledger" && <LedgerView />}
          {activeTab === "planner" && <PlannerView hideProfileSwitcher />}
          {activeTab === "sets" && <SetsView />}
        </div>
      </main>
      <OpsCopilotDrawer activeTab={activeTab} />
    </div>
  );
}
