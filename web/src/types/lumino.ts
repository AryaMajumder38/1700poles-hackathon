/**
 * LOCKED SHARED CONTRACTS — Owned exclusively by Track A (Arya).
 * Tracks B, C, and D MUST treat this file as READ-ONLY.
 */

export type ItemRole = "Independent" | "Parent" | "Child";

export type ItemUnit = "PCS" | "NOS" | "SET" | "KG" | "MT" | "KM" | "MTR";

export type ActiveGodown =
  | "KANPUR AURAIYA"
  | "KANPUR DEHAT"
  | "KANPUR ETAWAH"
  | "KANPUR FARRUKHABAD"
  | "KANPUR KANNAUJ"
  | "KANPUR NAGAR";

export interface ItemMaster {
  item_code: string;
  item_name: string;
  unit: ItemUnit;
  lead_time_days: number;
  role: ItemRole;
}

export interface SetChildRequirement {
  child_code: string;
  child_name: string;
  child_unit: ItemUnit;
  ratio_of_parent: number;
}

export interface SetDefinition {
  set_no: string;
  parent_code: string;
  parent_name: string;
  parent_unit: ItemUnit;
  children: SetChildRequirement[];
}

export interface DateRangeMeta {
  start: string; // "2023-03"
  end: string; // "2026-10"
  receipts_end: string; // "2026-07"
  total_months: number; // 44
  months: string[];
}

export interface MetadataPayload {
  generated_at: string;
  date_range: DateRangeMeta;
  godowns: ActiveGodown[];
  items: ItemMaster[];
  sets: SetDefinition[];
}

/**
 * Job 1 ("See It") — Monthly Godown Ledger Row (6 godowns x 16 items x 44 months = 4,224 rows).
 * closing_stock = max(0, opening_stock + receipts + transfers_in - transfers_out - issues + returns)
 */
export interface MonthlyLedgerRow {
  month: string; // "YYYY-MM"
  godown: ActiveGodown;
  item_code: string;
  item_name: string;
  unit: ItemUnit;
  opening_stock: number;
  receipts: number;
  transfers_in: number;
  transfers_out: number;
  issues: number;
  returns: number;
  net_flow: number;
  closing_stock: number;
}

/**
 * Job 1 ("See It") — Project-Wide Contractor Stock Row (16 items x 44 months = 704 rows).
 * CONSUMPTION has no godown attribution; contractor idle stock is strictly project-wide.
 * closing_contractor_stock = max(0, opening_contractor_stock + total_issues - total_returns - total_consumption)
 */
export interface ContractorStockRow {
  month: string; // "YYYY-MM"
  item_code: string;
  item_name: string;
  unit: ItemUnit;
  opening_contractor_stock: number;
  total_receipts: number;
  total_issues: number;
  total_returns: number;
  total_consumption: number;
  net_contractor_flow: number;
  closing_contractor_stock: number;
  project_godown_stock: number;
  total_project_idle_stock: number;
}

/**
 * Job 2 ("Plan It") — Inter-godown transfer instruction (Stage A optimizer).
 */
export interface TransferDetail {
  from_godown: ActiveGodown;
  to_godown: ActiveGodown;
  item_code: string;
  unit: ItemUnit;
  qty: number;
  distance_km: number;
  reason?: string;
}

export type SimulationDecision =
  | "ORDER"
  | "HOLD"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "WAIT";

/**
 * Job 2 ("Plan It") — Causal monthly replay action per godown & item (zero lookahead).
 */
export interface SimulationAction {
  month: string; // "YYYY-MM"
  godown: ActiveGodown;
  item_code: string;
  item_name: string;
  unit: ItemUnit;
  decision: SimulationDecision;
  order_qty: number;
  hold_qty: number;
  transfers_in: TransferDetail[];
  transfers_out: TransferDetail[];
  projected_monthly_demand: number;
  godown_on_hand: number;
  in_transit_qty: number;
  contractor_idle_stock: number;
  lead_time_days: number;
  expected_arrival_month: string | null;
  rationale: string;
}

export interface BacktestMonthlyPoint {
  month: string;
  actual_idle_stock: number;
  simulated_idle_stock: number;
  actual_receipts: number;
  simulated_receipts: number;
  actual_consumption: number;
}

/**
 * Job 2 ("Plan It") — Actual vs. Simulated Replay Backtest Comparison ("The Bar").
 */
export interface BacktestComparison {
  item_code: string;
  item_name: string;
  unit: ItemUnit;
  actual_peak_idle: number;
  simulated_peak_idle: number;
  actual_avg_idle: number;
  simulated_avg_idle: number;
  idle_reduction_pct: number;
  actual_total_ordered: number;
  simulated_total_ordered: number;
  actual_stockout_months: number;
  simulated_stockout_months: number;
  total_transfers_recommended: number;
  monthly_series: BacktestMonthlyPoint[];
}

export type SetRatioMode = "bom" | "empirical";

export type ImbalanceSeverity = "ok" | "warning" | "critical";

export interface SetChildImbalance {
  child_code: string;
  child_name: string;
  child_unit: ItemUnit;
  ratio_used: number;
  available_stock: number;
  required_for_parent: number;
  buildable_sets: number;
  surplus_or_deficit: number;
  is_shared_child: boolean;
  is_bottleneck: boolean;
}

/**
 * Job 3 ("Match Sets") — Parent-child kit balance evaluation per set, godown, month, and ratio mode.
 */
export interface SetImbalanceRow {
  month: string; // "YYYY-MM"
  godown: ActiveGodown;
  set_no: string;
  parent_code: string;
  parent_name: string;
  parent_unit: ItemUnit;
  ratio_mode: SetRatioMode;
  parent_stock: number;
  max_buildable_sets: number;
  stranded_parent_qty: number;
  is_imbalanced: boolean;
  severity: ImbalanceSeverity;
  bottleneck_item_code: string | null;
  bottleneck_item_name: string | null;
  children: SetChildImbalance[];
}
