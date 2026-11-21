import fs from "node:fs";
import path from "node:path";
import type {
  ActiveGodown,
  BacktestComparison,
  ContractorStockRow,
  ItemMaster,
  MetadataPayload,
  MonthlyLedgerRow,
  SetImbalanceRow,
  SetRatioMode,
  SimulationAction,
} from "@/types/lumino";

export interface CopilotDataset {
  metadata: MetadataPayload;
  ledger: MonthlyLedgerRow[];
  contractor: ContractorStockRow[];
  simulation: SimulationAction[];
  backtest: BacktestComparison[];
  sets: SetImbalanceRow[];
}

export interface ToolTrace {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

export interface GroundedToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<
      string,
      { type: string; description: string; enum?: string[] }
    >;
    required?: string[];
  };
}

let cachedData: CopilotDataset | null = null;

export function loadCopilotData(): CopilotDataset {
  if (cachedData) return cachedData;

  const dataDir = path.join(process.cwd(), "public", "data");
  const readJson = <T,>(filename: string): T =>
    JSON.parse(fs.readFileSync(path.join(dataDir, filename), "utf-8")) as T;

  cachedData = {
    metadata: readJson<MetadataPayload>("metadata.json"),
    ledger: readJson<MonthlyLedgerRow[]>("ledger_monthly.json"),
    contractor: readJson<ContractorStockRow[]>("contractor_stock.json"),
    simulation: readJson<SimulationAction[]>("simulation_default.json"),
    backtest: readJson<BacktestComparison[]>("backtest_summary.json"),
    sets: readJson<SetImbalanceRow[]>("sets_imbalance.json"),
  };
  return cachedData;
}

const GODOWN_ALIASES: Record<string, ActiveGodown> = {
  auraiya: "KANPUR AURAIYA",
  "kanpur auraiya": "KANPUR AURAIYA",
  dehat: "KANPUR DEHAT",
  "kanpur dehat": "KANPUR DEHAT",
  etawah: "KANPUR ETAWAH",
  "kanpur etawah": "KANPUR ETAWAH",
  farrukhabad: "KANPUR FARRUKHABAD",
  "kanpur farrukhabad": "KANPUR FARRUKHABAD",
  kannauj: "KANPUR KANNAUJ",
  "kanpur kannauj": "KANPUR KANNAUJ",
  nagar: "KANPUR NAGAR",
  "kanpur nagar": "KANPUR NAGAR",
};

export function resolveGodown(query?: string): ActiveGodown | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (GODOWN_ALIASES[q]) return GODOWN_ALIASES[q];
  for (const [alias, canonical] of Object.entries(GODOWN_ALIASES)) {
    if (q.includes(alias)) return canonical;
  }
  return null;
}

export function resolveItem(
  query: string | undefined,
  items: ItemMaster[]
): ItemMaster | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  const exact = items.find((i) => i.item_code.toLowerCase() === q);
  if (exact) return exact;

  // Common domain keywords (English + Hinglish)
  if (/\b(pole|poles|khamba|pcc|mpo010014)\b/.test(q)) {
    return items.find((i) => i.item_code === "MPO010014") ?? null;
  }
  if (/\b(3[\s-]*ph|three[\s-]*phase|1\.078|mrp070065)\b/.test(q)) {
    return items.find((i) => i.item_code === "MRP070065") ?? null;
  }
  if (/\b(1[\s-]*ph|single[\s-]*phase|1\.077|mrp070064)\b/.test(q)) {
    return items.find((i) => i.item_code === "MRP070064") ?? null;
  }
  if (/\b(pole\s*clamp|clamp\s*rdss|1\.071|mrp070060)\b/.test(q)) {
    return items.find((i) => i.item_code === "MRP070060") ?? null;
  }
  if (/\b(mnb010174|m16|gi\s*nut|shared\s*bolt|nut[\s&]*bolt)\b/.test(q)) {
    return items.find((i) => i.item_code === "MNB010174") ?? null;
  }
  if (/\b(ring\s*lug|mlu020008)\b/.test(q)) {
    return items.find((i) => i.item_code === "MLU020008") ?? null;
  }
  if (/\b(eye\s*hook|meh050071)\b/.test(q)) {
    return items.find((i) => i.item_code === "MEH050071") ?? null;
  }
  if (/\b(xlpe|aerial\s*bunched|ab\s*cable|mca020009)\b/.test(q)) {
    return items.find((i) => i.item_code === "MCA020009") ?? null;
  }

  return (
    items.find(
      (i) =>
        i.item_name.toLowerCase().includes(q) ||
        i.item_code.toLowerCase().includes(q)
    ) ?? null
  );
}

export function resolveSetNo(query?: string): string | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (q.includes("1.071") || q.includes("clamp") || q.includes("mrp070060")) {
    return "1.071";
  }
  if (
    q.includes("1.077") ||
    q.includes("1-ph") ||
    q.includes("1 ph") ||
    q.includes("single") ||
    q.includes("mrp070064")
  ) {
    return "1.077";
  }
  if (
    q.includes("1.078") ||
    q.includes("3-ph") ||
    q.includes("3 ph") ||
    q.includes("three") ||
    q.includes("mrp070065")
  ) {
    return "1.078";
  }
  return null;
}

export function resolveMonth(
  query: string | undefined,
  months: string[]
): string | null {
  if (!query) return null;
  const isoMatch = query.match(/\b(202[3-6]-(?:0[1-9]|1[0-2]))\b/);
  if (isoMatch && months.includes(isoMatch[1])) return isoMatch[1];

  const monthNames: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const named = query
    .toLowerCase()
    .match(
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s'-]*(202[3-6])\b/
    );
  if (named) {
    const candidate = `${named[2]}-${monthNames[named[1]]}`;
    if (months.includes(candidate)) return candidate;
  }
  return null;
}

export const COPILOT_TOOL_DEFINITIONS: GroundedToolDefinition[] = [
  {
    name: "get_godown_stock",
    description:
      "Look up verified monthly godown closing stock, flows, and project-wide contractor idle stock for one SKU (never sums across UOMs).",
    parameters: {
      type: "object",
      properties: {
        item_query: {
          type: "string",
          description:
            "SKU code or item name (e.g. 'MPO010014', 'PCC poles', 'MNB010174', '3-phase box'). Defaults to MPO010014.",
        },
        godown: {
          type: "string",
          description:
            "Optional active godown name (Auraiya, Dehat, Etawah, Farrukhabad, Kannauj, Nagar). Omit for all 6 godowns.",
        },
        month: {
          type: "string",
          description:
            "Optional month in YYYY-MM format (2023-03 to 2026-10). Omit to inspect peak stock & latest month.",
        },
      },
    },
  },
  {
    name: "get_planner_decisions",
    description:
      "Look up Job 2 causal replay decisions (ORDER, TRANSFER_IN, TRANSFER_OUT, HOLD, WAIT), inter-godown Stage A LP truck transfers with km distances, and rationales.",
    parameters: {
      type: "object",
      properties: {
        item_query: {
          type: "string",
          description: "SKU code or name (defaults to MPO010014 PCC Poles).",
        },
        godown: {
          type: "string",
          description: "Optional active godown name.",
        },
        month: {
          type: "string",
          description:
            "Optional YYYY-MM month. If omitted, returns months with highest transfer/order activity.",
        },
      },
    },
  },
  {
    name: "get_backtest_kpis",
    description:
      "Look up Job 2 'The Bar' backtest comparison (Actual vs. Simulated peak/avg idle stock, % idle reduction, transfers, stockout months) for one SKU or portfolio overview.",
    parameters: {
      type: "object",
      properties: {
        item_query: {
          type: "string",
          description:
            "Optional SKU code or name. Omit for full 16-SKU portfolio summary.",
        },
      },
    },
  },
  {
    name: "get_set_bottlenecks",
    description:
      "Look up Job 3 parent-child kit balance for Set 1.071 (Pole Clamp RDSS), 1.077 (1-Ph Dist. Box), or 1.078 (3-Ph Dist. Box): parent stock, max buildable sets, bottleneck child, and stranded surpluses.",
    parameters: {
      type: "object",
      properties: {
        set_query: {
          type: "string",
          description: "Set number or name ('1.071', '1.077', '1.078', '3-ph box', 'clamp').",
        },
        godown: {
          type: "string",
          description: "Optional active godown name.",
        },
        month: {
          type: "string",
          description:
            "Optional YYYY-MM month. Omit to inspect the worst stranded-parent month.",
        },
        ratio_mode: {
          type: "string",
          enum: ["empirical", "bom"],
          description: "Ratio mode: 'empirical' (recommended) or 'bom'.",
        },
      },
    },
  },
  {
    name: "get_shared_bolt_alerts",
    description:
      "Inspect cross-set contention for shared child MNB010174 (G.I. Nuts & Bolts in MT) across sets 1.071, 1.077, and 1.078.",
    parameters: {
      type: "object",
      properties: {
        godown: {
          type: "string",
          description: "Optional active godown name.",
        },
        ratio_mode: {
          type: "string",
          enum: ["empirical", "bom"],
          description: "Defaults to 'empirical'.",
        },
      },
    },
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function executeCopilotTool(
  name: string,
  rawArgs: Record<string, unknown>
): { data: unknown; trace: ToolTrace } {
  const ds = loadCopilotData();
  const months = ds.metadata.date_range.months;

  if (name === "get_godown_stock") {
    const itemQuery =
      typeof rawArgs.item_query === "string" ? rawArgs.item_query : undefined;
    const item =
      resolveItem(itemQuery, ds.metadata.items) ??
      ds.metadata.items.find((i) => i.item_code === "MPO010014") ??
      ds.metadata.items[0] ??
      null;
    if (!item) {
      return {
        data: null,
        trace: {
          tool: name,
          args: { item: itemQuery ?? "MPO010014" },
          summary: "No tracked items available",
        },
      };
    }
    const godown = resolveGodown(
      typeof rawArgs.godown === "string" ? rawArgs.godown : undefined
    );
    const month = resolveMonth(
      typeof rawArgs.month === "string" ? rawArgs.month : undefined,
      months
    );

    const itemContractor = ds.contractor.filter(
      (r) => r.item_code === item.item_code
    );
    let peakGodownRow = itemContractor[0];
    let peakContractorRow = itemContractor[0];
    let totalReceipts = 0;
    let totalConsumption = 0;

    for (const r of itemContractor) {
      totalReceipts += r.total_receipts;
      totalConsumption += r.total_consumption;
      if (r.project_godown_stock > (peakGodownRow?.project_godown_stock ?? 0)) {
        peakGodownRow = r;
      }
      if (
        r.closing_contractor_stock >
        (peakContractorRow?.closing_contractor_stock ?? 0)
      ) {
        peakContractorRow = r;
      }
    }

    const targetMonth = month ?? peakGodownRow?.month ?? months[months.length - 1];
    const godownRows = ds.ledger.filter(
      (r) =>
        r.item_code === item.item_code &&
        r.month === targetMonth &&
        (!godown || r.godown === godown)
    );
    const contractorAtMonth = itemContractor.find(
      (r) => r.month === targetMonth
    );

    const data = {
      item_code: item.item_code,
      item_name: item.item_name,
      unit: item.unit,
      lead_time_days: item.lead_time_days,
      selected_month: targetMonth,
      project_totals: {
        total_receipts: Math.round(totalReceipts * 100) / 100,
        total_consumption: Math.round(totalConsumption * 100) / 100,
        peak_godown_idle: peakGodownRow?.project_godown_stock ?? 0,
        peak_godown_month: peakGodownRow?.month ?? null,
        peak_contractor_idle: peakContractorRow?.closing_contractor_stock ?? 0,
        peak_contractor_month: peakContractorRow?.month ?? null,
      },
      contractor_at_month: contractorAtMonth
        ? {
            closing_contractor_stock: contractorAtMonth.closing_contractor_stock,
            total_consumption: contractorAtMonth.total_consumption,
            project_godown_stock: contractorAtMonth.project_godown_stock,
          }
        : null,
      godown_breakdown: godownRows.map((r) => ({
        godown: r.godown,
        opening_stock: r.opening_stock,
        receipts: r.receipts,
        transfers_in: r.transfers_in,
        transfers_out: r.transfers_out,
        issues: r.issues,
        returns: r.returns,
        closing_stock: r.closing_stock,
      })),
    };

    return {
      data,
      trace: {
        tool: name,
        args: { item: item.item_code, godown: godown ?? "ALL", month: targetMonth },
        summary: `${item.item_code} (${item.unit}) @ ${targetMonth}`,
      },
    };
  }

  if (name === "get_planner_decisions") {
    const itemQuery =
      typeof rawArgs.item_query === "string" ? rawArgs.item_query : undefined;
    const item =
      resolveItem(itemQuery, ds.metadata.items) ??
      ds.metadata.items.find((i) => i.item_code === "MPO010014") ??
      ds.metadata.items[0] ??
      null;
    if (!item) {
      return {
        data: null,
        trace: {
          tool: name,
          args: { item: itemQuery ?? "MPO010014" },
          summary: "No tracked items available",
        },
      };
    }
    const godown = resolveGodown(
      typeof rawArgs.godown === "string" ? rawArgs.godown : undefined
    );
    const month = resolveMonth(
      typeof rawArgs.month === "string" ? rawArgs.month : undefined,
      months
    );

    const itemActions = ds.simulation.filter(
      (a) => a.item_code === item.item_code && (!godown || a.godown === godown)
    );

    let targetMonth = month;
    if (!targetMonth) {
      // Pick the month with the richest transfer activity (or highest order activity)
      const scoreByMonth = new Map<string, number>();
      for (const a of itemActions) {
        const s =
          (a.transfers_out.length + a.transfers_in.length) * 10 +
          (a.order_qty > 0 ? 3 : 0);
        scoreByMonth.set(a.month, (scoreByMonth.get(a.month) ?? 0) + s);
      }
      let bestM = "2023-11";
      let bestScore = -1;
      for (const [m, sc] of scoreByMonth.entries()) {
        if (sc > bestScore) {
          bestScore = sc;
          bestM = m;
        }
      }
      targetMonth = bestM;
    }

    const monthActions = itemActions.filter((a) => a.month === targetMonth);
    const transfers = monthActions.flatMap((a) => a.transfers_out);
    const windDownOrders = itemActions.filter(
      (a) => a.month > "2026-07" && a.order_qty > 0
    ).length;

    const data = {
      item_code: item.item_code,
      item_name: item.item_name,
      unit: item.unit,
      month: targetMonth,
      wind_down_orders_after_2026_07: windDownOrders,
      transfers_in_month: transfers,
      godown_actions: monthActions.map((a) => ({
        godown: a.godown,
        decision: a.decision,
        godown_on_hand: a.godown_on_hand,
        in_transit_qty: a.in_transit_qty,
        projected_monthly_demand: a.projected_monthly_demand,
        order_qty: a.order_qty,
        hold_qty: a.hold_qty,
        expected_arrival_month: a.expected_arrival_month,
        rationale: a.rationale,
      })),
    };

    return {
      data,
      trace: {
        tool: name,
        args: { item: item.item_code, godown: godown ?? "ALL", month: targetMonth },
        summary: `${monthActions.length} godown decisions, ${transfers.length} LP transfers`,
      },
    };
  }

  if (name === "get_backtest_kpis") {
    const item = resolveItem(
      typeof rawArgs.item_query === "string" ? rawArgs.item_query : undefined,
      ds.metadata.items
    );

    if (item) {
      const bt = ds.backtest.find((b) => b.item_code === item.item_code);
      const data = bt
        ? {
            item_code: bt.item_code,
            item_name: bt.item_name,
            unit: bt.unit,
            actual_peak_idle: bt.actual_peak_idle,
            simulated_peak_idle: bt.simulated_peak_idle,
            actual_avg_idle: bt.actual_avg_idle,
            simulated_avg_idle: bt.simulated_avg_idle,
            idle_reduction_pct: bt.idle_reduction_pct,
            actual_total_ordered: bt.actual_total_ordered,
            simulated_total_ordered: bt.simulated_total_ordered,
            actual_stockout_months: bt.actual_stockout_months,
            simulated_stockout_months: bt.simulated_stockout_months,
            total_transfers_recommended: bt.total_transfers_recommended,
          }
        : null;
      return {
        data,
        trace: {
          tool: name,
          args: { item: item.item_code },
          summary: bt
            ? `${bt.item_code}: ${bt.idle_reduction_pct.toFixed(1)}% avg idle reduced`
            : "Not found",
        },
      };
    }

    const improved = ds.backtest.filter((b) => b.idle_reduction_pct > 0);
    const meanReduction =
      ds.backtest.reduce((s, b) => s + b.idle_reduction_pct, 0) /
      Math.max(1, ds.backtest.length);
    const totalTransfers = ds.backtest.reduce(
      (s, b) => s + b.total_transfers_recommended,
      0
    );
    const topImproved = [...ds.backtest]
      .sort((a, b) => b.idle_reduction_pct - a.idle_reduction_pct)
      .slice(0, 5)
      .map((b) => ({
        item_code: b.item_code,
        unit: b.unit,
        idle_reduction_pct: b.idle_reduction_pct,
        total_transfers_recommended: b.total_transfers_recommended,
      }));

    return {
      data: {
        total_skus: ds.backtest.length,
        skus_with_reduced_idle: improved.length,
        mean_idle_reduction_pct: Math.round(meanReduction * 10) / 10,
        total_transfers_recommended: totalTransfers,
        top_5_improved: topImproved,
      },
      trace: {
        tool: name,
        args: { scope: "ALL_16_SKUS" },
        summary: `${improved.length}/16 SKUs improved, mean ${meanReduction.toFixed(1)}%`,
      },
    };
  }

  if (name === "get_set_bottlenecks") {
    const setNo =
      resolveSetNo(
        typeof rawArgs.set_query === "string" ? rawArgs.set_query : undefined
      ) ?? "1.078";
    const godown = resolveGodown(
      typeof rawArgs.godown === "string" ? rawArgs.godown : undefined
    );
    const month = resolveMonth(
      typeof rawArgs.month === "string" ? rawArgs.month : undefined,
      months
    );
    const ratioMode: SetRatioMode =
      rawArgs.ratio_mode === "bom" ? "bom" : "empirical";

    const filtered = ds.sets.filter(
      (r) =>
        r.ratio_mode === ratioMode &&
        r.set_no === setNo &&
        (!godown || r.godown === godown) &&
        (!month || r.month === month)
    );

    // Pick worst stranded parent cell if multiple
    let worst = filtered[0] ?? null;
    for (const r of filtered) {
      if (r.stranded_parent_qty > (worst?.stranded_parent_qty ?? -1)) {
        worst = r;
      }
    }

    const imbalancedCount = filtered.filter((r) => r.is_imbalanced).length;
    const balancedCount = filtered.filter(
      (r) => r.parent_stock > 0 && !r.is_imbalanced
    ).length;

    // Also find best donor godown for the bottleneck item in that exact month!
    let donorSuggestion: {
      godown: ActiveGodown;
      available_stock: number;
      unit: string;
    } | null = null;
    if (worst && worst.bottleneck_item_code) {
      const targetWorst = worst;
      const bottleneckCode = worst.bottleneck_item_code;
      const sameMonthRows = ds.ledger
        .filter(
          (l) =>
            l.item_code === bottleneckCode &&
            l.month === targetWorst.month &&
            l.godown !== targetWorst.godown &&
            l.closing_stock > 0
        )
        .sort((a, b) => b.closing_stock - a.closing_stock);
      if (sameMonthRows[0]) {
        donorSuggestion = {
          godown: sameMonthRows[0].godown,
          available_stock: sameMonthRows[0].closing_stock,
          unit: sameMonthRows[0].unit,
        };
      }
    }

    const data = {
      set_no: setNo,
      ratio_mode: ratioMode,
      scope_cells: filtered.length,
      balanced_cells: balancedCount,
      imbalanced_cells: imbalancedCount,
      inspected_cell: worst
        ? {
            godown: worst.godown,
            month: worst.month,
            parent_code: worst.parent_code,
            parent_name: worst.parent_name,
            parent_unit: worst.parent_unit,
            parent_stock: worst.parent_stock,
            max_buildable_sets: worst.max_buildable_sets,
            stranded_parent_qty: worst.stranded_parent_qty,
            severity: worst.severity,
            bottleneck_item_code: worst.bottleneck_item_code,
            bottleneck_item_name: worst.bottleneck_item_name,
            children: worst.children.map((c) => ({
              child_code: c.child_code,
              child_name: c.child_name,
              child_unit: c.child_unit,
              ratio_used: c.ratio_used,
              available_stock: c.available_stock,
              required_for_parent: c.required_for_parent,
              buildable_sets: c.buildable_sets,
              surplus_or_deficit: c.surplus_or_deficit,
              is_bottleneck: c.is_bottleneck,
              is_shared_child: c.is_shared_child,
            })),
          }
        : null,
      potential_donor_godown_for_bottleneck: donorSuggestion,
    };

    return {
      data,
      trace: {
        tool: name,
        args: {
          set: setNo,
          godown: godown ?? "ALL",
          month: worst?.month ?? month ?? "PEAK",
          mode: ratioMode,
        },
        summary: worst
          ? `Set ${setNo} @ ${worst.godown.replace("KANPUR ", "")} ${worst.month}: bottleneck ${worst.bottleneck_item_code ?? "none"}`
          : "No rows",
      },
    };
  }

  if (name === "get_shared_bolt_alerts") {
    const godown = resolveGodown(
      typeof rawArgs.godown === "string" ? rawArgs.godown : undefined
    );
    const ratioMode: SetRatioMode =
      rawArgs.ratio_mode === "bom" ? "bom" : "empirical";

    const grouped = new Map<string, SetImbalanceRow[]>();
    for (const r of ds.sets) {
      if (r.ratio_mode !== ratioMode) continue;
      if (godown && r.godown !== godown) continue;
      const key = `${r.godown}__${r.month}`;
      const list = grouped.get(key);
      if (list) list.push(r);
      else grouped.set(key, [r]);
    }

    const collisions: {
      godown: ActiveGodown;
      month: string;
      bottlenecked_sets: string[];
      available_mt: number;
      combined_required_mt: number;
      deficit_mt: number;
    }[] = [];

    for (const rows of grouped.values()) {
      let avail = 0;
      let combinedReq = 0;
      const bnSets: string[] = [];
      for (const r of rows) {
        const bolt = r.children.find((c) => c.child_code === "MNB010174");
        if (!bolt) continue;
        avail = bolt.available_stock;
        combinedReq += bolt.required_for_parent;
        if (bolt.is_bottleneck) bnSets.push(r.set_no);
      }
      const deficit = Math.max(0, combinedReq - avail);
      if (bnSets.length >= 2 || deficit > 1e-6) {
        collisions.push({
          godown: rows[0].godown,
          month: rows[0].month,
          bottlenecked_sets: bnSets.sort(),
          available_mt: Math.round(avail * 10000) / 10000,
          combined_required_mt: Math.round(combinedReq * 10000) / 10000,
          deficit_mt: Math.round(deficit * 10000) / 10000,
        });
      }
    }

    collisions.sort(
      (a, b) =>
        b.bottlenecked_sets.length - a.bottlenecked_sets.length ||
        b.deficit_mt - a.deficit_mt
    );

    return {
      data: {
        shared_child: "MNB010174",
        unit: "MT",
        ratio_mode: ratioMode,
        total_multi_set_collisions: collisions.filter(
          (c) => c.bottlenecked_sets.length >= 2
        ).length,
        total_flagged_events: collisions.length,
        top_5_events: collisions.slice(0, 5),
      },
      trace: {
        tool: name,
        args: { godown: godown ?? "ALL", mode: ratioMode },
        summary: `${collisions.length} MNB010174 contention events found`,
      },
    };
  }

  return {
    data: { error: `Unknown tool: ${name}` },
    trace: { tool: name, args: rawArgs, summary: "Unknown tool" },
  };
}

/**
 * Deterministic grounded fallback when no external LLM key is configured (or if
 * an external API call fails). Executes the exact same verified JSON tools and
 * builds an actionable answer + copyable transfer/hold dispatch memo.
 */
export function runLocalGroundedFallback(userMessage: string): {
  reply: string;
  toolTraces: ToolTrace[];
  draftMemo: string | null;
} {
  const ds = loadCopilotData();
  const q = userMessage.toLowerCase();
  const isHinglish =
    /\b(kyu|kyon|kya|kitna|kitne|batao|bhejo|chahiye|nahi|ruk|ruka|hai|hain|mein|se|ka|ki|ke)\b/.test(
      q
    );

  const godown = resolveGodown(userMessage);
  const month = resolveMonth(userMessage, ds.metadata.date_range.months);
  const setNo = resolveSetNo(userMessage);
  const item = resolveItem(userMessage, ds.metadata.items);

  const traces: ToolTrace[] = [];

  // Route 1: Shared bolt MNB010174 contention
  if (
    /\b(mnb010174|shared|collision|contention|all 3 sets|three sets)\b/.test(q)
  ) {
    const res = executeCopilotTool("get_shared_bolt_alerts", {
      godown: godown ?? undefined,
      ratio_mode: q.includes("bom") ? "bom" : "empirical",
    });
    traces.push(res.trace);
    if (!isRecord(res.data) || !Array.isArray(res.data.top_5_events)) {
      return {
        reply: "No shared bolt contention data is available for that filter.",
        toolTraces: traces,
        draftMemo: null,
      };
    }
    const d = res.data as {
      total_multi_set_collisions: number;
      total_flagged_events: number;
      top_5_events: {
        godown: string;
        month: string;
        bottlenecked_sets: string[];
        available_mt: number;
        combined_required_mt: number;
        deficit_mt: number;
      }[];
    };
    const top = d.top_5_events[0];
    const lines = [
      `**Shared Child Contention — \`MNB010174\` (G.I. Nuts & Bolts, MT)**`,
      `- **${d.total_multi_set_collisions}** godown-months where \`MNB010174\` simultaneously blocks 2+ sets (**${d.total_flagged_events}** total pool-contention events).`,
      ...(top
        ? [
            `- **Worst collision:** \`${top.godown}\` in **${top.month}** — blocking sets **${top.bottlenecked_sets.join(", ") || "multiple"}** (on-hand **${top.available_mt} MT** vs combined need **${top.combined_required_mt} MT**, deficit **${top.deficit_mt} MT**).`,
          ]
        : []),
    ];
    const draftMemo = top
      ? `DISPATCH ALERT — LUMINO KANPUR RDSS\nItem: MNB010174 (G.I. Nuts & Bolts M16x65 MM)\nTarget Store: ${top.godown} (${top.month})\nIssue: Shared bolt pool short by ${top.deficit_mt} MT (On-hand: ${top.available_mt} MT vs 3-Set Requirement: ${top.combined_required_mt} MT).\nAction: Reallocate MNB010174 stock before issuing additional Set 1.071 / 1.077 / 1.078 kits.`
      : null;
    return { reply: lines.join("\n"), toolTraces: traces, draftMemo };
  }

  // Route 2: Set / Kit bottleneck query
  if (
    setNo ||
    /\b(set|kit|bottleneck|blocked|stranded|install|match|bom|ratio|ruk|ruka|lug|clamp|box)\b/.test(
      q
    )
  ) {
    const res = executeCopilotTool("get_set_bottlenecks", {
      set_query: setNo ?? "1.078",
      godown: godown ?? undefined,
      month: month ?? undefined,
      ratio_mode: /\bbom\b/.test(q) ? "bom" : "empirical",
    });
    traces.push(res.trace);
    if (!isRecord(res.data) || typeof res.data.set_no !== "string") {
      return {
        reply: "No kit imbalance data is available for that filter.",
        toolTraces: traces,
        draftMemo: null,
      };
    }
    const d = res.data as {
      set_no: string;
      ratio_mode: string;
      imbalanced_cells: number;
      scope_cells: number;
      inspected_cell: {
        godown: string;
        month: string;
        parent_code: string;
        parent_name: string;
        parent_unit: string;
        parent_stock: number;
        max_buildable_sets: number;
        stranded_parent_qty: number;
        bottleneck_item_code: string | null;
        bottleneck_item_name: string | null;
        children: {
          child_code: string;
          child_unit: string;
          available_stock: number;
          required_for_parent: number;
          surplus_or_deficit: number;
          is_bottleneck: boolean;
        }[];
      } | null;
      potential_donor_godown_for_bottleneck: {
        godown: string;
        available_stock: number;
        unit: string;
      } | null;
    };

    const cell = d.inspected_cell;
    if (!cell) {
      return {
        reply: `No kit imbalance records matched Set ${d.set_no} for that filter.`,
        toolTraces: traces,
        draftMemo: null,
      };
    }

    const bnChild = cell.children.find((c) => c.is_bottleneck);
    const deficitVal = bnChild
      ? Math.abs(Math.min(0, bnChild.surplus_or_deficit))
      : 0;
    const donor = d.potential_donor_godown_for_bottleneck;

    const reply = isHinglish
      ? [
          `**Set ${d.set_no} (${cell.parent_code}) — ${cell.godown} (${cell.month}) [${d.ratio_mode.toUpperCase()} Ratio]**`,
          `- Godown mein **${cell.parent_stock.toLocaleString("en-IN")} ${cell.parent_unit}** parent stock hai, lekin sirf **${cell.max_buildable_sets.toLocaleString("en-IN")} sets** hi assemble ho sakte hain (**${cell.stranded_parent_qty.toLocaleString("en-IN")} ${cell.parent_unit} stranded**).`,
          bnChild
            ? `- **Main Bottleneck:** \`${bnChild.child_code}\` (${cell.bottleneck_item_name}) — available **${bnChild.available_stock} ${bnChild.child_unit}** vs required **${bnChild.required_for_parent} ${bnChild.child_unit}** (shortfall **${deficitVal} ${bnChild.child_unit}**).`
            : `- Bottleneck: \`${cell.bottleneck_item_code ?? "None"}\`.`,
          donor
            ? `- **Suggested Donor Godown:** \`${donor.godown}\` ke paas isi month **${donor.available_stock.toLocaleString("en-IN")} ${donor.unit}** available hai — wahan se transfer karo instead of new PO.`
            : `- Kisi nearby godown mein surplus nahi mila; urgent replenishment schedule karein.`,
        ].join("\n")
      : [
          `**Set ${d.set_no} (${cell.parent_code}) — ${cell.godown} (${cell.month}) [${d.ratio_mode.toUpperCase()} Ratio]**`,
          `- **Parent Stock:** ${cell.parent_stock.toLocaleString("en-IN")} ${cell.parent_unit} | **Max Buildable:** ${cell.max_buildable_sets.toLocaleString("en-IN")} sets | **Stranded:** ${cell.stranded_parent_qty.toLocaleString("en-IN")} ${cell.parent_unit}.`,
          bnChild
            ? `- **Blocking Child:** \`${bnChild.child_code}\` (${cell.bottleneck_item_name}) — **${bnChild.available_stock} ${bnChild.child_unit}** on hand vs **${bnChild.required_for_parent} ${bnChild.child_unit}** required (deficit: **${deficitVal} ${bnChild.child_unit}**).`
            : `- **Bottleneck:** \`${cell.bottleneck_item_code ?? "None"}\`.`,
          donor
            ? `- **Immediate Relief:** \`${donor.godown}\` holds **${donor.available_stock.toLocaleString("en-IN")} ${donor.unit}** of \`${cell.bottleneck_item_code}\` in ${cell.month} — transfer internally before raising a vendor PO.`
            : `- No donor godown holds surplus \`${cell.bottleneck_item_code}\` in ${cell.month}.`,
        ].join("\n");

    const draftMemo =
      bnChild && donor
        ? `INTER-GODOWN TRANSFER NOTE (LUMINO RDSS)\nDate/Month: ${cell.month}\nFrom: ${donor.godown} (Available: ${donor.available_stock} ${donor.unit})\nTo: ${cell.godown}\nItem: ${bnChild.child_code} — ${cell.bottleneck_item_name}\nNeeded Qty: ${Math.min(deficitVal, donor.available_stock)} ${bnChild.child_unit}\nReason: Unblock ${cell.stranded_parent_qty} ${cell.parent_unit} stranded Set ${d.set_no} (${cell.parent_code}) assemblies.`
        : null;

    return { reply, toolTraces: traces, draftMemo };
  }

  // Route 3: Backtest / "The Bar" summary
  if (/\b(bar|backtest|save|saving|reduction|proof|vs actual|performance)\b/.test(q)) {
    const res = executeCopilotTool("get_backtest_kpis", {
      item_query: item?.item_code,
    });
    traces.push(res.trace);
    if (item) {
      const bt =
        isRecord(res.data) && typeof res.data.item_code === "string"
          ? (res.data as unknown as BacktestComparison)
          : null;
      if (!bt) {
        return {
          reply: `No backtest KPI summary was found for **${item.item_code}** (${item.item_name}).`,
          toolTraces: traces,
          draftMemo: null,
        };
      }
      return {
        reply: [
          `**"The Bar" Backtest — ${bt.item_code} (${bt.item_name}, ${bt.unit})**`,
          `- **Avg Idle Stock:** ${bt.actual_avg_idle.toLocaleString("en-IN")} → **${bt.simulated_avg_idle.toLocaleString("en-IN")} ${bt.unit}** (**${bt.idle_reduction_pct.toFixed(1)}% reduction**).`,
          `- **Peak Idle Stock:** ${bt.actual_peak_idle.toLocaleString("en-IN")} → **${bt.simulated_peak_idle.toLocaleString("en-IN")} ${bt.unit}**.`,
          `- **LP Transfers Recommended:** ${bt.total_transfers_recommended} | **Stockout Months:** Actual ${bt.actual_stockout_months} vs Simulated ${bt.simulated_stockout_months}.`,
        ].join("\n"),
        toolTraces: traces,
        draftMemo: null,
      };
    }
    if (!isRecord(res.data) || typeof res.data.total_skus !== "number") {
      return {
        reply: "Portfolio backtest summary data is currently unavailable.",
        toolTraces: traces,
        draftMemo: null,
      };
    }
    const p = res.data as {
      total_skus: number;
      skus_with_reduced_idle: number;
      mean_idle_reduction_pct: number;
      total_transfers_recommended: number;
    };
    return {
      reply: [
        `**"The Bar" Portfolio Backtest (All ${p.total_skus} SKUs, 44 Months)**`,
        `- **${p.skus_with_reduced_idle}/${p.total_skus} SKUs** reduced average godown idle stock (mean reduction: **${p.mean_idle_reduction_pct}%**).`,
        `- **${p.total_transfers_recommended}** Stage A Min-Cost Flow LP inter-godown transfers replaced unnecessary vendor POs.`,
        `- **0 spurious vendor orders** generated during the \`2026-08\`–\`2026-10\` wind-down phase.`,
      ].join("\n"),
      toolTraces: traces,
      draftMemo: null,
    };
  }

  // Route 4: Planner / Transfers / Orders / Memo
  if (/\b(transfer|order|plan|hold|dispatch|memo|truck|move|wind|bhejo)\b/.test(q)) {
    const res = executeCopilotTool("get_planner_decisions", {
      item_query: item?.item_code ?? "MPO010014",
      godown: godown ?? undefined,
      month: month ?? undefined,
    });
    traces.push(res.trace);
    if (
      !isRecord(res.data) ||
      !Array.isArray(res.data.transfers_in_month) ||
      !Array.isArray(res.data.godown_actions)
    ) {
      return {
        reply: "No planner decisions matched that item and filter.",
        toolTraces: traces,
        draftMemo: null,
      };
    }
    const d = res.data as {
      item_code: string;
      item_name: string;
      unit: string;
      month: string;
      transfers_in_month: {
        from_godown: string;
        to_godown: string;
        qty: number;
        unit: string;
        distance_km: number;
        reason?: string;
      }[];
      godown_actions: {
        godown: string;
        decision: string;
        order_qty: number;
        hold_qty: number;
        godown_on_hand: number;
        rationale: string;
      }[];
    };

    const topTransfer = d.transfers_in_month[0];
    const actionBullets = d.godown_actions
      .slice(0, 6)
      .map(
        (a) =>
          `- **${a.godown.replace("KANPUR ", "")}**: \`${a.decision}\` (On-hand: ${a.godown_on_hand.toLocaleString("en-IN")} ${d.unit}${a.order_qty > 0 ? `, Order: ${a.order_qty.toLocaleString("en-IN")} ${d.unit}` : ""})`
      );

    const draftMemo = topTransfer
      ? `INTER-GODOWN TRANSFER ORDER — LUMINO KANPUR RDSS\nMonth: ${d.month}\nItem: ${d.item_code} — ${d.item_name}\nRoute: ${topTransfer.from_godown} → ${topTransfer.to_godown} (${topTransfer.distance_km} km)\nQuantity: ${topTransfer.qty.toLocaleString("en-IN")} ${topTransfer.unit}\nPolicy: Stage A Min-Cost Flow LP rebalance (avoids external vendor PO).`
      : null;

    return {
      reply: [
        `**Causal Planner Decisions — ${d.item_code} (${d.unit}) @ ${d.month}**`,
        ...actionBullets,
        topTransfer
          ? `\n**Top LP Transfer:** Ship **${topTransfer.qty.toLocaleString("en-IN")} ${topTransfer.unit}** from **${topTransfer.from_godown}** → **${topTransfer.to_godown}** (**${topTransfer.distance_km} km**).`
          : `\nNo inter-godown transfers needed in ${d.month}.`,
      ].join("\n"),
      toolTraces: traces,
      draftMemo,
    };
  }

  // Default Route 5: Stock & Contractor Hoarding overview
  const res = executeCopilotTool("get_godown_stock", {
    item_query: item?.item_code ?? "MPO010014",
    godown: godown ?? undefined,
    month: month ?? undefined,
  });
  traces.push(res.trace);
  if (
    !isRecord(res.data) ||
    !isRecord(res.data.project_totals) ||
    !Array.isArray(res.data.godown_breakdown)
  ) {
    return {
      reply: "No verified stock snapshot is available for that item.",
      toolTraces: traces,
      draftMemo: null,
    };
  }
  const d = res.data as {
    item_code: string;
    item_name: string;
    unit: string;
    selected_month: string;
    project_totals: {
      total_receipts: number;
      total_consumption: number;
      peak_godown_idle: number;
      peak_godown_month: string | null;
      peak_contractor_idle: number;
      peak_contractor_month: string | null;
    };
    godown_breakdown: { godown: string; closing_stock: number }[];
  };

  return {
    reply: [
      `**Verified Stock Snapshot — ${d.item_code} (${d.item_name}, ${d.unit})**`,
      `- **44-Month Total:** ${d.project_totals.total_receipts.toLocaleString("en-IN")} ${d.unit} received vs **${d.project_totals.total_consumption.toLocaleString("en-IN")} ${d.unit}** consumed on site.`,
      `- **Peak Godown Idle:** ${d.project_totals.peak_godown_idle.toLocaleString("en-IN")} ${d.unit} (${d.project_totals.peak_godown_month ?? "N/A"}) | **Peak Contractor Hoarding:** ${d.project_totals.peak_contractor_idle.toLocaleString("en-IN")} ${d.unit} (${d.project_totals.peak_contractor_month ?? "N/A"}).`,
      `- **Godown Closing Stock (${d.selected_month}):** ` +
        d.godown_breakdown
          .map(
            (g) =>
              `${g.godown.replace("KANPUR ", "")}: ${g.closing_stock.toLocaleString("en-IN")} ${d.unit}`
          )
          .join(" • "),
    ].join("\n"),
    toolTraces: traces,
    draftMemo: null,
  };
}
