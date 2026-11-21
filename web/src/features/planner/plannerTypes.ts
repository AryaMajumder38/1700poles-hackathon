import type {
  ActiveGodown,
  BacktestComparison,
  BacktestMonthlyPoint,
  ItemUnit,
  SimulationAction,
  TransferDetail,
} from "@/types/lumino";

export interface PlannerMonthlyPoint extends BacktestMonthlyPoint {
  simulated_shortage_qty?: number;
  stockout_godowns?: ActiveGodown[];
}

export interface PlannerBacktestComparison
  extends Omit<BacktestComparison, "monthly_series"> {
  total_shortage_qty?: number;
  shortage_rate_pct?: number;
  total_transfer_qty?: number;
  total_transfer_km?: number;
  estimated_km_saved?: number;
  monthly_series: PlannerMonthlyPoint[];
}

export interface TransferRouteRow extends TransferDetail {
  month: string;
  transit_days: number;
  km_saved: number;
}

export const FLAGSHIP_ITEM_CODE = "MPO010014";
export const BASELINE_VENDOR_HAUL_KM = 260;

export function getTransitDays(distanceKm: number): number {
  return distanceKm <= 100 ? 1 : 2;
}

export function shortGodownName(godown: string): string {
  return godown.replace(/^KANPUR\s+/i, "");
}

export function formatQty(value: number, unit: ItemUnit): string {
  if (!Number.isFinite(value)) return `0 ${unit}`;
  const maxFrac = unit === "MT" ? 3 : unit === "KM" || unit === "KG" ? 1 : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: unit === "MT" && value > 0 && value < 1 ? 2 : 0,
  }).format(value);
  return `${formatted} ${unit}`;
}

export function formatPlainNumber(value: number, maxFrac = 0): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: maxFrac,
  }).format(value);
}

export function collectTransfersFromActions(
  actions: SimulationAction[]
): TransferRouteRow[] {
  const routes: TransferRouteRow[] = [];
  for (const act of actions) {
    for (const tr of act.transfers_out) {
      routes.push({
        ...tr,
        month: act.month,
        transit_days: getTransitDays(tr.distance_km),
        km_saved: Math.max(0, BASELINE_VENDOR_HAUL_KM - tr.distance_km),
      });
    }
  }
  return routes;
}
