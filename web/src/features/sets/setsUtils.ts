import type {
  ActiveGodown,
  ItemUnit,
  SetChildImbalance,
  SetImbalanceRow,
} from "@/types/lumino";

export const SHARED_BOLT_CODE = "MNB010174";
export const WIND_DOWN_START = "2026-08";

export const ACTIVE_GODOWNS: readonly ActiveGodown[] = [
  "KANPUR AURAIYA",
  "KANPUR DEHAT",
  "KANPUR ETAWAH",
  "KANPUR FARRUKHABAD",
  "KANPUR KANNAUJ",
  "KANPUR NAGAR",
];

export function isActiveGodown(
  value: string | null | undefined
): value is ActiveGodown {
  return (
    typeof value === "string" &&
    ACTIVE_GODOWNS.some((godown) => godown === value)
  );
}

export type CellVisualStatus = "zero" | "balanced" | "warning" | "critical";

export function isZeroStockRow(row: SetImbalanceRow): boolean {
  return (
    row.parent_stock <= 0 &&
    row.children.every((child) => child.available_stock <= 0)
  );
}

export function isChildOnlyStrandedRow(row: SetImbalanceRow): boolean {
  return (
    row.parent_stock <= 0 &&
    row.children.some((child) => child.available_stock > 0)
  );
}

export function getCellVisualStatus(row: SetImbalanceRow): CellVisualStatus {
  if (isZeroStockRow(row)) return "zero";
  if (!row.is_imbalanced) return "balanced";
  if (row.severity === "critical") return "critical";
  return "warning";
}

/**
 * Stranded child surplus = stock of child c sitting unused after building as many
 * complete kits as possible (min(parent_stock, max_buildable_sets)).
 */
export function computeStrandedChildSurplus(
  row: SetImbalanceRow,
  child: SetChildImbalance
): number {
  const usableSets = Math.min(row.parent_stock, row.max_buildable_sets);
  const consumedForUsable = usableSets * child.ratio_used;
  return Math.max(0, child.available_stock - consumedForUsable);
}

export function formatQty(value: number, unit: ItemUnit): string {
  const abs = Math.abs(value);
  const maxFractionDigits =
    unit === "MT" ? 4 : unit === "KG" ? 2 : abs > 0 && abs < 10 ? 2 : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
  return `${formatted} ${unit}`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatRatio(ratio: number, unit: ItemUnit): string {
  if (unit === "MT" || (ratio > 0 && ratio < 0.01)) {
    return ratio.toFixed(6);
  }
  if (Number.isInteger(ratio)) {
    return ratio.toFixed(2);
  }
  return ratio.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function shortGodown(godown: ActiveGodown): string {
  return godown.replace(/^KANPUR\s+/i, "");
}

export function shortSetLabel(setNo: string): string {
  switch (setNo) {
    case "1.071":
      return "Pole Clamp RDSS";
    case "1.077":
      return "1-Ph Dist. Box";
    case "1.078":
      return "3-Ph Dist. Box";
    default:
      return `Set ${setNo}`;
  }
}

export interface SharedCollisionEvent {
  godown: ActiveGodown;
  month: string;
  availableMt: number;
  combinedRequiredMt: number;
  deficitMt: number;
  bottleneckedSets: string[];
  affectedSets: {
    set_no: string;
    parent_stock: number;
    parent_unit: ItemUnit;
    required_mt: number;
    is_bottleneck: boolean;
    stranded_parent_qty: number;
  }[];
}

/**
 * Aggregates godown-months where shared child MNB010174 (G.I. Nuts & Bolts, MT)
 * either simultaneously bottlenecks 2+ sets or faces combined cross-set MT demand
 * exceeding available godown MT stock.
 */
export function computeSharedChildCollisions(
  rowsForMode: SetImbalanceRow[]
): SharedCollisionEvent[] {
  const grouped = new Map<string, SetImbalanceRow[]>();
  for (const row of rowsForMode) {
    const key = `${row.godown}__${row.month}`;
    const list = grouped.get(key);
    if (list) {
      list.push(row);
    } else {
      grouped.set(key, [row]);
    }
  }

  const events: SharedCollisionEvent[] = [];

  for (const groupRows of grouped.values()) {
    let availableMt = 0;
    let combinedRequiredMt = 0;
    const bottleneckedSets: string[] = [];
    const affectedSets: SharedCollisionEvent["affectedSets"] = [];

    for (const row of groupRows) {
      const boltChild = row.children.find(
        (c) => c.child_code === SHARED_BOLT_CODE
      );
      if (!boltChild) continue;
      availableMt = boltChild.available_stock;
      combinedRequiredMt += boltChild.required_for_parent;
      if (boltChild.is_bottleneck) {
        bottleneckedSets.push(row.set_no);
      }
      if (row.parent_stock > 0) {
        affectedSets.push({
          set_no: row.set_no,
          parent_stock: row.parent_stock,
          parent_unit: row.parent_unit,
          required_mt: boltChild.required_for_parent,
          is_bottleneck: boltChild.is_bottleneck,
          stranded_parent_qty: row.stranded_parent_qty,
        });
      }
    }

    const deficitMt = Math.max(0, combinedRequiredMt - availableMt);
    const hasMultiSetCollision = bottleneckedSets.length >= 2;
    const hasCombinedContention = affectedSets.length >= 2 && deficitMt > 1e-6;

    if (hasMultiSetCollision || hasCombinedContention) {
      const first = groupRows[0];
      events.push({
        godown: first.godown,
        month: first.month,
        availableMt,
        combinedRequiredMt,
        deficitMt,
        bottleneckedSets: bottleneckedSets.sort(),
        affectedSets: affectedSets.sort((a, b) =>
          a.set_no.localeCompare(b.set_no)
        ),
      });
    }
  }

  // Sort most severe first: 3-set collisions, then 2-set collisions, then largest MT deficit
  events.sort((a, b) => {
    if (b.bottleneckedSets.length !== a.bottleneckedSets.length) {
      return b.bottleneckedSets.length - a.bottleneckedSets.length;
    }
    if (Math.abs(b.deficitMt - a.deficitMt) > 1e-6) {
      return b.deficitMt - a.deficitMt;
    }
    return b.month.localeCompare(a.month);
  });

  return events;
}
