"""
Track A — Job 1 Foundation: Lumino Industries "1,700 Poles" Monthly Ledger Builder.

Enforces all Lumino domain & data guardrails:
- NEVER deduplicate raw CSV rows (identical rows are separate valid entries).
- Filter out rows where qty == 0 or qty_received == 0.
- qty is always positive; type (ISSUE, RETURN, CONSUMPTION) or direction (IN, OUT) sets sign.
- 6 active construction godowns ONLY (exclude KANPUR CLOSER wind-down store).
- Timeline: 2023-03 through 2026-10 (44 months).
- Godown stock per (godown, item, month) starts at 0 and clamps minor negative dips to 0:
    closing_stock = max(0, prev_stock + receipts + transfers_in - transfers_out - issues + returns)
- Contractor stock is project-wide ONLY (CONSUMPTION has no godown), per (item, month), starting at 0:
    closing_contractor_stock = max(0, prev_contractor_stock + total_issues - total_returns - total_consumption)
- Uses vectorized pandas groupby (no nested DataFrame filtering loops).
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT_DIR / "data" / "raw"
OUT_DIR = ROOT_DIR / "web" / "public" / "data"

ACTIVE_GODOWNS: list[str] = [
    "KANPUR AURAIYA",
    "KANPUR DEHAT",
    "KANPUR ETAWAH",
    "KANPUR FARRUKHABAD",
    "KANPUR KANNAUJ",
    "KANPUR NAGAR",
]

START_MONTH = "2023-03"
END_MONTH = "2026-10"
RECEIPTS_END_MONTH = "2026-07"


def round4(val: float) -> float:
    return round(float(val), 4)


def build_months(start: str, end: str) -> list[str]:
    return [p.strftime("%Y-%m") for p in pd.period_range(start=start, end=end, freq="M")]


def load_and_clean_raw() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    items = pd.read_csv(RAW_DIR / "items.csv")
    sets_df = pd.read_csv(RAW_DIR / "sets.csv", dtype={"set_no": str})
    receipts = pd.read_csv(RAW_DIR / "receipts.csv")
    transfers = pd.read_csv(RAW_DIR / "transfers.csv")
    moves = pd.read_csv(RAW_DIR / "contractor_moves.csv")

    # Strip whitespace on key string columns without ever deduplicating rows
    for df, cols in [
        (items, ["item_code", "item_name", "unit", "role"]),
        (sets_df, ["set_no", "parent_code", "parent_name", "parent_unit", "child_code", "child_name", "child_unit"]),
        (receipts, ["item_code", "godown"]),
        (transfers, ["item_code", "godown", "direction"]),
        (moves, ["item_code", "type", "godown"]),
    ]:
        for col in cols:
            if col in df.columns:
                df[col] = df[col].astype("string").str.strip()

    # Filter out zero-quantity rows
    receipts["qty_received"] = pd.to_numeric(receipts["qty_received"], errors="coerce").fillna(0.0)
    receipts = receipts[receipts["qty_received"] > 0].copy()

    transfers["qty"] = pd.to_numeric(transfers["qty"], errors="coerce").fillna(0.0)
    transfers = transfers[transfers["qty"] > 0].copy()

    moves["qty"] = pd.to_numeric(moves["qty"], errors="coerce").fillna(0.0)
    moves = moves[moves["qty"] > 0].copy()

    # Extract YYYY-MM month keys vectorized
    receipts["month"] = receipts["date"].astype(str).str.slice(0, 7)
    transfers["month"] = transfers["date"].astype(str).str.slice(0, 7)
    moves["month"] = moves["date"].astype(str).str.slice(0, 7)

    return items, sets_df, receipts, transfers, moves


def build_metadata(items: pd.DataFrame, sets_df: pd.DataFrame, months: list[str]) -> dict[str, Any]:
    items_list = [
        {
            "item_code": str(row["item_code"]),
            "item_name": str(row["item_name"]),
            "unit": str(row["unit"]),
            "lead_time_days": int(row["lead_time_days"]),
            "role": str(row["role"]),
        }
        for _, row in items.sort_values("item_code").iterrows()
    ]

    sets_list: list[dict[str, Any]] = []
    for set_no, grp in sets_df.groupby("set_no", sort=True):
        first = grp.iloc[0]
        children = [
            {
                "child_code": str(r["child_code"]),
                "child_name": str(r["child_name"]),
                "child_unit": str(r["child_unit"]),
                "ratio_of_parent": round4(float(r["ratio_of_parent"])),
            }
            for _, r in grp.iterrows()
        ]
        sets_list.append(
            {
                "set_no": str(set_no),
                "parent_code": str(first["parent_code"]),
                "parent_name": str(first["parent_name"]),
                "parent_unit": str(first["parent_unit"]),
                "children": children,
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "date_range": {
            "start": START_MONTH,
            "end": END_MONTH,
            "receipts_end": RECEIPTS_END_MONTH,
            "total_months": len(months),
            "months": months,
        },
        "godowns": ACTIVE_GODOWNS,
        "items": items_list,
        "sets": sets_list,
    }


def build_godown_ledger(
    items: pd.DataFrame,
    receipts: pd.DataFrame,
    transfers: pd.DataFrame,
    moves: pd.DataFrame,
    months: list[str],
) -> pd.DataFrame:
    item_codes = sorted(items["item_code"].astype(str).tolist())
    item_meta = items.set_index("item_code")[["item_name", "unit"]]

    # Full cartesian grid: 6 active godowns x 16 items x 44 months
    full_index = pd.MultiIndex.from_product(
        [ACTIVE_GODOWNS, item_codes, months],
        names=["godown", "item_code", "month"],
    )
    grid = pd.DataFrame(index=full_index)

    # 1. Receipts (active godowns only)
    rec_active = receipts[receipts["godown"].isin(ACTIVE_GODOWNS)]
    grid["receipts"] = (
        rec_active.groupby(["godown", "item_code", "month"])["qty_received"].sum()
    )

    # 2. Transfers IN / OUT (active godowns only; KANPUR CLOSER excluded as a godown,
    # while OUT legs from active godowns to KANPUR CLOSER are preserved!)
    tr_active = transfers[transfers["godown"].isin(ACTIVE_GODOWNS)]
    tr_in = tr_active[tr_active["direction"] == "IN"]
    tr_out = tr_active[tr_active["direction"] == "OUT"]
    grid["transfers_in"] = tr_in.groupby(["godown", "item_code", "month"])["qty"].sum()
    grid["transfers_out"] = tr_out.groupby(["godown", "item_code", "month"])["qty"].sum()

    # 3. Contractor ISSUE and RETURN at active godowns
    mv_active = moves[moves["godown"].isin(ACTIVE_GODOWNS)]
    mv_issue = mv_active[mv_active["type"] == "ISSUE"]
    mv_return = mv_active[mv_active["type"] == "RETURN"]
    grid["issues"] = mv_issue.groupby(["godown", "item_code", "month"])["qty"].sum()
    grid["returns"] = mv_return.groupby(["godown", "item_code", "month"])["qty"].sum()

    grid = grid.fillna(0.0).reset_index()

    # Ensure strict chronological ordering within each (godown, item_code)
    grid = grid.sort_values(["godown", "item_code", "month"]).reset_index(drop=True)
    grid["net_flow"] = (
        grid["receipts"]
        + grid["transfers_in"]
        - grid["transfers_out"]
        - grid["issues"]
        + grid["returns"]
    )

    # Compute running opening & closing stock from cumulative net flow, clamping
    # late-entry negative dips to 0 without inventing phantom inventory on later inflows.
    n_months = len(months)
    n_groups = len(ACTIVE_GODOWNS) * len(item_codes)
    net_flows = grid["net_flow"].to_numpy(dtype=np.float64).reshape(n_groups, n_months)
    raw_cumsum = np.cumsum(net_flows, axis=1)
    closing = np.maximum(0.0, raw_cumsum)
    opening = np.zeros_like(closing)
    opening[:, 1:] = closing[:, :-1]

    grid["opening_stock"] = opening.reshape(-1)
    grid["closing_stock"] = closing.reshape(-1)

    grid["item_name"] = grid["item_code"].map(item_meta["item_name"])
    grid["unit"] = grid["item_code"].map(item_meta["unit"])

    return grid


def build_contractor_stock(
    items: pd.DataFrame,
    moves: pd.DataFrame,
    godown_ledger: pd.DataFrame,
    months: list[str],
) -> pd.DataFrame:
    item_codes = sorted(items["item_code"].astype(str).tolist())
    item_meta = items.set_index("item_code")[["item_name", "unit"]]

    full_index = pd.MultiIndex.from_product(
        [item_codes, months],
        names=["item_code", "month"],
    )
    cgrid = pd.DataFrame(index=full_index)

    # Project-wide ISSUE, RETURN, CONSUMPTION
    mv_issue = moves[moves["type"] == "ISSUE"]
    mv_return = moves[moves["type"] == "RETURN"]
    mv_cons = moves[moves["type"] == "CONSUMPTION"]

    cgrid["total_issues"] = mv_issue.groupby(["item_code", "month"])["qty"].sum()
    cgrid["total_returns"] = mv_return.groupby(["item_code", "month"])["qty"].sum()
    cgrid["total_consumption"] = mv_cons.groupby(["item_code", "month"])["qty"].sum()

    # Also aggregate project-wide godown receipts & closing stock for convenience
    godown_agg = godown_ledger.groupby(["item_code", "month"]).agg(
        total_receipts=("receipts", "sum"),
        project_godown_stock=("closing_stock", "sum"),
    )
    cgrid["total_receipts"] = godown_agg["total_receipts"]
    cgrid["project_godown_stock"] = godown_agg["project_godown_stock"]

    cgrid = cgrid.fillna(0.0).reset_index()
    cgrid = cgrid.sort_values(["item_code", "month"]).reset_index(drop=True)
    cgrid["net_contractor_flow"] = (
        cgrid["total_issues"] - cgrid["total_returns"] - cgrid["total_consumption"]
    )

    n_months = len(months)
    n_items = len(item_codes)
    net_flows = cgrid["net_contractor_flow"].to_numpy(dtype=np.float64).reshape(n_items, n_months)
    raw_cumsum = np.cumsum(net_flows, axis=1)
    closing = np.maximum(0.0, raw_cumsum)
    opening = np.zeros_like(closing)
    opening[:, 1:] = closing[:, :-1]

    cgrid["opening_contractor_stock"] = opening.reshape(-1)
    cgrid["closing_contractor_stock"] = closing.reshape(-1)
    cgrid["total_project_idle_stock"] = (
        cgrid["project_godown_stock"] + cgrid["closing_contractor_stock"]
    )

    cgrid["item_name"] = cgrid["item_code"].map(item_meta["item_name"])
    cgrid["unit"] = cgrid["item_code"].map(item_meta["unit"])

    return cgrid


def dataframe_to_rounded_records(df: pd.DataFrame, numeric_cols: list[str], col_order: list[str]) -> list[dict[str, Any]]:
    out = df[col_order].copy()
    for col in numeric_cols:
        out[col] = out[col].round(4)
    return out.to_dict(orient="records")


def main() -> None:
    t0 = time.perf_counter()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    months = build_months(START_MONTH, END_MONTH)
    items, sets_df, receipts, transfers, moves = load_and_clean_raw()

    metadata = build_metadata(items, sets_df, months)
    godown_ledger = build_godown_ledger(items, receipts, transfers, moves, months)
    contractor_stock = build_contractor_stock(items, moves, godown_ledger, months)

    ledger_records = dataframe_to_rounded_records(
        godown_ledger,
        numeric_cols=[
            "opening_stock",
            "receipts",
            "transfers_in",
            "transfers_out",
            "issues",
            "returns",
            "net_flow",
            "closing_stock",
        ],
        col_order=[
            "month",
            "godown",
            "item_code",
            "item_name",
            "unit",
            "opening_stock",
            "receipts",
            "transfers_in",
            "transfers_out",
            "issues",
            "returns",
            "net_flow",
            "closing_stock",
        ],
    )

    contractor_records = dataframe_to_rounded_records(
        contractor_stock,
        numeric_cols=[
            "opening_contractor_stock",
            "total_receipts",
            "total_issues",
            "total_returns",
            "total_consumption",
            "net_contractor_flow",
            "closing_contractor_stock",
            "project_godown_stock",
            "total_project_idle_stock",
        ],
        col_order=[
            "month",
            "item_code",
            "item_name",
            "unit",
            "opening_contractor_stock",
            "total_receipts",
            "total_issues",
            "total_returns",
            "total_consumption",
            "net_contractor_flow",
            "closing_contractor_stock",
            "project_godown_stock",
            "total_project_idle_stock",
        ],
    )

    with open(OUT_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    with open(OUT_DIR / "ledger_monthly.json", "w", encoding="utf-8") as f:
        json.dump(ledger_records, f, separators=(",", ":"))
    with open(OUT_DIR / "contractor_stock.json", "w", encoding="utf-8") as f:
        json.dump(contractor_records, f, separators=(",", ":"))

    elapsed = time.perf_counter() - t0

    # Sanity checks
    min_godown_stock = float(godown_ledger["closing_stock"].min())
    min_contractor_stock = float(contractor_stock["closing_contractor_stock"].min())
    assert min_godown_stock >= 0.0, f"Negative godown stock detected: {min_godown_stock}"
    assert min_contractor_stock >= 0.0, f"Negative contractor stock detected: {min_contractor_stock}"
    assert len(ledger_records) == 6 * 16 * 44, f"Unexpected ledger row count: {len(ledger_records)}"
    assert len(contractor_records) == 16 * 44, f"Unexpected contractor row count: {len(contractor_records)}"

    pole_ledger = godown_ledger[godown_ledger["item_code"] == "MPO010014"]
    pole_contractor = contractor_stock[contractor_stock["item_code"] == "MPO010014"]
    pole_receipts = pole_ledger["receipts"].sum()
    pole_issues = pole_contractor["total_issues"].sum()
    pole_returns = pole_contractor["total_returns"].sum()
    pole_consumption = pole_contractor["total_consumption"].sum()
    pole_peak_godown = pole_contractor["project_godown_stock"].max()
    pole_peak_godown_month = pole_contractor.loc[pole_contractor["project_godown_stock"].idxmax(), "month"]
    pole_peak_contractor = pole_contractor["closing_contractor_stock"].max()
    pole_peak_contractor_month = pole_contractor.loc[pole_contractor["closing_contractor_stock"].idxmax(), "month"]
    pole_end_godown = pole_contractor.iloc[-1]["project_godown_stock"]
    pole_end_contractor = pole_contractor.iloc[-1]["closing_contractor_stock"]

    print(f"build_ledger.py completed in {elapsed:.2f}s")
    print(f"Exported to: {OUT_DIR}")
    print(f"  metadata.json         : {len(metadata['godowns'])} godowns, {len(metadata['items'])} items, {len(metadata['sets'])} sets, {metadata['date_range']['total_months']} months")
    print(f"  ledger_monthly.json   : {len(ledger_records)} rows (min closing_stock = {min_godown_stock})")
    print(f"  contractor_stock.json : {len(contractor_records)} rows (min closing_contractor_stock = {min_contractor_stock})")
    print("Sanity Check — MPO010014 (PCC POLE 8.5 MTR 180 KG, PCS):")
    print(f"  Total Receipts         : {pole_receipts:,.2f} PCS")
    print(f"  Total Issues           : {pole_issues:,.2f} PCS")
    print(f"  Total Returns          : {pole_returns:,.2f} PCS")
    print(f"  Total Consumption      : {pole_consumption:,.2f} PCS")
    print(f"  Peak Godown Stock      : {pole_peak_godown:,.2f} PCS (in {pole_peak_godown_month})")
    print(f"  Peak Contractor Stock  : {pole_peak_contractor:,.2f} PCS (in {pole_peak_contractor_month})")
    print(f"  Ending Stock (2026-10) : {pole_end_godown:,.2f} PCS in godowns | {pole_end_contractor:,.2f} PCS with contractors")


if __name__ == "__main__":
    main()
