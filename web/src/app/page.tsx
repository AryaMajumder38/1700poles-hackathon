"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowRight,
  Compass,
  GitCompareArrows,
  Layers,
  RefreshCw,
} from "lucide-react";
import {
  AtmosphericBackdrop,
  LuminoEmblem,
  SpectralYardPrism3D,
  StarburstIcon,
  SteepFooter,
  ThresholdDoorArtwork,
} from "@/components/SteepArtwork";
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
const OPEN_COPILOT_EVENT = "lumino:open-copilot";

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
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadNonce((n) => n + 1);
  }

  function handleOpenCopilot() {
    window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT));
  }

  function handleJumpToTab(tab: TabId) {
    setActiveTab(tab);
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    workspaceRef.current?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
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
    <div className="min-h-screen flex flex-col bg-[#121212] text-[#e7e7e7]">
      {/* Fixed/Sticky 64px Steep Frosted Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#222222]/80 backdrop-blur-[16px]">
        <div className="mx-auto flex min-h-16 max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0 lg:px-8">
          {/* Left: Minimal Geometric Lumino Mark */}
          <div className="flex min-w-0 items-center gap-2.5">
            <LuminoEmblem className="h-6 w-6 shrink-0" />
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-[15px] font-medium tracking-[-0.01em] text-white">
                Lumino
              </span>
              <span className="hidden truncate text-[13px] text-[#898989] sm:inline">
                Kanpur RDSS
              </span>
            </div>
          </div>

          {/* Center: Pill Segmented Tablist (WAI-ARIA compliant) */}
          <div
            role="tablist"
            aria-label="Planner Modules"
            className="order-3 flex w-full items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.05] p-1 sm:order-2 sm:w-auto"
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
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] sm:flex-initial ${
                    isActive
                      ? "bg-white font-medium text-black shadow-sm"
                      : "font-normal text-[#a0a0a0] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? "text-black" : "text-[#898989]"
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Steep Dark RBAC Profile Switcher */}
          <div className="order-2 flex items-center sm:order-3">
            <NavbarProfileDropdown metadata={metadata} />
          </div>
        </div>
      </header>

      {/* Compact Editorial Opening Stage bathed in AtmosphericBackdrop */}
      <section className="relative overflow-hidden">
        <AtmosphericBackdrop />

        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pt-7 pb-6 sm:px-6 sm:pt-9 sm:pb-7 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
            {/* Asymmetric Editorial Promise */}
            <div className="min-w-0">
              <p className="text-xs font-normal text-[#898989]">
                Kanpur RDSS · 44-month consumption-led ledger
              </p>
              <h1 className="mt-2 font-serif font-normal text-[36px] leading-[1.12] tracking-[-0.025em] text-[#e7e7e7] sm:text-[48px] lg:text-[56px]">
                See every pole, ship only what sites need.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-[#a0a0a0] sm:text-lg">
                Track godown and contractor stock across 6 Kanpur yards, replay
                zero-lookahead orders, and resolve kit bottlenecks.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleJumpToTab("planner")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition-all duration-200 hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] cursor-pointer"
                >
                  <span>Explore causal replay</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenCopilot}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-medium text-[#e7e7e7] transition-all duration-200 hover:bg-white/[0.11] active:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] cursor-pointer"
                >
                  <StarburstIcon className="h-3.5 w-3.5 text-violet-300" />
                  <span>Ask Copilot</span>
                </button>
              </div>
            </div>

            {/* Interactive 3D Isometric Spectral Yard Rig */}
            <div className="min-w-0">
              <SpectralYardPrism3D className="mx-auto max-w-[400px] lg:max-w-[440px]" />
            </div>
          </div>

          {/* Single Raised Charcoal KPI Strip */}
          <div className="mt-6">
            {error ? (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-[20px] border border-rose-400/20 bg-[#1a1a1a]/90 px-5 py-4 text-sm text-[#e7e7e7] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400"
                  />
                  <span className="truncate">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-full border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-medium text-[#e7e7e7] transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer sm:self-center"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[#a0a0a0]" />
                  Retry
                </button>
              </div>
            ) : (
              <section
                aria-label="Global Project KPIs"
                className="rounded-[20px] border border-white/[0.06] bg-[#1a1a1a]/90 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md"
              >
                <div className="grid grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {/* Stat 1: PCC Poles Received vs Erected */}
                  <div className="min-w-0 px-5 py-4 sm:px-6 sm:py-5">
                    {loading || !flagshipStats ? (
                      <div className="space-y-2.5" aria-busy="true">
                        <div className="h-3.5 w-36 rounded-full bg-white/[0.06] animate-pulse" />
                        <div className="h-8 w-28 rounded-lg bg-white/[0.08] animate-pulse" />
                        <div className="h-3.5 w-44 rounded-full bg-white/[0.05] animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-normal text-[#898989]">
                          PCC poles received vs erected
                        </div>
                        <div className="mt-2 flex items-baseline">
                          <span className="font-serif font-normal text-[32px] leading-none tracking-[-0.02em] tabular-nums text-white">
                            {formatQty(flagshipStats.totalReceipts)}
                          </span>
                          <span className="ml-1.5 font-sans text-xs text-[#898989]">
                            {flagshipStats.unit}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs tabular-nums text-[#a0a0a0]">
                          {formatQty(flagshipStats.totalConsumption)}{" "}
                          {flagshipStats.unit} consumed on site
                        </p>
                      </>
                    )}
                  </div>

                  {/* Stat 2: Peak Godown Idle */}
                  <div className="min-w-0 px-5 py-4 sm:px-6 sm:py-5">
                    {loading || !flagshipStats ? (
                      <div className="space-y-2.5" aria-busy="true">
                        <div className="h-3.5 w-32 rounded-full bg-white/[0.06] animate-pulse" />
                        <div className="h-8 w-24 rounded-lg bg-white/[0.08] animate-pulse" />
                        <div className="h-3.5 w-48 rounded-full bg-white/[0.05] animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-normal text-[#898989]">
                          Peak godown idle (PCC poles)
                        </div>
                        <div className="mt-2 flex items-baseline">
                          <span className="font-serif font-normal text-[32px] leading-none tracking-[-0.02em] tabular-nums text-white">
                            {formatQty(flagshipStats.peakGodownStock)}
                          </span>
                          <span className="ml-1.5 font-sans text-xs text-[#898989]">
                            {flagshipStats.unit}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs tabular-nums text-[#a0a0a0]">
                          Peak {flagshipStats.peakGodownMonth} · Contractor peak{" "}
                          {formatQty(flagshipStats.peakContractorStock)}{" "}
                          {flagshipStats.unit}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Stat 3: Tracked Network Scope */}
                  <div className="min-w-0 px-5 py-4 sm:px-6 sm:py-5">
                    {loading || !metadata ? (
                      <div className="space-y-2.5" aria-busy="true">
                        <div className="h-3.5 w-32 rounded-full bg-white/[0.06] animate-pulse" />
                        <div className="h-8 w-24 rounded-lg bg-white/[0.08] animate-pulse" />
                        <div className="h-3.5 w-44 rounded-full bg-white/[0.05] animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-normal text-[#898989]">
                          Tracked network scope
                        </div>
                        <div className="mt-2 flex items-baseline">
                          <span className="font-serif font-normal text-[32px] leading-none tracking-[-0.02em] tabular-nums text-white">
                            {metadata.godowns.length}
                          </span>
                          <span className="ml-1.5 font-sans text-xs text-[#898989]">
                            godowns
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs tabular-nums text-[#a0a0a0]">
                          {metadata.items.length} SKUs · {metadata.sets.length}{" "}
                          kit sets · {formatQty(ledgerRows.length)} ledger rows
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </section>

      {/* Main Workspace Stage */}
      <main
        ref={workspaceRef}
        className="mx-auto w-full max-w-[1280px] flex-1 min-w-0 scroll-mt-20 px-4 pt-2 pb-12 sm:px-6 lg:px-8"
      >
        <div
          key={activeTab}
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="steep-fade-in min-w-0"
        >
          {activeTab === "ledger" && <LedgerView />}
          {activeTab === "planner" && <PlannerView hideProfileSwitcher />}
          {activeTab === "sets" && <SetsView />}
        </div>
      </main>

      {/* Closing Threshold Invitation */}
      <section className="border-t border-white/[0.06] bg-[#121212]">
        <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="min-w-0">
              <p className="text-xs font-normal text-[#898989]">
                Next step · Kanpur RDSS
              </p>
              <h2 className="mt-2.5 font-serif font-normal text-[36px] leading-[1.16] tracking-[-0.015em] text-[#e7e7e7] sm:text-[48px]">
                Step into consumption-led procurement.
              </h2>
              <p className="mt-3.5 max-w-md text-base leading-relaxed text-[#a0a0a0]">
                Rebalance idle yard stock and verify kit ratios before another
                purchase order leaves the desk.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    handleJumpToTab(activeTab === "planner" ? "sets" : "planner")
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-medium text-black transition-all duration-200 hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] cursor-pointer"
                >
                  <span>
                    {activeTab === "planner"
                      ? "Jump to Match Sets"
                      : "Open Ordering Planner"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenCopilot}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-5 text-[15px] font-medium text-[#e7e7e7] transition-all duration-200 hover:bg-white/[0.11] active:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] cursor-pointer"
                >
                  <StarburstIcon className="h-4 w-4 text-violet-300" />
                  <span>Ask Ops Copilot</span>
                </button>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <ThresholdDoorArtwork />
            </div>
          </div>
        </div>
      </section>

      {/* Restrained 5-Column Steep Directory Footer */}
      <SteepFooter
        activeTab={activeTab}
        onSelectTab={handleJumpToTab}
        onOpenCopilot={handleOpenCopilot}
      />

      <OpsCopilotDrawer activeTab={activeTab} />
    </div>
  );
}
