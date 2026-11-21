"""
Track D — Job 3 ("Match Sets"): Lumino Industries Parent-Child Kit Imbalance Analyzer.

Reads pre-aggregated Track A JSON artifacts:
  - /web/public/data/metadata.json
  - /web/public/data/ledger_monthly.json
  - /web/public/data/contractor_stock.json

Computes kit balance and bottleneck diagnostics for every:
  - ratio_mode in ("empirical", "bom")
  - set in (1.071, 1.077, 1.078)
  - active godown (6 Kanpur godowns ONLY; excludes KANPUR CLOSER)
  - month in 2023-03..2026-10 (44 months)

Outputs /web/public/data/sets_imbalance.json conforming strictly to SetImbalanceRow[]
defined in /web/src/types/lumino.ts.
"""

from __future__ import annotations

import json
import math
import time
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "web" / "public" / "data"

METADATA_PATH = DATA_DIR / "metadata.json"
LEDGER_PATH = DATA_DIR / "ledger_monthly.json"
CONTRACTOR_PATH = DATA_DIR / "contractor_stock.json"
OUTPUT_PATH = DATA_DIR / "sets_imbalance.json"

EPSILON = 1e-9


def round4(val: float) -> float:
    return round(float(val), 4)


def round6(val: float) -> float:
    return round(float(val), 6)


def compute_empirical_ratios(
    sets_defs: list[dict[str, Any]],
    contractor_rows: list[dict[str, Any]],
) -> tuple[dict[tuple[str, str], float], set[str], dict[str, float]]:
    """
    Derive empirical site consumption ratios from cumulative consumption in contractor_stock.json.

    - For an exclusive child c of set S (parent p):
        empirical_ratio(c, S) = sum(CONSUMPTION(c)) / sum(CONSUMPTION(p))

    - For a shared child c appearing in multiple sets (e.g., MNB010174 in MT across 1.071, 1.077, 1.078):
        Allocate cumulative consumption proportionally to BOM weight (bom_ratio(c, S) * sum(CONSUMPTION(p_S)))
        so that:
          sum_{S containing c} empirical_ratio(c, S) * sum(CONSUMPTION(p_S)) == sum(CONSUMPTION(c))
        preserving total observed mass and relative BOM scaling across sets.
    """
    total_consumption: dict[str, float] = {}
    for row in contractor_rows:
        code = str(row["item_code"])
        total_consumption[code] = total_consumption.get(code, 0.0) + float(
            row.get("total_consumption", 0.0)
        )

    child_memberships: dict[str, list[tuple[str, str, float]]] = {}
    for set_def in sets_defs:
        set_no = str(set_def["set_no"])
        parent_code = str(set_def["parent_code"])
        for child in set_def["children"]:
            child_code = str(child["child_code"])
            bom_ratio = float(child["ratio_of_parent"])
            child_memberships.setdefault(child_code, []).append(
                (set_no, parent_code, bom_ratio)
            )

    shared_children = {
        code for code, memberships in child_memberships.items() if len(memberships) > 1
    }

    empirical_ratios: dict[tuple[str, str], float] = {}
    for set_def in sets_defs:
        set_no = str(set_def["set_no"])
        parent_code = str(set_def["parent_code"])
        parent_cons = total_consumption.get(parent_code, 0.0)

        for child in set_def["children"]:
            child_code = str(child["child_code"])
            bom_ratio = float(child["ratio_of_parent"])
            child_cons = total_consumption.get(child_code, 0.0)

            if child_code in shared_children:
                weighted_parent_sum = sum(
                    r * total_consumption.get(p_code, 0.0)
                    for _, p_code, r in child_memberships[child_code]
                )
                if weighted_parent_sum > 0 and child_cons > 0:
                    scale_factor = child_cons / weighted_parent_sum
                    emp_ratio = scale_factor * bom_ratio
                else:
                    emp_ratio = bom_ratio
            else:
                if parent_cons > 0 and child_cons > 0:
                    emp_ratio = child_cons / parent_cons
                else:
                    emp_ratio = bom_ratio

            empirical_ratios[(set_no, child_code)] = emp_ratio

    return empirical_ratios, shared_children, total_consumption


def analyze_sets() -> list[dict[str, Any]]:
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    ledger_rows = json.loads(LEDGER_PATH.read_text(encoding="utf-8"))
    contractor_rows = json.loads(CONTRACTOR_PATH.read_text(encoding="utf-8"))

    godowns: list[str] = list(metadata["godowns"])
    months: list[str] = list(metadata["date_range"]["months"])
    sets_defs: list[dict[str, Any]] = list(metadata["sets"])

    # Index godown closing_stock by (godown, month, item_code)
    stock_map: dict[tuple[str, str, str], float] = {}
    for row in ledger_rows:
        key = (str(row["godown"]), str(row["month"]), str(row["item_code"]))
        stock_map[key] = float(row.get("closing_stock", 0.0))

    empirical_ratios, shared_children, total_consumption = compute_empirical_ratios(
        sets_defs, contractor_rows
    )

    print("Computed BOM vs Empirical Ratios:")
    for set_def in sets_defs:
        set_no = str(set_def["set_no"])
        p_code = str(set_def["parent_code"])
        print(
            f"  Set {set_no} | Parent {p_code} ({set_def['parent_unit']}) "
            f"cum_cons={total_consumption.get(p_code, 0.0):,.2f}"
        )
        for ch in set_def["children"]:
            c_code = str(ch["child_code"])
            bom_r = float(ch["ratio_of_parent"])
            emp_r = empirical_ratios[(set_no, c_code)]
            shared_tag = " [SHARED]" if c_code in shared_children else ""
            print(
                f"    - {c_code} ({ch['child_unit']}){shared_tag}: "
                f"BOM={bom_r:.4f} | Empirical={emp_r:.6f}"
            )

    results: list[dict[str, Any]] = []

    for ratio_mode in ("empirical", "bom"):
        for set_def in sets_defs:
            set_no = str(set_def["set_no"])
            parent_code = str(set_def["parent_code"])
            parent_name = str(set_def["parent_name"])
            parent_unit = str(set_def["parent_unit"])
            children_defs: list[dict[str, Any]] = list(set_def["children"])

            for godown in godowns:
                for month in months:
                    parent_stock = round4(
                        max(0.0, stock_map.get((godown, month, parent_code), 0.0))
                    )

                    child_entries: list[dict[str, Any]] = []
                    min_buildable: int | None = None
                    any_child_stock = False

                    for ch in children_defs:
                        child_code = str(ch["child_code"])
                        child_name = str(ch["child_name"])
                        child_unit = str(ch["child_unit"])
                        raw_ratio = (
                            float(ch["ratio_of_parent"])
                            if ratio_mode == "bom"
                            else empirical_ratios[(set_no, child_code)]
                        )
                        available_stock = round4(
                            max(0.0, stock_map.get((godown, month, child_code), 0.0))
                        )
                        if available_stock > 0:
                            any_child_stock = True

                        required_for_parent = round4(parent_stock * raw_ratio)
                        buildable_sets = (
                            int(math.floor((available_stock / raw_ratio) + EPSILON))
                            if raw_ratio > 0
                            else 0
                        )
                        surplus_or_deficit = round4(
                            available_stock - required_for_parent
                        )

                        if min_buildable is None or buildable_sets < min_buildable:
                            min_buildable = buildable_sets

                        child_entries.append(
                            {
                                "child_code": child_code,
                                "child_name": child_name,
                                "child_unit": child_unit,
                                "ratio_used": round6(raw_ratio),
                                "available_stock": available_stock,
                                "required_for_parent": required_for_parent,
                                "buildable_sets": buildable_sets,
                                "surplus_or_deficit": surplus_or_deficit,
                                "is_shared_child": child_code in shared_children,
                                "is_bottleneck": False,
                            }
                        )

                    max_buildable_sets = min_buildable if min_buildable is not None else 0
                    stranded_parent_qty = round4(
                        max(0.0, parent_stock - float(max_buildable_sets))
                    )

                    # Classify cell imbalance & bottleneck
                    if parent_stock == 0 and not any_child_stock:
                        is_imbalanced = False
                        severity = "ok"
                        bottleneck_item_code: str | None = None
                        bottleneck_item_name: str | None = None
                    elif parent_stock == 0 and any_child_stock:
                        # Stranded child inventory with zero parent assemblies on hand
                        is_imbalanced = True
                        severity = "warning"
                        bottleneck_item_code = parent_code
                        bottleneck_item_name = parent_name
                    elif max_buildable_sets >= parent_stock:
                        is_imbalanced = False
                        severity = "ok"
                        bottleneck_item_code = None
                        bottleneck_item_name = None
                    else:
                        is_imbalanced = True
                        stranded_ratio = stranded_parent_qty / parent_stock
                        severity = (
                            "critical"
                            if (max_buildable_sets == 0 or stranded_ratio >= 0.5)
                            else "warning"
                        )

                        # Mark every child tied at min_buildable as bottleneck
                        bottleneck_candidates: list[dict[str, Any]] = []
                        for entry in child_entries:
                            if entry["buildable_sets"] == max_buildable_sets:
                                entry["is_bottleneck"] = True
                                bottleneck_candidates.append(entry)

                        # Deterministic primary bottleneck selection:
                        # smallest coverage ratio (available / required), then child_code
                        bottleneck_candidates.sort(
                            key=lambda c: (
                                c["buildable_sets"],
                                (
                                    c["available_stock"] / c["required_for_parent"]
                                    if c["required_for_parent"] > 0
                                    else 0.0
                                ),
                                c["child_code"],
                            )
                        )
                        primary_bn = bottleneck_candidates[0]
                        bottleneck_item_code = primary_bn["child_code"]
                        bottleneck_item_name = primary_bn["child_name"]

                    results.append(
                        {
                            "month": month,
                            "godown": godown,
                            "set_no": set_no,
                            "parent_code": parent_code,
                            "parent_name": parent_name,
                            "parent_unit": parent_unit,
                            "ratio_mode": ratio_mode,
                            "parent_stock": parent_stock,
                            "max_buildable_sets": max_buildable_sets,
                            "stranded_parent_qty": stranded_parent_qty,
                            "is_imbalanced": is_imbalanced,
                            "severity": severity,
                            "bottleneck_item_code": bottleneck_item_code,
                            "bottleneck_item_name": bottleneck_item_name,
                            "children": child_entries,
                        }
                    )

    return results


def main() -> None:
    t0 = time.perf_counter()
    rows = analyze_sets()

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(rows, indent=2), encoding="utf-8")

    elapsed = time.perf_counter() - t0
    print(f"\nWrote {len(rows):,} rows to {OUTPUT_PATH} in {elapsed:.2f}s")

    for mode in ("empirical", "bom"):
        mode_rows = [r for r in rows if r["ratio_mode"] == mode]
        zero_cnt = sum(
            1
            for r in mode_rows
            if r["parent_stock"] == 0
            and all(c["available_stock"] == 0 for c in r["children"])
        )
        ok_cnt = sum(
            1 for r in mode_rows if r["parent_stock"] > 0 and not r["is_imbalanced"]
        )
        warn_cnt = sum(1 for r in mode_rows if r["severity"] == "warning")
        crit_cnt = sum(1 for r in mode_rows if r["severity"] == "critical")
        print(
            f"  [{mode:9s}] total={len(mode_rows)} | balanced={ok_cnt} | "
            f"warning={warn_cnt} | critical={crit_cnt} | zero_stock={zero_cnt}"
        )


if __name__ == "__main__":
    main()
