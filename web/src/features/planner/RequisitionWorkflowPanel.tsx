"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import type { ItemMaster, SimulationAction } from "@/types/lumino";
import { QtyText } from "./HexPrimitives";
import {
  getAllCatalogMaterials,
  type MaterialRequisition,
  type OpsStoreState,
  type RequisitionStatus,
  type UserRoleType,
} from "./opsTypes";
import {
  formatQty,
  getTransitDays,
  shortGodownName,
} from "./plannerTypes";

interface RequisitionWorkflowPanelProps {
  roleType: UserRoleType;
  activeStaffId: string | null;
  baseItems: ItemMaster[];
  opsState: OpsStoreState;
  latestMonthActions: SimulationAction[];
  activeMonth: string;
  onCreateRequisition: (payload: {
    warehouse_id: string;
    item_code: string;
    qty: number;
    urgency: "HIGH" | "MEDIUM" | "LOW";
    notes: string;
  }) => void;
  onHeadOrderVendor: (
    reqId: string,
    supplierId: string,
    leadTimeDays: number
  ) => void;
  onHeadRouteTransfer: (
    reqId: string,
    donorWarehouseId: string,
    mode: "LP_RECOMMENDED" | "CUSTOM",
    distanceKm: number
  ) => void;
  onHeadReject: (reqId: string) => void;
  onDonorConsentDecision: (
    reqId: string,
    approved: boolean,
    note: string
  ) => void;
  onMarkOrderDelivered: (orderId: string, actualDays: number) => void;
  onSwitchToStaff: (staffId: string) => void;
}

const DISTANCE_LOOKUP: Record<string, Record<string, number>> = {
  "KANPUR AURAIYA": {
    "KANPUR DEHAT": 55,
    "KANPUR ETAWAH": 60,
    "KANPUR FARRUKHABAD": 115,
    "KANPUR KANNAUJ": 85,
    "KANPUR NAGAR": 95,
  },
  "KANPUR DEHAT": {
    "KANPUR AURAIYA": 55,
    "KANPUR ETAWAH": 110,
    "KANPUR FARRUKHABAD": 130,
    "KANPUR KANNAUJ": 75,
    "KANPUR NAGAR": 45,
  },
  "KANPUR ETAWAH": {
    "KANPUR AURAIYA": 60,
    "KANPUR DEHAT": 110,
    "KANPUR FARRUKHABAD": 105,
    "KANPUR KANNAUJ": 125,
    "KANPUR NAGAR": 150,
  },
  "KANPUR FARRUKHABAD": {
    "KANPUR AURAIYA": 115,
    "KANPUR DEHAT": 130,
    "KANPUR ETAWAH": 105,
    "KANPUR KANNAUJ": 65,
    "KANPUR NAGAR": 140,
  },
  "KANPUR KANNAUJ": {
    "KANPUR AURAIYA": 85,
    "KANPUR DEHAT": 75,
    "KANPUR ETAWAH": 125,
    "KANPUR FARRUKHABAD": 65,
    "KANPUR NAGAR": 80,
  },
  "KANPUR NAGAR": {
    "KANPUR AURAIYA": 95,
    "KANPUR DEHAT": 45,
    "KANPUR ETAWAH": 150,
    "KANPUR FARRUKHABAD": 140,
    "KANPUR KANNAUJ": 80,
  },
};

function estimateDistanceKm(fromName: string, toName: string): number {
  if (fromName === toName) return 0;
  return DISTANCE_LOOKUP[fromName]?.[toName] ?? 85;
}

function statusMeta(status: RequisitionStatus) {
  switch (status) {
    case "PENDING_HEAD_APPROVAL":
      return {
        label: "Awaiting Head approval",
        dot: "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.75)]",
        text: "text-amber-300",
      };
    case "PENDING_DONOR_CONSENT":
      return {
        label: "Awaiting donor consent",
        dot: "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]",
        text: "text-rose-400",
      };
    case "TRANSFER_APPROVED_DISPATCHED":
      return {
        label: "Transfer dispatched",
        dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.75)]",
        text: "text-emerald-400",
      };
    case "FULFILLED_BY_VENDOR_ORDER":
      return {
        label: "Vendor PO issued",
        dot: "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]",
        text: "text-[#e7e7e7]",
      };
    case "DONOR_DECLINED_REROUTE":
      return {
        label: "Donor declined · reroute",
        dot: "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.75)]",
        text: "text-amber-300",
      };
    default:
      return {
        label: "Rejected",
        dot: "bg-white/25",
        text: "text-[#898989]",
      };
  }
}

function urgencyLabel(u: "HIGH" | "MEDIUM" | "LOW") {
  if (u === "HIGH") return "High";
  if (u === "MEDIUM") return "Medium";
  return "Low";
}

function formatSourceLabel(source: string) {
  return source
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

const INPUT_CLASS =
  "h-9 w-full rounded-xl border border-white/[0.1] bg-[#141414] px-3 text-sm text-[#e7e7e7] placeholder:text-[#666666] transition-colors focus-visible:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50";

const OPTION_CLASS = "bg-[#1a1a1a] text-[#e7e7e7]";

const PRIMARY_BTN =
  "inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-sm font-medium text-black transition-all duration-200 hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a] disabled:opacity-40 cursor-pointer";

const GHOST_BTN =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.06] px-3 text-xs font-medium text-[#e7e7e7] transition-all duration-200 hover:bg-white/[0.11] active:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer";

const DESTRUCTIVE_BTN =
  "inline-flex h-9 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 text-sm font-medium text-rose-400 transition-all duration-200 hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer";

export default function RequisitionWorkflowPanel({
  roleType,
  activeStaffId,
  baseItems,
  opsState,
  latestMonthActions,
  activeMonth,
  onCreateRequisition,
  onHeadOrderVendor,
  onHeadRouteTransfer,
  onHeadReject,
  onDonorConsentDecision,
  onMarkOrderDelivered,
  onSwitchToStaff,
}: RequisitionWorkflowPanelProps) {
  const allMaterials = useMemo(
    () => getAllCatalogMaterials(baseItems, opsState),
    [baseItems, opsState]
  );

  const isAdmin = roleType === "ADMIN_HEAD";
  const activeStaff =
    opsState.staff.find((s) => s.staff_id === activeStaffId) ?? null;
  const activeWarehouse = activeStaff
    ? opsState.warehouses.find(
        (w) => w.warehouse_id === activeStaff.warehouse_id
      ) ?? null
    : null;

  // New Requisition Form state
  const [reqItemCode, setReqItemCode] = useState(
    allMaterials[0]?.item_code ?? "MPO010014"
  );
  const [reqQty, setReqQty] = useState("250");
  const [reqUrgency, setReqUrgency] = useState<"HIGH" | "MEDIUM" | "LOW">(
    "HIGH"
  );
  const [reqNotes, setReqNotes] = useState("");
  const [reqWarehouseId, setReqWarehouseId] = useState(
    activeWarehouse?.warehouse_id ?? opsState.warehouses[0]?.warehouse_id ?? ""
  );

  // Per-requisition Head fulfillment choices
  const [fulfillModeByReq, setFulfillModeByReq] = useState<
    Record<string, "TRANSFER" | "VENDOR">
  >({});
  const [selectedDonorByReq, setSelectedDonorByReq] = useState<
    Record<string, string>
  >({});
  const [selectedSupplierByReq, setSelectedSupplierByReq] = useState<
    Record<string, string>
  >({});
  const [consentNoteByReq, setConsentNoteByReq] = useState<
    Record<string, string>
  >({});
  const [deliveryDaysInput, setDeliveryDaysInput] = useState<
    Record<string, string>
  >({});

  // Helper: current site stock from active simulation month + live ops adjustments
  const getSiteStock = (warehouseName: string, itemCode: string): number => {
    const simAct = latestMonthActions.find(
      (a) => a.godown === warehouseName && a.item_code === itemCode
    );
    const base = simAct?.godown_on_hand ?? 0;
    const adj =
      opsState.liveStockAdjustments[`${warehouseName}::${itemCode}`] ?? 0;
    return Math.max(0, base + adj);
  };

  // Compute recommended donor site for a requisition (highest stock / shortest road distance)
  const getRecommendedDonor = (req: MaterialRequisition) => {
    const candidates = opsState.warehouses
      .filter((w) => w.warehouse_id !== req.requesting_warehouse_id)
      .map((w) => {
        const stock = getSiteStock(w.name, req.item_code);
        const dist = estimateDistanceKm(w.name, req.requesting_warehouse_name);
        return { warehouse: w, stock, dist };
      })
      .sort((a, b) => {
        const aCanCover = a.stock >= req.qty ? 1 : 0;
        const bCanCover = b.stock >= req.qty ? 1 : 0;
        if (aCanCover !== bCanCover) return bCanCover - aCanCover;
        if (aCanCover === 1) return a.dist - b.dist;
        return b.stock - a.stock;
      });
    return candidates[0] ?? null;
  };

  // RBAC-scoped requisitions & vendor orders
  const visibleRequisitions = useMemo(() => {
    if (isAdmin) return opsState.requisitions;
    if (!activeWarehouse) return [];
    return opsState.requisitions.filter(
      (r) =>
        r.requesting_warehouse_id === activeWarehouse.warehouse_id ||
        r.donor_warehouse_id === activeWarehouse.warehouse_id
    );
  }, [isAdmin, opsState.requisitions, activeWarehouse]);

  const donorConsentQueue = useMemo(() => {
    if (!activeWarehouse) return [];
    return opsState.requisitions.filter(
      (r) =>
        r.status === "PENDING_DONOR_CONSENT" &&
        r.donor_warehouse_id === activeWarehouse.warehouse_id
    );
  }, [opsState.requisitions, activeWarehouse]);

  const visibleOrders = useMemo(() => {
    if (isAdmin) return opsState.vendorOrders;
    if (!activeWarehouse) return [];
    return opsState.vendorOrders.filter(
      (po) => po.destination_warehouse_id === activeWarehouse.warehouse_id
    );
  }, [isAdmin, opsState.vendorOrders, activeWarehouse]);

  const visibleLedger = useMemo(() => {
    if (isAdmin) return opsState.ownershipLedger;
    if (!activeWarehouse) return [];
    return opsState.ownershipLedger.filter(
      (e) => e.warehouse_name === activeWarehouse.name
    );
  }, [isAdmin, opsState.ownershipLedger, activeWarehouse]);

  const handleSubmitReq = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(reqQty);
    const whId = isAdmin
      ? reqWarehouseId
      : activeWarehouse?.warehouse_id ?? reqWarehouseId;
    if (!whId || !reqItemCode || !Number.isFinite(qtyNum) || qtyNum <= 0)
      return;

    onCreateRequisition({
      warehouse_id: whId,
      item_code: reqItemCode,
      qty: qtyNum,
      urgency: reqUrgency,
      notes:
        reqNotes.trim() ||
        "Site erection demand exceeding current godown safety buffer.",
    });
    setReqNotes("");
  };

  const selectedReqMat = allMaterials.find((m) => m.item_code === reqItemCode);

  return (
    <div className="space-y-6">
      {/* Priority Section for Site Manager: Pending Donor Consent Requests */}
      {!isAdmin && donorConsentQueue.length > 0 && activeWarehouse && (
        <section
          aria-label="Site Property Consent Required"
          className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#1a1a1a]"
        >
          <div className="border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"
              />
              <h3 className="text-[17px] font-medium text-[#e7e7e7]">
                Site property consent required · {activeWarehouse.name}
              </h3>
            </div>
            <p className="mt-1 text-sm text-[#a0a0a0]">
              Yard materials require your approval before transfer pickup.
            </p>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {donorConsentQueue.map((req) => {
              const currentStock = getSiteStock(
                activeWarehouse.name,
                req.item_code
              );
              const dist = req.transfer_distance_km ?? 80;
              return (
                <div
                  key={req.req_id}
                  className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs text-[#898989]">
                        {req.req_id}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]"
                        />
                        Pickup{" "}
                        <QtyText
                          value={req.qty}
                          unit={req.unit}
                          className="text-rose-400"
                        />
                      </span>
                      <span className="text-xs text-[#a0a0a0] tabular-nums">
                        {dist} km ({getTransitDays(dist)}d) →{" "}
                        {shortGodownName(req.requesting_warehouse_name)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium text-[#e7e7e7]">
                      <span className="font-mono text-xs font-normal text-[#898989]">
                        {req.item_code}
                      </span>{" "}
                      · {req.item_name}
                    </p>
                    <p className="text-xs text-[#898989]">
                      Site balance ({activeMonth}):{" "}
                      <QtyText
                        value={currentStock}
                        unit={req.unit}
                        className="font-medium text-white"
                      />{" "}
                      · Requested by {req.requested_by_name}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <input
                      type="text"
                      aria-label={`Consent note for ${req.req_id}`}
                      placeholder="Optional note..."
                      value={consentNoteByReq[req.req_id] ?? ""}
                      onChange={(e) =>
                        setConsentNoteByReq((prev) => ({
                          ...prev,
                          [req.req_id]: e.target.value,
                        }))
                      }
                      className={`${INPUT_CLASS} sm:w-60`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onDonorConsentDecision(
                            req.req_id,
                            true,
                            consentNoteByReq[req.req_id] ||
                              "Approved pickup from surplus yard stock."
                          )
                        }
                        className={PRIMARY_BTN}
                      >
                        Approve pickup
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onDonorConsentDecision(
                            req.req_id,
                            false,
                            consentNoteByReq[req.req_id] ||
                              "Declined: stock committed to local erection schedule."
                          )
                        }
                        className={DESTRUCTIVE_BTN}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top Grid: Create Material Requisition + Requisition Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Raise Material Requisition */}
        <form
          onSubmit={handleSubmitReq}
          className="space-y-4 rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-6 lg:col-span-4"
        >
          <div>
            <h3 className="text-[17px] font-medium text-[#e7e7e7]">
              Request materials
            </h3>
            <p className="mt-0.5 truncate text-xs text-[#a0a0a0]">
              {isAdmin
                ? "Submit a requisition on behalf of any site."
                : `Scoped to ${activeWarehouse?.name ?? "assigned site"}.`}
            </p>
          </div>

          {isAdmin && (
            <div className="space-y-1.5">
              <label className="block text-xs font-normal text-[#898989]">
                Requesting site
              </label>
              <select
                value={reqWarehouseId}
                onChange={(e) => setReqWarehouseId(e.target.value)}
                className={INPUT_CLASS}
              >
                {opsState.warehouses.map((w) => (
                  <option
                    key={w.warehouse_id}
                    value={w.warehouse_id}
                    className={OPTION_CLASS}
                  >
                    {w.name} ({w.project_id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-normal text-[#898989]">
              Material
            </label>
            <select
              value={reqItemCode}
              onChange={(e) => setReqItemCode(e.target.value)}
              className={INPUT_CLASS}
            >
              {allMaterials.map((m) => (
                <option
                  key={m.item_code}
                  value={m.item_code}
                  className={OPTION_CLASS}
                >
                  {m.item_code} — {m.item_name} ({m.unit}, LT {m.lead_time_days}
                  d)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-normal text-[#898989]">
                Quantity ({selectedReqMat?.unit ?? "QTY"})
              </label>
              <input
                type="number"
                step="any"
                min={0.05}
                required
                value={reqQty}
                onChange={(e) => setReqQty(e.target.value)}
                className={`${INPUT_CLASS} tabular-nums`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-normal text-[#898989]">
                Urgency
              </label>
              <select
                value={reqUrgency}
                onChange={(e) =>
                  setReqUrgency(e.target.value as "HIGH" | "MEDIUM" | "LOW")
                }
                className={INPUT_CLASS}
              >
                <option value="HIGH" className={OPTION_CLASS}>
                  High (immediate)
                </option>
                <option value="MEDIUM" className={OPTION_CLASS}>
                  Medium (this month)
                </option>
                <option value="LOW" className={OPTION_CLASS}>
                  Low (planned)
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-normal text-[#898989]">
              Site justification
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Feeder gang waiting for poles..."
              value={reqNotes}
              onChange={(e) => setReqNotes(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-[#141414] px-3 py-2 text-sm text-[#e7e7e7] placeholder:text-[#666666] transition-colors focus-visible:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            />
          </div>

          <button type="submit" className={`${PRIMARY_BTN} w-full`}>
            Send request to Head of Projects
          </button>
        </form>

        {/* Right: Requisition Queue */}
        <section className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] lg:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4">
            <div className="min-w-0">
              <h3 className="text-[17px] font-medium text-[#e7e7e7]">
                {isAdmin
                  ? "Requisition approval queue"
                  : `Site requisitions (${activeWarehouse?.name ?? ""})`}
              </h3>
              <p className="mt-0.5 truncate text-xs text-[#a0a0a0]">
                Route from a surplus site (with donor consent) or issue a vendor
                PO.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs text-[#a0a0a0] tabular-nums">
              {visibleRequisitions.length} record
              {visibleRequisitions.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="max-h-[540px] divide-y divide-white/[0.06] overflow-y-auto">
            {visibleRequisitions.map((req) => {
              const status = statusMeta(req.status);
              const recDonor = getRecommendedDonor(req);
              const canHeadAct =
                isAdmin &&
                (req.status === "PENDING_HEAD_APPROVAL" ||
                  req.status === "DONOR_DECLINED_REROUTE");
              const mode = fulfillModeByReq[req.req_id] ?? "TRANSFER";
              const chosenDonorId =
                selectedDonorByReq[req.req_id] ??
                recDonor?.warehouse.warehouse_id ??
                "";
              const chosenDonorWh = opsState.warehouses.find(
                (w) => w.warehouse_id === chosenDonorId
              );
              const matObj = allMaterials.find(
                (m) => m.item_code === req.item_code
              );
              const chosenSupId =
                selectedSupplierByReq[req.req_id] ??
                matObj?.supplier_id ??
                opsState.suppliers[0]?.supplier_id ??
                "";

              const donorManager = req.donor_warehouse_id
                ? opsState.staff.find(
                    (s) => s.warehouse_id === req.donor_warehouse_id
                  )
                : null;

              return (
                <article key={req.req_id} className="space-y-3 p-6">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs text-[#898989]">
                          {req.req_id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.text}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                          />
                          {status.label}
                        </span>
                      </div>
                      <span className="rounded-full border border-white/[0.06] bg-white/[0.05] px-2.5 py-0.5 text-xs text-[#a0a0a0]">
                        {urgencyLabel(req.urgency)}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-[#e7e7e7]">
                      <QtyText value={req.qty} unit={req.unit} />{" "}
                      <span className="font-normal text-[#898989]">·</span>{" "}
                      <span className="font-mono text-xs font-normal text-[#a0a0a0]">
                        {req.item_code}
                      </span>{" "}
                      {req.item_name}
                    </div>

                    <div className="text-xs text-[#898989]">
                      {shortGodownName(req.requesting_warehouse_name)} ·
                      Requested by {req.requested_by_name} on {req.created_at}
                    </div>

                    <p
                      title={req.notes}
                      className="truncate text-xs text-[#a0a0a0]"
                    >
                      {req.notes}
                    </p>
                  </div>

                  {/* Donor Transfer Info Row */}
                  {req.donor_warehouse_name && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs text-[#a0a0a0]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-[#e7e7e7]">
                          {shortGodownName(req.donor_warehouse_name)}
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-[#898989]"
                        />
                        <span className="font-medium text-emerald-400">
                          {shortGodownName(req.requesting_warehouse_name)}
                        </span>
                        {req.transfer_distance_km !== undefined && (
                          <span className="text-[#898989] tabular-nums">
                            ({req.transfer_distance_km} km ·{" "}
                            {getTransitDays(req.transfer_distance_km)}d)
                          </span>
                        )}
                        {req.donor_selection_mode === "LP_RECOMMENDED" && (
                          <span className="text-violet-300/80">
                            · LP suggested
                          </span>
                        )}
                      </div>

                      {req.status === "PENDING_DONOR_CONSENT" &&
                        isAdmin &&
                        donorManager && (
                          <button
                            type="button"
                            onClick={() =>
                              onSwitchToStaff(donorManager.staff_id)
                            }
                            className={GHOST_BTN}
                          >
                            <Lock
                              aria-hidden="true"
                              className="h-3 w-3 text-[#898989]"
                            />
                            Switch to {donorManager.name}
                          </button>
                        )}
                    </div>
                  )}

                  {req.donor_decision_note && (
                    <p className="truncate text-xs text-[#a0a0a0]">
                      <span className="font-medium text-[#e7e7e7]">
                        Donor note:
                      </span>{" "}
                      {req.donor_decision_note}
                    </p>
                  )}

                  {/* Head of Projects Fulfillment Divider Section */}
                  {canHeadAct && (
                    <div className="space-y-3 border-t border-white/[0.06] pt-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-normal text-[#898989]">
                          Fulfillment action
                        </span>
                        <div className="inline-flex rounded-full border border-white/[0.06] bg-white/[0.05] p-1 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setFulfillModeByReq((prev) => ({
                                ...prev,
                                [req.req_id]: "TRANSFER",
                              }))
                            }
                            className={`rounded-full px-3 py-1 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
                              mode === "TRANSFER"
                                ? "bg-white font-medium text-black shadow-sm"
                                : "text-[#a0a0a0] hover:text-white"
                            }`}
                          >
                            Route from site
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFulfillModeByReq((prev) => ({
                                ...prev,
                                [req.req_id]: "VENDOR",
                              }))
                            }
                            className={`rounded-full px-3 py-1 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
                              mode === "VENDOR"
                                ? "bg-white font-medium text-black shadow-sm"
                                : "text-[#a0a0a0] hover:text-white"
                            }`}
                          >
                            New vendor PO
                          </button>
                        </div>
                      </div>

                      {mode === "TRANSFER" ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            aria-label={`Select donor site for ${req.req_id}`}
                            value={chosenDonorId}
                            onChange={(e) =>
                              setSelectedDonorByReq((prev) => ({
                                ...prev,
                                [req.req_id]: e.target.value,
                              }))
                            }
                            className={`${INPUT_CLASS} flex-1`}
                          >
                            {opsState.warehouses
                              .filter(
                                (w) =>
                                  w.warehouse_id !== req.requesting_warehouse_id
                              )
                              .map((w) => {
                                const st = getSiteStock(w.name, req.item_code);
                                const d = estimateDistanceKm(
                                  w.name,
                                  req.requesting_warehouse_name
                                );
                                const isRec =
                                  recDonor?.warehouse.warehouse_id ===
                                  w.warehouse_id;
                                return (
                                  <option
                                    key={w.warehouse_id}
                                    value={w.warehouse_id}
                                    className={OPTION_CLASS}
                                  >
                                    {isRec ? "LP suggested: " : "Custom: "}
                                    {shortGodownName(w.name)} — On hand:{" "}
                                    {formatQty(st, req.unit)} ({d} km)
                                  </option>
                                );
                              })}
                          </select>
                          <button
                            type="button"
                            disabled={!chosenDonorWh}
                            onClick={() => {
                              if (!chosenDonorWh) return;
                              const isRec =
                                recDonor?.warehouse.warehouse_id ===
                                chosenDonorWh.warehouse_id;
                              const d = estimateDistanceKm(
                                chosenDonorWh.name,
                                req.requesting_warehouse_name
                              );
                              onHeadRouteTransfer(
                                req.req_id,
                                chosenDonorWh.warehouse_id,
                                isRec ? "LP_RECOMMENDED" : "CUSTOM",
                                d
                              );
                            }}
                            className={`${PRIMARY_BTN} shrink-0`}
                          >
                            Request donor consent
                          </button>
                          <button
                            type="button"
                            onClick={() => onHeadReject(req.req_id)}
                            className={`${DESTRUCTIVE_BTN} shrink-0`}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            aria-label={`Select supplier for ${req.req_id}`}
                            value={chosenSupId}
                            onChange={(e) =>
                              setSelectedSupplierByReq((prev) => ({
                                ...prev,
                                [req.req_id]: e.target.value,
                              }))
                            }
                            className={`${INPUT_CLASS} flex-1`}
                          >
                            {opsState.suppliers.map((s) => (
                              <option
                                key={s.supplier_id}
                                value={s.supplier_id}
                                className={OPTION_CLASS}
                              >
                                {s.supplier_id} — {s.name} (avg{" "}
                                {s.avg_delivery_days}d · {s.on_time_rate_pct}%
                                on-time)
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              onHeadOrderVendor(
                                req.req_id,
                                chosenSupId,
                                matObj?.lead_time_days ?? 60
                              )
                            }
                            className={`${PRIMARY_BTN} shrink-0`}
                          >
                            Issue vendor PO
                          </button>
                          <button
                            type="button"
                            onClick={() => onHeadReject(req.req_id)}
                            className={`${DESTRUCTIVE_BTN} shrink-0`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* Bottom Row: Vendor Order Monitor + Custody Ledger */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Vendor Order Lead-Time & Delivery Tracker */}
        <section className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] lg:col-span-8">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h3 className="text-[17px] font-medium text-[#e7e7e7]">
              Vendor order lead-time monitor
            </h3>
            <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs text-[#a0a0a0] tabular-nums">
              {visibleOrders.length} PO{visibleOrders.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.025] text-xs font-normal text-[#898989]">
                  <th className="px-6 py-2.5 text-left font-normal">
                    PO / site
                  </th>
                  <th className="px-4 py-2.5 text-left font-normal">
                    Item &amp; qty
                  </th>
                  <th className="px-4 py-2.5 text-left font-normal">
                    Supplier
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Lead / ETA
                  </th>
                  <th className="px-6 py-2.5 text-right font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
                {visibleOrders.map((po) => {
                  const variance =
                    po.actual_delivery_days !== undefined
                      ? po.actual_delivery_days - po.promised_lead_time_days
                      : null;
                  return (
                    <tr
                      key={po.order_id}
                      className="transition-colors duration-150 hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-3">
                        <div className="font-mono text-xs text-white">
                          {po.order_id}
                        </div>
                        <div className="text-xs text-[#898989]">
                          {shortGodownName(po.destination_warehouse_name)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          <QtyText value={po.qty} unit={po.unit} />
                        </div>
                        <div
                          title={po.item_name}
                          className="max-w-[200px] truncate text-xs text-[#898989]"
                        >
                          <span className="font-mono text-[#a0a0a0]">
                            {po.item_code}
                          </span>{" "}
                          · {po.item_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-[#898989]">
                          {po.supplier_id}
                        </div>
                        <div className="max-w-[160px] truncate text-xs text-[#a0a0a0]">
                          {po.supplier_name}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        <div className="text-sm font-medium text-white">
                          {po.promised_lead_time_days}d
                        </div>
                        <div className="text-xs text-[#898989]">
                          ETA {po.expected_delivery_date}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right">
                        {po.status === "DELIVERED" ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                              <span
                                aria-hidden="true"
                                className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.75)]"
                              />
                              Delivered ({po.actual_delivery_days}d)
                            </span>
                            {variance !== null && (
                              <div
                                className={`mt-0.5 text-xs tabular-nums ${
                                  variance <= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {variance <= 0
                                  ? `${Math.abs(variance)}d early`
                                  : `+${variance}d delayed`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#e7e7e7]">
                              <span
                                aria-hidden="true"
                                className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.75)]"
                              />
                              {po.status === "IN_TRANSIT"
                                ? "In transit"
                                : "Ordered"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                aria-label={`Actual delivery days for ${po.order_id}`}
                                placeholder={`${po.promised_lead_time_days}d`}
                                value={deliveryDaysInput[po.order_id] ?? ""}
                                onChange={(e) =>
                                  setDeliveryDaysInput((prev) => ({
                                    ...prev,
                                    [po.order_id]: e.target.value,
                                  }))
                                }
                                className="h-8 w-16 rounded-full border border-white/[0.1] bg-[#141414] px-2.5 text-right text-xs text-[#e7e7e7] placeholder:text-[#666666] tabular-nums focus-visible:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  onMarkOrderDelivered(
                                    po.order_id,
                                    Math.max(
                                      1,
                                      Number(deliveryDaysInput[po.order_id]) ||
                                        po.promised_lead_time_days
                                    )
                                  )
                                }
                                className="inline-flex h-8 items-center rounded-full bg-white px-3.5 text-xs font-medium text-black transition-all duration-200 hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer"
                              >
                                Receive
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Site Property Ownership Audit Trail */}
        <section className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] lg:col-span-4">
          <div className="border-b border-white/[0.06] px-6 py-4">
            <h3 className="text-[17px] font-medium text-[#e7e7e7]">
              Custody &amp; consent ledger
            </h3>
            <p className="mt-0.5 truncate text-xs text-[#a0a0a0]">
              Audit log of custody changes and site manager approvals.
            </p>
          </div>

          <div className="max-h-72 divide-y divide-white/[0.05] overflow-y-auto">
            {visibleLedger.map((entry) => (
              <div key={entry.entry_id} className="px-6 py-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#e7e7e7]">
                    {shortGodownName(entry.warehouse_name)}
                  </span>
                  <QtyText
                    value={entry.qty_delta}
                    unit={entry.unit}
                    signed
                    className={`font-medium ${
                      entry.qty_delta >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  />
                </div>
                <div className="mt-0.5 text-[#a0a0a0]">
                  <span className="font-mono text-[#898989]">
                    {entry.item_code}
                  </span>{" "}
                  · {formatSourceLabel(entry.source)}
                </div>
                <div className="mt-0.5 truncate text-[#898989]">
                  {entry.consent_by} · {entry.timestamp}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
