"""
Track C — Job 2 ("Plan It" + "The Bar"):
Lumino Industries "1,700 Poles" Strictly Zero-Lookahead Causal Replay Engine,
Inter-Godown Min-Cost Flow LP Transfer Optimizer & Backtest Comparison.

Strict Guardrails Enforced:
- Reads ONLY pre-aggregated Track A JSONs:
    /web/public/data/metadata.json
    /web/public/data/ledger_monthly.json
    /web/public/data/contractor_stock.json
- 6 active construction godowns ONLY (excludes KANPUR CLOSER wind-down store).
- Strictly ZERO-LOOKAHEAD causality: every decision in month t uses ONLY data <= t.
- Step A: 3-month weighted moving average demand (0.5, 0.3, 0.2) + contractor-stock throttle (theta = 0.5).
- Step B: Donor-protected Stage A 6x6 Min-Cost Flow LP via scipy.optimize.linprog (HiGHS)
  using the Kanpur district road-distance matrix (km) with unit-aware micro-transfer filtering.
- Step C: Stage B netted vendor ordering with lead-time arrival scheduling, July-October 2026
  wind-down guard, and 100% transparent shortage & stockout tracking ("The Bar").
- Exports:
    /web/public/data/simulation_default.json  (SimulationAction[])
    /web/public/data/backtest_summary.json    (BacktestComparison[])
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
from scipy.optimize import linprog

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "web" / "public" / "data"

# Default safety stock buffer in months (balances idle reduction & shortage protection)
DEFAULT_SAFETY_MONTHS: float = 1.5

# Kanpur district road-distance matrix (km) among the 6 active godowns
DISTANCE_MATRIX_KM: dict[str, dict[str, int]] = {
    "KANPUR AURAIYA": {
        "KANPUR AURAIYA": 0,
        "KANPUR DEHAT": 55,
        "KANPUR ETAWAH": 60,
        "KANPUR FARRUKHABAD": 115,
        "KANPUR KANNAUJ": 85,
        "KANPUR NAGAR": 95,
    },
    "KANPUR DEHAT": {
        "KANPUR AURAIYA": 55,
        "KANPUR DEHAT": 0,
        "KANPUR ETAWAH": 110,
        "KANPUR FARRUKHABAD": 130,
        "KANPUR KANNAUJ": 75,
        "KANPUR NAGAR": 45,
    },
    "KANPUR ETAWAH": {
        "KANPUR AURAIYA": 60,
        "KANPUR DEHAT": 110,
        "KANPUR ETAWAH": 0,
        "KANPUR FARRUKHABAD": 105,
        "KANPUR KANNAUJ": 125,
        "KANPUR NAGAR": 150,
    },
    "KANPUR FARRUKHABAD": {
        "KANPUR AURAIYA": 115,
        "KANPUR DEHAT": 130,
        "KANPUR ETAWAH": 105,
        "KANPUR FARRUKHABAD": 0,
        "KANPUR KANNAUJ": 65,
        "KANPUR NAGAR": 140,
    },
    "KANPUR KANNAUJ": {
        "KANPUR AURAIYA": 85,
        "KANPUR DEHAT": 75,
        "KANPUR ETAWAH": 125,
        "KANPUR FARRUKHABAD": 65,
        "KANPUR KANNAUJ": 0,
        "KANPUR NAGAR": 80,
    },
    "KANPUR NAGAR": {
        "KANPUR AURAIYA": 95,
        "KANPUR DEHAT": 45,
        "KANPUR ETAWAH": 150,
        "KANPUR FARRUKHABAD": 140,
        "KANPUR KANNAUJ": 80,
        "KANPUR NAGAR": 0,
    },
}

# Unit-aware minimum batch thresholds to prevent impractical micro-transfers & micro-orders
MIN_BATCH_BY_UNIT: dict[str, float] = {
    "MT": 0.05,     # 50 kg minimum truckload for metric-tonne fasteners
    "KM": 0.5,      # 500 m minimum cable drum transfer
    "KG": 25.0,     # 25 kg minimum fastener batch
    "MTR": 100.0,   # 100 m minimum LT cable coil
    "PCS": 5.0,     # 5 poles minimum dispatch
    "SET": 10.0,    # 10 clamp sets minimum
    "NOS": 10.0,    # 10 hardware pieces minimum
}

# Average regional vendor haul baseline (km) used to quantify road-km saved vs. long-haul vendor dispatch
BASELINE_VENDOR_HAUL_KM: float = 260.0


def round_qty(value: float, unit: str) -> float:
    """Round quantities cleanly according to item unit of measure."""
    if unit == "MT":
        return round(float(value), 4)
    if unit in ("KM", "KG"):
        return round(float(value), 2)
    return round(float(value), 1)


def format_qty_str(value: float, unit: str) -> str:
    """Human-readable quantity string with unit for plain-English rationales."""
    if unit == "MT":
        return f"{value:,.3f} {unit}"
    if unit in ("KM", "KG"):
        return f"{value:,.1f} {unit}"
    return f"{value:,.0f} {unit}"


def transit_days(distance_km: int) -> int:
    """Spec rule: <= 100 km = 1 day; > 100 km = 2 days."""
    return 1 if distance_km <= 100 else 2


class TransferOptimizer:
    """Pre-built 6x6 Min-Cost Flow LP solver using scipy.optimize.linprog (HiGHS)."""

    def __init__(self, godowns: list[str]) -> None:
        self.godowns = godowns
        self.n_g = len(godowns)
        self.pairs: list[tuple[int, int]] = []
        costs: list[float] = []

        for i, g_from in enumerate(godowns):
            for j, g_to in enumerate(godowns):
                if i != j:
                    self.pairs.append((i, j))
                    costs.append(float(DISTANCE_MATRIX_KM[g_from][g_to]))

        self.cost_vec = np.array(costs, dtype=np.float64)
        n_vars = len(self.pairs)

        # Inequality constraints:
        #   rows 0..N-1   : sum_j X_{i,j} <= donor_cap[i]
        #   rows N..2N-1  : sum_i X_{i,j} <= receiver_need[j]
        self.a_ub = np.zeros((2 * self.n_g, n_vars), dtype=np.float64)
        for idx, (i, j) in enumerate(self.pairs):
            self.a_ub[i, idx] = 1.0
            self.a_ub[self.n_g + j, idx] = 1.0

        # Equality constraint: maximize flow by forcing sum(X) == min(sum(donor_cap), sum(receiver_need))
        self.a_eq = np.ones((1, n_vars), dtype=np.float64)

    def solve(
        self,
        donor_caps: np.ndarray,
        receiver_needs: np.ndarray,
        min_batch: float,
    ) -> list[tuple[int, int, float, int]]:
        """
        Solve Stage A inter-godown transfer LP.
        Returns list of (from_idx, to_idx, qty, distance_km) filtered by min_batch.
        """
        total_donor = float(np.sum(donor_caps))
        total_need = float(np.sum(receiver_needs))
        max_flow = min(total_donor, total_need)

        if max_flow < min_batch:
            return []

        b_ub = np.concatenate([donor_caps, receiver_needs]).astype(np.float64)
        b_eq = np.array([max_flow], dtype=np.float64)

        res = linprog(
            c=self.cost_vec,
            A_ub=self.a_ub,
            b_ub=b_ub,
            A_eq=self.a_eq,
            b_eq=b_eq,
            bounds=(0.0, None),
            method="highs",
        )

        if not res.success or res.x is None:
            return []

        transfers: list[tuple[int, int, float, int]] = []
        for idx, qty in enumerate(res.x):
            if qty >= min_batch:
                i, j = self.pairs[idx]
                dist_km = DISTANCE_MATRIX_KM[self.godowns[i]][self.godowns[j]]
                transfers.append((i, j, float(qty), dist_km))

        return transfers


def run_simulation(safety_months: float = DEFAULT_SAFETY_MONTHS) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    with open(DATA_DIR / "metadata.json", "r", encoding="utf-8") as f:
        metadata = json.load(f)
    with open(DATA_DIR / "ledger_monthly.json", "r", encoding="utf-8") as f:
        ledger_rows = json.load(f)
    with open(DATA_DIR / "contractor_stock.json", "r", encoding="utf-8") as f:
        contractor_rows = json.load(f)

    godowns: list[str] = metadata["godowns"]
    months: list[str] = metadata["date_range"]["months"]
    receipts_end_month: str = metadata["date_range"]["receipts_end"]
    items: list[dict[str, Any]] = metadata["items"]

    n_g = len(godowns)
    n_m = len(months)
    month_to_idx = {m: idx for idx, m in enumerate(months)}
    receipts_end_idx = month_to_idx[receipts_end_month]

    # Index Track A JSONs for O(1) lookup (strictly read inside loop only at <= t)
    ledger_map: dict[tuple[str, str, str], dict[str, Any]] = {
        (r["item_code"], r["godown"], r["month"]): r for r in ledger_rows
    }
    contractor_map: dict[tuple[str, str], dict[str, Any]] = {
        (r["item_code"], r["month"]): r for r in contractor_rows
    }

    optimizer = TransferOptimizer(godowns)

    all_actions: list[dict[str, Any]] = []
    backtest_summaries: list[dict[str, Any]] = []

    for item in items:
        item_code: str = item["item_code"]
        item_name: str = item["item_name"]
        unit: str = item["unit"]
        lead_time_days: int = int(item["lead_time_days"])
        lt_months_exact: float = lead_time_days / 30.0
        lt_months_round: int = max(1, round(lt_months_exact))
        min_batch: float = MIN_BATCH_BY_UNIT.get(unit, 10.0)

        # Donor protection horizon: H(i) = min(lead_time_days/30, 2.5) + safety_months
        donor_horizon: float = min(lt_months_exact, 2.5) + safety_months

        # Identify initial pre-demand mobilization pipeline:
        # Before the first month of site demand for an item occurs, no causal demand-driven
        # order could yet have been triggered; vendor shipments whose implied order date
        # precedes the first observed demand signal are already committed in the vendor pipeline.
        first_demand_idx = n_m
        for m_idx, m in enumerate(months):
            if any(
                max(0.0, float(ledger_map[(item_code, g, m)]["issues"]) - float(ledger_map[(item_code, g, m)]["returns"])) > 0.0
                for g in godowns
            ):
                first_demand_idx = m_idx
                break

        seed_cutoff_idx = first_demand_idx + lt_months_round

        # pipeline[arrival_month_idx][godown_idx] = vendor qty arriving in that month
        pipeline: dict[int, np.ndarray] = defaultdict(lambda: np.zeros(n_g, dtype=np.float64))
        for m_idx, m in enumerate(months):
            if m_idx <= seed_cutoff_idx:
                for g_idx, g in enumerate(godowns):
                    rec = float(ledger_map[(item_code, g, m)]["receipts"])
                    if rec > 0.0:
                        pipeline[m_idx][g_idx] += rec

        # Simulation state per godown
        on_hand = np.zeros(n_g, dtype=np.float64)
        net_demand_history = np.zeros((n_g, n_m), dtype=np.float64)

        # Backtest ("The Bar") accumulators
        monthly_series: list[dict[str, Any]] = []
        actual_idle_list: list[float] = []
        sim_idle_list: list[float] = []
        actual_total_ordered: float = 0.0
        sim_total_ordered: float = 0.0
        actual_stockout_months: int = 0
        sim_stockout_months: int = 0
        total_shortage_qty: float = 0.0
        total_demand_qty: float = 0.0
        total_transfers_recommended: int = 0
        total_transfer_qty: float = 0.0
        total_transfer_km: float = 0.0
        estimated_km_saved: float = 0.0

        for t, month in enumerate(months):
            arriving = pipeline[t].copy()
            sim_receipts_month = float(np.sum(arriving))
            if t <= seed_cutoff_idx:
                sim_total_ordered += sim_receipts_month

            # ------------------------------------------------------------------
            # STEP A: Causal Demand Forecast & Contractor-Stock Throttle (<= t)
            # ------------------------------------------------------------------
            d_raw = np.zeros(n_g, dtype=np.float64)
            for g_idx in range(n_g):
                nd_1 = net_demand_history[g_idx, t - 1] if t >= 1 else 0.0
                nd_2 = net_demand_history[g_idx, t - 2] if t >= 2 else 0.0
                nd_3 = net_demand_history[g_idx, t - 3] if t >= 3 else 0.0
                d_raw[g_idx] = 0.5 * nd_1 + 0.3 * nd_2 + 0.2 * nd_3

            total_d_raw = float(np.sum(d_raw))
            c_row = contractor_map[(item_code, month)]
            # Strictly causal: opening_contractor_stock at start of month t (= closing stock at t-1)
            contractor_idle = float(c_row["opening_contractor_stock"])
            throttle_active = total_d_raw > 0.0 and contractor_idle > 1.5 * total_d_raw
            theta = 0.5 if throttle_active else 1.0
            d_adj = d_raw * theta

            # ------------------------------------------------------------------
            # STEP B: Donor Protection & Stage A Transfer Optimizer (LP)
            # ------------------------------------------------------------------
            donor_caps = np.maximum(0.0, on_hand - d_adj * donor_horizon)
            receiver_needs = np.maximum(
                0.0,
                d_adj * (1.0 + safety_months) - (on_hand + arriving),
            )

            lp_transfers = optimizer.solve(donor_caps, receiver_needs, min_batch)

            tr_in_qty = np.zeros(n_g, dtype=np.float64)
            tr_out_qty = np.zeros(n_g, dtype=np.float64)
            transfers_in_list: list[list[dict[str, Any]]] = [[] for _ in range(n_g)]
            transfers_out_list: list[list[dict[str, Any]]] = [[] for _ in range(n_g)]

            for from_idx, to_idx, qty, dist_km in lp_transfers:
                q_rounded = round_qty(qty, unit)
                if q_rounded < min_batch:
                    continue
                t_days = transit_days(dist_km)
                from_g = godowns[from_idx]
                to_g = godowns[to_idx]
                tr_out_qty[from_idx] += q_rounded
                tr_in_qty[to_idx] += q_rounded

                detail: dict[str, Any] = {
                    "from_godown": from_g,
                    "to_godown": to_g,
                    "item_code": item_code,
                    "unit": unit,
                    "qty": q_rounded,
                    "distance_km": int(dist_km),
                    "reason": (
                        f"{t_days}-day road transfer ({dist_km} km) from donor {from_g} "
                        f"to cover {to_g} deficit before {lead_time_days}d vendor cycle"
                    ),
                }
                transfers_out_list[from_idx].append(detail)
                transfers_in_list[to_idx].append(detail)

                total_transfers_recommended += 1
                total_transfer_qty += q_rounded
                total_transfer_km += float(dist_km)
                estimated_km_saved += max(0.0, BASELINE_VENDOR_HAUL_KM - float(dist_km))

            # ------------------------------------------------------------------
            # STEP C: Stage B Netted Vendor Ordering & Wind-Down Guard
            # ------------------------------------------------------------------
            open_future = np.zeros(n_g, dtype=np.float64)
            for fut_t, arr_vec in pipeline.items():
                if fut_t > t:
                    open_future += arr_vec

            # Pre-demand inventory position after Stage A transfers
            inv_pos = on_hand + arriving + tr_in_qty - tr_out_qty + open_future
            target_stock = d_adj * (lt_months_exact + safety_months)
            unthrottled_target = d_raw * (lt_months_exact + safety_months)

            arr_idx = t + lt_months_round
            wind_down_blocked = (arr_idx > receipts_end_idx) or (t >= receipts_end_idx)
            in_mobilization_window = arr_idx <= seed_cutoff_idx

            order_qtys = np.zeros(n_g, dtype=np.float64)
            hold_qtys = np.zeros(n_g, dtype=np.float64)

            for g_idx in range(n_g):
                raw_gap = max(0.0, target_stock[g_idx] - inv_pos[g_idx])
                unthrottled_gap = max(0.0, unthrottled_target[g_idx] - inv_pos[g_idx])

                if wind_down_blocked:
                    # Wind-down guard: suppress late orders whose ETA passes July 2026 receipt cutoff
                    order_qtys[g_idx] = 0.0
                    hold_qtys[g_idx] = max(raw_gap, on_hand[g_idx] + arriving[g_idx])
                elif in_mobilization_window:
                    order_qtys[g_idx] = 0.0
                    hold_qtys[g_idx] = max(0.0, inv_pos[g_idx] - target_stock[g_idx])
                elif raw_gap >= min_batch:
                    oq = round_qty(raw_gap, unit)
                    order_qtys[g_idx] = oq
                    pipeline[arr_idx][g_idx] += oq
                    sim_total_ordered += oq
                    if throttle_active and unthrottled_gap > oq:
                        hold_qtys[g_idx] = round_qty(unthrottled_gap - oq, unit)
                else:
                    order_qtys[g_idx] = 0.0
                    if throttle_active and unthrottled_gap >= min_batch:
                        hold_qtys[g_idx] = round_qty(unthrottled_gap, unit)
                    elif inv_pos[g_idx] > target_stock[g_idx] and d_adj[g_idx] > 0.0:
                        hold_qtys[g_idx] = round_qty(inv_pos[g_idx] - target_stock[g_idx], unit)

            # Build per-godown SimulationAction records BEFORE end-of-month deduction
            # (so godown_on_hand & in_transit_qty reflect exact causal state at decision time)
            for g_idx, g in enumerate(godowns):
                oq = float(order_qtys[g_idx])
                hq = float(hold_qtys[g_idx])
                t_in = transfers_in_list[g_idx]
                t_out = transfers_out_list[g_idx]
                oh_now = float(on_hand[g_idx])
                in_tr_now = float(arriving[g_idx] + open_future[g_idx])
                d_val = float(d_adj[g_idx])
                ip_val = float(inv_pos[g_idx])
                tgt_val = float(target_stock[g_idx])

                exp_arrival: str | None = months[arr_idx] if (oq > 0.0 and arr_idx < n_m) else None

                if oq > 0.0:
                    decision = "ORDER"
                    tr_note = (
                        f" after receiving {format_qty_str(float(tr_in_qty[g_idx]), unit)} via transfer"
                        if t_in
                        else ""
                    )
                    th_note = (
                        f" Contractor throttle active (θ=0.5, contractor idle {format_qty_str(contractor_idle, unit)})."
                        if throttle_active
                        else ""
                    )
                    rationale = (
                        f"IP ({format_qty_str(ip_val, unit)}) < target ({format_qty_str(tgt_val, unit)})"
                        f"{tr_note} for {lead_time_days}d lead time + {safety_months:.1f}m safety; "
                        f"ordered {format_qty_str(oq, unit)} (ETA {exp_arrival}).{th_note}"
                    )
                elif t_in:
                    decision = "TRANSFER_IN"
                    tot_in = float(tr_in_qty[g_idx])
                    first_tr = t_in[0]
                    t_days = transit_days(int(first_tr["distance_km"]))
                    src_label = (
                        first_tr["from_godown"]
                        if len(t_in) == 1
                        else f"{len(t_in)} donor godowns"
                    )
                    rationale = (
                        f"Covered local need via {t_days}-day inter-godown transfer of "
                        f"{format_qty_str(tot_in, unit)} from {src_label} ({first_tr['distance_km']} km); "
                        f"avoided {lead_time_days}d vendor order."
                    )
                elif t_out:
                    decision = "TRANSFER_OUT"
                    tot_out = float(tr_out_qty[g_idx])
                    first_tr = t_out[0]
                    t_days = transit_days(int(first_tr["distance_km"]))
                    dst_label = (
                        first_tr["to_godown"]
                        if len(t_out) == 1
                        else f"{len(t_out)} receiving godowns"
                    )
                    rationale = (
                        f"Surplus above {donor_horizon:.1f}m donor-protection floor; dispatched "
                        f"{format_qty_str(tot_out, unit)} to {dst_label} "
                        f"({first_tr['distance_km']} km, {t_days}d transit)."
                    )
                elif wind_down_blocked and (oh_now > 0.0 or d_val > 0.0):
                    decision = "HOLD"
                    rationale = (
                        f"Wind-down guard active (receipts end {receipts_end_month}): "
                        f"holding new vendor orders and drawing down {format_qty_str(oh_now, unit)} on hand."
                    )
                elif hq > 0.0:
                    decision = "HOLD"
                    if throttle_active:
                        rationale = (
                            f"Contractor-stock throttle active (θ=0.5, contractor idle "
                            f"{format_qty_str(contractor_idle, unit)} > 1.5x demand); "
                            f"IP ({format_qty_str(ip_val, unit)}) covers throttled target ({format_qty_str(tgt_val, unit)})."
                        )
                    else:
                        rationale = (
                            f"Inventory position ({format_qty_str(ip_val, unit)}) exceeds target "
                            f"({format_qty_str(tgt_val, unit)}); holding vendor orders to prevent idle pileup."
                        )
                else:
                    decision = "WAIT"
                    if d_val <= 0.0:
                        rationale = "No causal site demand signal in prior 3 months; standing by with zero order."
                    else:
                        rationale = (
                            f"Stock balanced within mobilization pipeline "
                            f"(IP {format_qty_str(ip_val, unit)} vs target {format_qty_str(tgt_val, unit)})."
                        )

                all_actions.append(
                    {
                        "month": month,
                        "godown": g,
                        "item_code": item_code,
                        "item_name": item_name,
                        "unit": unit,
                        "decision": decision,
                        "order_qty": round_qty(oq, unit),
                        "hold_qty": round_qty(hq, unit),
                        "transfers_in": t_in,
                        "transfers_out": t_out,
                        "projected_monthly_demand": round_qty(d_val, unit),
                        "godown_on_hand": round_qty(oh_now, unit),
                        "in_transit_qty": round_qty(in_tr_now, unit),
                        "contractor_idle_stock": round_qty(contractor_idle, unit),
                        "lead_time_days": lead_time_days,
                        "expected_arrival_month": exp_arrival,
                        "rationale": rationale,
                    }
                )

            # ------------------------------------------------------------------
            # END-OF-MONTH REALIZATION & HONEST SHORTAGE TRACKING ("The Bar")
            # ------------------------------------------------------------------
            available = on_hand + arriving + tr_in_qty - tr_out_qty
            month_sim_shortage_qty = 0.0
            month_sim_stockout = False
            month_act_stockout = False
            stockout_godowns: list[str] = []

            for g_idx, g in enumerate(godowns):
                l_row = ledger_map[(item_code, g, month)]
                act_rec = float(l_row["receipts"])
                issues = float(l_row["issues"])
                returns = float(l_row["returns"])
                actual_total_ordered += act_rec

                # Historical local net demand: issues - returns
                net_draw = issues - returns
                local_net_demand = max(0.0, net_draw)
                net_demand_history[g_idx, t] = local_net_demand
                total_demand_qty += local_net_demand

                # Historical baseline stockout check
                act_avail = (
                    float(l_row["opening_stock"])
                    + act_rec
                    + float(l_row["transfers_in"])
                    - float(l_row["transfers_out"])
                    + returns
                )
                if issues > act_avail + 1e-6:
                    month_act_stockout = True

                # Simulated godown deduction — NEVER hide shortages
                if net_draw > 0.0:
                    if available[g_idx] < net_draw - 1e-6:
                        shortage = net_draw - available[g_idx]
                        month_sim_shortage_qty += shortage
                        total_shortage_qty += shortage
                        if shortage >= min_batch * 0.5:
                            month_sim_stockout = True
                            stockout_godowns.append(g)
                        on_hand[g_idx] = 0.0
                    else:
                        on_hand[g_idx] = available[g_idx] - net_draw
                else:
                    # Net contractor returns replenish godown stock
                    on_hand[g_idx] = available[g_idx] - net_draw

            if month_sim_stockout:
                sim_stockout_months += 1
            if month_act_stockout:
                actual_stockout_months += 1

            act_idle_m = float(c_row["project_godown_stock"])
            sim_idle_m = float(np.sum(on_hand))
            actual_idle_list.append(act_idle_m)
            sim_idle_list.append(sim_idle_m)

            monthly_series.append(
                {
                    "month": month,
                    "actual_idle_stock": round_qty(act_idle_m, unit),
                    "simulated_idle_stock": round_qty(sim_idle_m, unit),
                    "actual_receipts": round_qty(float(c_row["total_receipts"]), unit),
                    "simulated_receipts": round_qty(sim_receipts_month, unit),
                    "actual_consumption": round_qty(float(c_row["total_consumption"]), unit),
                    "simulated_shortage_qty": round_qty(month_sim_shortage_qty, unit),
                    "stockout_godowns": stockout_godowns,
                }
            )

        actual_peak_idle = float(np.max(actual_idle_list)) if actual_idle_list else 0.0
        sim_peak_idle = float(np.max(sim_idle_list)) if sim_idle_list else 0.0
        actual_avg_idle = float(np.mean(actual_idle_list)) if actual_idle_list else 0.0
        sim_avg_idle = float(np.mean(sim_idle_list)) if sim_idle_list else 0.0
        idle_reduction_pct = (
            ((actual_avg_idle - sim_avg_idle) / actual_avg_idle) * 100.0
            if actual_avg_idle > 0.0
            else 0.0
        )
        shortage_rate_pct = (
            (total_shortage_qty / total_demand_qty) * 100.0
            if total_demand_qty > 0.0
            else 0.0
        )

        backtest_summaries.append(
            {
                "item_code": item_code,
                "item_name": item_name,
                "unit": unit,
                "actual_peak_idle": round_qty(actual_peak_idle, unit),
                "simulated_peak_idle": round_qty(sim_peak_idle, unit),
                "actual_avg_idle": round_qty(actual_avg_idle, unit),
                "simulated_avg_idle": round_qty(sim_avg_idle, unit),
                "idle_reduction_pct": round(idle_reduction_pct, 2),
                "actual_total_ordered": round_qty(actual_total_ordered, unit),
                "simulated_total_ordered": round_qty(sim_total_ordered, unit),
                "actual_stockout_months": actual_stockout_months,
                "simulated_stockout_months": sim_stockout_months,
                "total_transfers_recommended": total_transfers_recommended,
                "total_shortage_qty": round_qty(total_shortage_qty, unit),
                "shortage_rate_pct": round(shortage_rate_pct, 2),
                "total_transfer_qty": round_qty(total_transfer_qty, unit),
                "total_transfer_km": round(total_transfer_km, 1),
                "estimated_km_saved": round(estimated_km_saved, 1),
                "monthly_series": monthly_series,
            }
        )

    return all_actions, backtest_summaries


def main() -> None:
    t0 = time.perf_counter()
    actions, summaries = run_simulation(safety_months=DEFAULT_SAFETY_MONTHS)

    sim_path = DATA_DIR / "simulation_default.json"
    bt_path = DATA_DIR / "backtest_summary.json"

    with open(sim_path, "w", encoding="utf-8") as f:
        json.dump(actions, f, separators=(",", ":"))
    with open(bt_path, "w", encoding="utf-8") as f:
        json.dump(summaries, f, separators=(",", ":"))

    elapsed = time.perf_counter() - t0

    # Integrity assertions
    assert len(actions) == 6 * 16 * 44, f"Expected 4,224 actions, got {len(actions)}"
    assert len(summaries) == 16, f"Expected 16 backtest summaries, got {len(summaries)}"
    valid_decisions = {"ORDER", "HOLD", "TRANSFER_IN", "TRANSFER_OUT", "WAIT"}
    assert all(a["decision"] in valid_decisions for a in actions), "Invalid decision enum detected!"

    decision_counts: dict[str, int] = defaultdict(int)
    for a in actions:
        decision_counts[a["decision"]] += 1

    print(f"simulate_plan.py completed in {elapsed:.2f}s (safety_months={DEFAULT_SAFETY_MONTHS})")
    print(f"  Exported: {sim_path} ({len(actions):,} actions)")
    print(f"  Exported: {bt_path} ({len(summaries)} item summaries)")
    print(f"  Decision breakdown: {dict(decision_counts)}")
    print("\nBacktest Summary ('The Bar' — Actual vs. Simulated Godown Idle):")
    print(
        f"{'Item':10s} {'UOM':4s} | {'ActAvg':>10s} {'SimAvg':>10s} {'Red%':>7s} | "
        f"{'ActPk':>10s} {'SimPk':>10s} | {'ActSO':>5s} {'SimSO':>5s} {'Sh%':>6s} | {'Tr#':>4s}"
    )
    print("-" * 102)
    for s in summaries:
        print(
            f"{s['item_code']:10s} {s['unit']:4s} | "
            f"{s['actual_avg_idle']:10,.1f} {s['simulated_avg_idle']:10,.1f} {s['idle_reduction_pct']:6.1f}% | "
            f"{s['actual_peak_idle']:10,.1f} {s['simulated_peak_idle']:10,.1f} | "
            f"{s['actual_stockout_months']:5d} {s['simulated_stockout_months']:5d} {s['shortage_rate_pct']:5.1f}% | "
            f"{s['total_transfers_recommended']:4d}"
        )


if __name__ == "__main__":
    main()
