# Lumino Industries — "1,700 Poles" Hackathon (`AGENTS.md`)

Single source of truth for **Team Bold Bytes** human developers and autonomous AI coding agents working in parallel on `AryaMajumder38/1700poles-hackathon`.

Follow these guardrails strictly so all 4 tracks execute simultaneously with **ZERO merge conflicts** and **ZERO build failures**.

---

## 1. Exclusive File Ownership Table (4 Tracks)

| Track | Owner & Branch | Exclusive Code Ownership | Generated JSON Ownership (`/web/public/data/`) | Read-Only Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Track A (Lead)** | Arya — `arya` / `main` | `/pipeline/build_ledger.py`<br>`/web/src/types/lumino.ts`<br>`/web/src/app/layout.tsx`<br>`/web/src/app/page.tsx`<br>`/web/src/app/globals.css`<br>`/web/package.json`<br>`/web/bun.lock`<br>`/AGENTS.md` | `metadata.json`<br>`ledger_monthly.json`<br>`contractor_stock.json` | `/data/raw/*` |
| **Track B (Job 1 UI — "See It")** | Nehal — `Nehal` | `/web/src/features/ledger/**`<br>*(Must default-export `LedgerView` from `/web/src/features/ledger/index.tsx`)* | *(None — Read-Only)* | `/web/public/data/metadata.json`<br>`/web/public/data/ledger_monthly.json`<br>`/web/public/data/contractor_stock.json` |
| **Track C (Job 2 — "Plan It")** | Jaggesh — `jagesh` | `/pipeline/simulate_plan.py`<br>`/web/src/features/planner/**`<br>*(Must default-export `PlannerView` from `/web/src/features/planner/index.tsx`)* | `simulation_default.json`<br>`backtest_summary.json` | `/web/public/data/metadata.json`<br>`/web/public/data/ledger_monthly.json`<br>`/web/public/data/contractor_stock.json` |
| **Track D (Job 3 — "Match Sets")** | Manish — `Manish` | `/pipeline/analyze_sets.py`<br>`/web/src/features/sets/**`<br>*(Must default-export `SetsView` from `/web/src/features/sets/index.tsx`)* | `sets_imbalance.json` | `/web/public/data/metadata.json`<br>`/web/public/data/ledger_monthly.json`<br>`/data/raw/sets.csv` |

---

## 2. Non-Negotiable Zero-Conflict Rules

1. **NEVER edit files outside your track boundary.** Each track has an exclusive, non-overlapping file set.
2. **NEVER edit locked core files outside Track A:**
   - `/web/package.json` and `/web/bun.lock`
   - `/web/src/types/lumino.ts`
   - `/web/src/app/layout.tsx`
   - `/web/src/app/page.tsx`
   - `/web/src/app/globals.css`
   - `/data/raw/*`
   - If you need a new dependency or shared type field, ask Track A (Arya) to update `main`, then rebase your branch onto `origin/main`.
3. **NEVER parse raw CSVs in the browser.** All frontend components must fetch pre-aggregated JSON files from `/data/*.json` (served from `/web/public/data/`) and type them with `/web/src/types/lumino.ts`.
4. **Scoped styling only.** Use Tailwind utility classes inside your own feature directory (`/web/src/features/<track>/**`). Do not touch `globals.css`.
5. **Required default exports:**
   - Track B: `export default function LedgerView(...)` in `/web/src/features/ledger/index.tsx`
   - Track C: `export default function PlannerView(...)` in `/web/src/features/planner/index.tsx`
   - Track D: `export default function SetsView(...)` in `/web/src/features/sets/index.tsx`
6. **Verify before every commit & push:**
   - Run `cd web && bun run build` and confirm **ZERO TypeScript errors and ZERO build errors**.
   - If you own a Python pipeline script, run it via `pipeline/venv/bin/python` and verify clean JSON output before committing.
7. **Hackathon Git Hygiene:**
   - Commit small and often with clear messages on your own branch.
   - Never commit secrets, API keys, `.env` files, `node_modules/`, `.next/`, or `venv/`.
   - **HARD LOCK at 4:45 PM:** No commits or pushes after 4:45 PM.

---

## 3. Critical Lumino Domain & Data Guardrails

All pipeline scripts and UI views MUST obey these domain facts:

1. **6 Active Construction Godowns ONLY:**
   - `KANPUR AURAIYA`
   - `KANPUR DEHAT`
   - `KANPUR ETAWAH`
   - `KANPUR FARRUKHABAD`
   - `KANPUR KANNAUJ`
   - `KANPUR NAGAR`
2. **Exclude `KANPUR CLOSER` from Active Godowns:** `KANPUR CLOSER` is a temporary 2026 wind-down store that appears only in `transfers.csv`. Do NOT treat it as an active construction godown or demand center.
3. **Never Deduplicate Raw CSV Rows:** Identical rows in `receipts.csv`, `transfers.csv`, and `contractor_moves.csv` represent separate valid transactions.
4. **Ignore Zero-Quantity Rows:** Filter out rows where `qty == 0` or `qty_received == 0`.
5. **Sign Semantics:** `qty` is always positive; `type` (`ISSUE`, `RETURN`, `CONSUMPTION`) or `direction` (`IN`, `OUT`) determines sign.
6. **Godown Stock Formula (per godown, item, month, cumulative starting at 0):**
   ```
   closing_stock(t) = max(0, cumsum_{k<=t}(receipts + transfers_in - transfers_out - issues + returns))
   ```
   *(Cumulative sum first, then clamp minor late-entry negative dips to 0 so later inflows don't invent phantom stock.)*
7. **Contractor Stock is Project-Wide ONLY:** `CONSUMPTION` rows have NO godown attribution. Never fabricate per-godown consumption. Compute contractor idle stock strictly at the project level (per item, month, cumulative starting at 0):
   ```
   contractor_stock(t) = max(0, cumsum_{k<=t}(total_issues - total_returns - total_consumption))
   ```
8. **Units of Measure (UOM):** Items use different units (`PCS`, `NOS`, `SET`, `KG`, `MT`, `KM`, `MTR`). Always render the UOM beside every quantity and **NEVER sum raw quantities across different items or UOMs**.
9. **Timeline & Wind-Down Phase:** Months span `2023-03` through `2026-10` (44 months). Material receipts cease after `2026-07` while site consumption continues through `2026-10`; planners must handle wind-down without generating spurious new vendor orders.
