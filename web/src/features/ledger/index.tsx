"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  Lock,
  RefreshCw,
} from "lucide-react";
import { useRbacSession } from "@/features/planner/rbacBridge";
import type {
  ActiveGodown,
  ContractorStockRow,
  ItemMaster,
  ItemUnit,
  MetadataPayload,
  MonthlyLedgerRow,
} from "@/types/lumino";
import { ContractorStockChart } from "./components/ContractorStockChart";
import { FilterBar } from "./components/FilterBar";
import { GodownFlowChart } from "./components/GodownFlowChart";
import { KpiSummaryStrip } from "./components/KpiSummaryStrip";
import { MonthlyLedgerTable } from "./components/MonthlyLedgerTable";
import { formatMonthShort } from "./utils";

const FLAGSHIP_ITEM_CODE = "MPO010014"; // PCC POLE 8.5 MTR 180 KG

export default function LedgerView() {
  const [metadata, setMetadata] = useState<MetadataPayload | null>(null);
  const [ledgerRows, setLedgerRows] = useState<MonthlyLedgerRow[]>([]);
  const [contractorRows, setContractorRows] = useState<ContractorStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Filters
  const { session } = useRbacSession();
  const [selectedItemCode, setSelectedItemCode] = useState<string>(FLAGSHIP_ITEM_CODE);
  const [selectedGodown, setSelectedGodown] = useState<string>("ALL");
  const [startMonth, setStartMonth] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");

  const lockedGodown: ActiveGodown | null = useMemo(() => {
    if (session.roleType !== "SITE_MANAGER" || !session.warehouseName) {
      return null;
    }
    const validGodowns = metadata?.godowns ?? [];
    return validGodowns.find((g) => g === session.warehouseName) ?? null;
  }, [session.roleType, session.warehouseName, metadata]);

  const prevLockedRef = useRef<ActiveGodown | null>(null);
  useEffect(() => {
    if (prevLockedRef.current && !lockedGodown) {
      setSelectedGodown("ALL");
    }
    prevLockedRef.current = lockedGodown;
  }, [lockedGodown]);

  const effectiveGodown: string = lockedGodown ?? selectedGodown;

  // Fetch all pre-aggregated data with AbortController cleanup
  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [metaRes, ledgerRes, contractorRes] = await Promise.all([
          fetch("/data/metadata.json", { signal: controller.signal }),
          fetch("/data/ledger_monthly.json", { signal: controller.signal }),
          fetch("/data/contractor_stock.json", { signal: controller.signal }),
        ]);

        if (!metaRes.ok || !ledgerRes.ok || !contractorRes.ok) {
          throw new Error("Failed to load pre-aggregated Lumino ledger JSON files.");
        }

        const [metaJson, ledgerJson, contractorJson]: [
          MetadataPayload,
          MonthlyLedgerRow[],
          ContractorStockRow[],
        ] = await Promise.all([
          metaRes.json(),
          ledgerRes.json(),
          contractorRes.json(),
        ]);

        if (controller.signal.aborted) return;

        setMetadata(metaJson);
        setLedgerRows(ledgerJson);
        setContractorRows(contractorJson);

        const availableMonths = metaJson.date_range?.months ?? [];
        if (availableMonths.length > 0) {
          setStartMonth(metaJson.date_range.start || availableMonths[0]);
          setEndMonth(
            metaJson.date_range.end || availableMonths[availableMonths.length - 1]
          );
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while loading ledger data."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      controller.abort();
    };
  }, [reloadNonce]);

  // Items & current item metadata
  const currentItem: ItemMaster | undefined = useMemo(() => {
    return (
      metadata?.items.find((i) => i.item_code === selectedItemCode) ||
      metadata?.items[0]
    );
  }, [metadata, selectedItemCode]);

  const effectiveItemCode = currentItem?.item_code ?? selectedItemCode;
  const unit: ItemUnit = currentItem?.unit || "PCS";

  const monthsList = useMemo(() => {
    return metadata?.date_range.months || [];
  }, [metadata]);

  const receiptsEndMonth = metadata?.date_range.receipts_end;

  // Filtered raw ledger rows (for table and godown flows)
  const filteredLedgerRows = useMemo(() => {
    return ledgerRows.filter((r) => {
      if (r.item_code !== effectiveItemCode) return false;
      if (startMonth && r.month < startMonth) return false;
      if (endMonth && r.month > endMonth) return false;
      if (effectiveGodown !== "ALL" && r.godown !== effectiveGodown) return false;
      return true;
    });
  }, [ledgerRows, effectiveItemCode, startMonth, endMonth, effectiveGodown]);

  // Aggregated monthly chart points for GodownFlowChart
  const godownChartData = useMemo(() => {
    const monthMap = new Map<
      string,
      {
        month: string;
        receipts: number;
        transfers_in: number;
        transfers_out: number;
        issues: number;
        returns: number;
        closing_stock: number;
      }
    >();

    for (const row of filteredLedgerRows) {
      const existing = monthMap.get(row.month);
      if (!existing) {
        monthMap.set(row.month, {
          month: row.month,
          receipts: row.receipts,
          transfers_in: row.transfers_in,
          transfers_out: row.transfers_out,
          issues: row.issues,
          returns: row.returns,
          closing_stock: row.closing_stock,
        });
      } else {
        existing.receipts += row.receipts;
        existing.transfers_in += row.transfers_in;
        existing.transfers_out += row.transfers_out;
        existing.issues += row.issues;
        existing.returns += row.returns;
        existing.closing_stock += row.closing_stock;
      }
    }

    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredLedgerRows]);

  // Filtered contractor rows (strictly project-wide for selected item)
  const filteredContractorRows = useMemo(() => {
    return contractorRows.filter((r) => {
      if (r.item_code !== effectiveItemCode) return false;
      if (startMonth && r.month < startMonth) return false;
      if (endMonth && r.month > endMonth) return false;
      return true;
    });
  }, [contractorRows, effectiveItemCode, startMonth, endMonth]);

  // Contractor chart points
  const contractorChartData = useMemo(() => {
    return filteredContractorRows
      .map((r) => ({
        month: r.month,
        net_issues: r.total_issues - r.total_returns,
        total_consumption: r.total_consumption,
        closing_contractor_stock: r.closing_contractor_stock,
        project_godown_stock: r.project_godown_stock,
        total_project_idle_stock: r.total_project_idle_stock,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredContractorRows]);

  // KPIs calculation
  const kpis = useMemo(() => {
    let totalReceipts = 0;
    let totalIssues = 0;
    let totalReturns = 0;

    for (const r of filteredLedgerRows) {
      totalReceipts += r.receipts;
      totalIssues += r.issues;
      totalReturns += r.returns;
    }

    let peakGodownStock = 0;
    let peakGodownMonth = "";
    for (const pt of godownChartData) {
      if (pt.closing_stock > peakGodownStock) {
        peakGodownStock = pt.closing_stock;
        peakGodownMonth = pt.month;
      }
    }

    const endingGodownStock =
      godownChartData.length > 0
        ? godownChartData[godownChartData.length - 1].closing_stock
        : 0;

    let totalConsumption = 0;
    let peakContractorIdleStock = 0;
    let peakContractorMonth = "";
    for (const r of filteredContractorRows) {
      totalConsumption += r.total_consumption;
      if (r.closing_contractor_stock > peakContractorIdleStock) {
        peakContractorIdleStock = r.closing_contractor_stock;
        peakContractorMonth = r.month;
      }
    }

    const contractorIdleStock =
      filteredContractorRows.length > 0
        ? filteredContractorRows[filteredContractorRows.length - 1].closing_contractor_stock
        : 0;

    return {
      totalReceipts,
      totalIssues,
      totalReturns,
      peakGodownStock,
      peakGodownMonth,
      endingGodownStock,
      totalConsumption,
      contractorIdleStock,
      peakContractorIdleStock,
      peakContractorMonth,
    };
  }, [filteredLedgerRows, godownChartData, filteredContractorRows]);

  const handlePresetDateRange = (start: string, end: string) => {
    setStartMonth(start);
    setEndMonth(end);
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading inventory ledger"
        className="min-w-0 space-y-6"
      >
        {/* Header skeleton */}
        <div className="space-y-2.5">
          <div className="h-9 w-56 rounded-full bg-white/[0.05] animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded-full bg-white/[0.05] animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="h-9 w-full sm:w-72 rounded-full bg-white/[0.05] animate-pulse" />
          <div className="h-9 w-full sm:w-48 rounded-full bg-white/[0.05] animate-pulse" />
          <div className="h-9 w-56 rounded-full bg-white/[0.05] animate-pulse" />
          <div className="h-9 w-64 rounded-full bg-white/[0.05] animate-pulse sm:ml-auto" />
        </div>

        {/* KPI strip skeleton */}
        <div className="grid grid-cols-1 overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="space-y-3 border-b border-white/[0.05] p-6"
            >
              <div className="h-3 w-28 rounded-full bg-white/[0.05] animate-pulse" />
              <div className="h-8 w-36 rounded-lg bg-white/[0.05] animate-pulse" />
              <div className="h-3 w-40 rounded-full bg-white/[0.05] animate-pulse" />
            </div>
          ))}
        </div>

        {/* Chart card skeleton */}
        <div className="rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-6 space-y-5">
          <div className="space-y-2">
            <div className="h-5 w-52 rounded-full bg-white/[0.05] animate-pulse" />
            <div className="h-3.5 w-80 max-w-full rounded-full bg-white/[0.05] animate-pulse" />
          </div>
          <div className="h-72 w-full rounded-[16px] bg-white/[0.05] animate-pulse" />
        </div>
        <span className="sr-only">
          Loading inventory ledger. Preparing monthly godown movements and contractor balances.
        </span>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3.5 rounded-[20px] border border-white/[0.08] bg-[#1a1a1a] p-8 text-center"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10">
          <AlertCircle className="h-5 w-5 text-rose-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-medium text-[#e7e7e7]">
            Failed to load inventory ledger
          </h3>
          <p className="mt-1 max-w-md text-sm text-[#a0a0a0]">
            {error || "Inventory metadata could not be loaded."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadNonce((n) => n + 1)}
          className="mt-1 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black transition-all duration-200 hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Intro Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-serif font-normal text-[30px] sm:text-[36px] leading-[1.2] tracking-[-0.015em] text-[#e7e7e7]">
              Inventory ledger
            </h2>
            {lockedGodown && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-normal text-[#a0a0a0]">
                <Lock className="h-3 w-3 text-[#898989]" aria-hidden="true" />
                <span>Site scoped: {lockedGodown}</span>
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-[#a0a0a0]">
            Monthly inflows, transfers, contractor issues, and idle balances across Kanpur godowns.
          </p>
        </div>

        {/* Spectral isometric ledger stack ornament (md+) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 132 76"
          fill="none"
          className="hidden h-[72px] w-[126px] shrink-0 md:block select-none"
        >
          <defs>
            <linearGradient
              id="ledger-prism-plane"
              x1="34"
              y1="14"
              x2="98"
              y2="46"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.28" />
            </linearGradient>
            <linearGradient
              id="ledger-prism-glow"
              x1="66"
              y1="6"
              x2="66"
              y2="70"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Soft ambient halo behind prism */}
          <ellipse cx="66" cy="38" rx="40" ry="22" fill="url(#ledger-prism-glow)" />

          {/* Bottom wireframe ledger plane */}
          <polygon
            points="66,42 102,54 66,66 30,54"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1"
          />
          {/* Middle wireframe ledger plane */}
          <polygon
            points="66,28 102,40 66,52 30,40"
            stroke="rgba(255,255,255,0.38)"
            strokeWidth="1"
          />
          {/* Top illuminated plane (violet -> teal) */}
          <polygon
            points="66,14 102,26 66,38 30,26"
            fill="url(#ledger-prism-plane)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
          />
          {/* Inner flow grid line on top plane */}
          <line
            x1="48"
            y1="20"
            x2="84"
            y2="32"
            stroke="rgba(255,255,255,0.24)"
            strokeWidth="0.75"
          />
          {/* Vertical isometric struts */}
          <line
            x1="30"
            y1="26"
            x2="30"
            y2="54"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
          />
          <line
            x1="102"
            y1="26"
            x2="102"
            y2="54"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
          />
          <line
            x1="66"
            y1="38"
            x2="66"
            y2="66"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="1"
            strokeDasharray="2.5 2.5"
            className="steep-flow-dash"
          />
          {/* Vertex nodes */}
          <circle cx="66" cy="14" r="1.5" fill="#e7e7e7" />
          <circle cx="102" cy="26" r="1.5" fill="#5eead4" />
          <circle cx="30" cy="26" r="1.5" fill="#a78bfa" />

          {/* Tiny 4-ray twinkling starburst (primary) */}
          <path
            d="M114 11 L115.2 15.8 L120 17 L115.2 18.2 L114 23 L112.8 18.2 L108 17 L112.8 15.8 Z"
            fill="#e7e7e7"
            fillOpacity="0.85"
            className="steep-twinkle"
          />
          {/* Secondary micro starburst */}
          <path
            d="M18 46 L18.7 48.3 L21 49 L18.7 49.7 L18 52 L17.3 49.7 L15 49 L17.3 48.3 Z"
            fill="#a78bfa"
            fillOpacity="0.7"
            className="steep-twinkle"
          />
        </svg>
      </div>

      {/* Interactive Filter Toolbar */}
      <FilterBar
        items={metadata.items}
        selectedItemCode={effectiveItemCode}
        onSelectItemCode={setSelectedItemCode}
        godowns={metadata.godowns}
        selectedGodown={effectiveGodown}
        onSelectGodown={setSelectedGodown}
        lockedGodown={lockedGodown}
        months={monthsList}
        receiptsEndMonth={receiptsEndMonth}
        startMonth={startMonth}
        endMonth={endMonth}
        onSelectStartMonth={setStartMonth}
        onSelectEndMonth={setEndMonth}
        onPresetDateRange={handlePresetDateRange}
      />

      {/* Merged KPI Summary Card */}
      <KpiSummaryStrip
        unit={unit}
        godownName={effectiveGodown}
        totalReceipts={kpis.totalReceipts}
        totalIssues={kpis.totalIssues}
        totalReturns={kpis.totalReturns}
        peakGodownStock={kpis.peakGodownStock}
        peakGodownMonth={kpis.peakGodownMonth}
        endingGodownStock={kpis.endingGodownStock}
        totalConsumption={kpis.totalConsumption}
        contractorIdleStock={kpis.contractorIdleStock}
        peakContractorIdleStock={kpis.peakContractorIdleStock}
        peakContractorMonth={kpis.peakContractorMonth}
      />

      {/* Charts */}
      <div className="grid min-w-0 grid-cols-1 gap-6">
        <GodownFlowChart
          data={godownChartData}
          unit={unit}
          godownName={effectiveGodown}
          receiptsEndMonth={receiptsEndMonth}
        />

        <ContractorStockChart
          data={contractorChartData}
          unit={unit}
          receiptsEndMonth={receiptsEndMonth}
        />
      </div>

      {/* Monthly Audit Ledger Table */}
      <MonthlyLedgerTable
        rows={filteredLedgerRows}
        unit={unit}
        itemCode={effectiveItemCode}
        godownName={effectiveGodown}
      />

      {/* Collapsed Data Notes */}
      <details className="group rounded-[20px] border border-white/[0.06] bg-[#1a1a1a] px-5 py-3.5 text-sm text-[#a0a0a0] transition-colors duration-200 hover:border-white/[0.1]">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium text-[#a0a0a0] transition-colors duration-150 hover:text-[#e7e7e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 [&::-webkit-details-marker]:hidden">
          <ChevronRight
            className="h-4 w-4 text-[#898989] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-90"
            aria-hidden="true"
          />
          <span>About this data</span>
        </summary>
        <ul className="mt-3 space-y-2 border-l border-white/[0.08] pl-4 text-sm leading-relaxed text-[#a0a0a0] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
          <li>
            Quantities are shown in each item&apos;s native unit (
            <span className="font-mono text-xs text-[#e7e7e7]">{unit}</span>) and are never summed across different SKUs.
          </li>
          <li>
            Site consumption is certified at project level without godown attribution, so contractor idle stock reflects all {metadata.godowns.length} active districts combined.
          </li>
          <li>
            Vendor receipts ceased after{" "}
            {receiptsEndMonth ? formatMonthShort(receiptsEndMonth) : "the procurement window"}; later months reflect consumption burn-down and residual holdings.
          </li>
        </ul>
      </details>
    </div>
  );
}
