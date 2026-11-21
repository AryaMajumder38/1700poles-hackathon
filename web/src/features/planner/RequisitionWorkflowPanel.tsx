"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  PackageCheck,
  Send,
  ShieldAlert,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";
import type { ItemMaster, SimulationAction } from "@/types/lumino";
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
  onHeadOrderVendor: (reqId: string, supplierId: string, leadTimeDays: number) => void;
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

function statusBadge(status: RequisitionStatus) {
  switch (status) {
    case "PENDING_HEAD_APPROVAL":
      return {
        label: "Awaiting Head of Projects",
        cls: "bg-amber-100 text-amber-900 border-amber-200",
      };
    case "PENDING_DONOR_CONSENT":
      return {
        label: "Property Locked · Awaiting Donor Site Consent",
        cls: "bg-rose-100 text-rose-900 border-rose-300",
      };
    case "TRANSFER_APPROVED_DISPATCHED":
      return {
        label: "Donor Approved · Transfer Dispatched",
        cls: "bg-emerald-100 text-emerald-900 border-emerald-200",
      };
    case "FULFILLED_BY_VENDOR_ORDER":
      return {
        label: "Fulfilled via New Vendor PO",
        cls: "bg-blue-100 text-blue-900 border-blue-200",
      };
    case "DONOR_DECLINED_REROUTE":
      return {
        label: "Donor Declined · Reroute Needed",
        cls: "bg-orange-100 text-orange-900 border-orange-300",
      };
    default:
      return {
        label: "Rejected by Head",
        cls: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

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
    if (!whId || !reqItemCode || !Number.isFinite(qtyNum) || qtyNum <= 0) return;

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
      {/* Priority Banner for Site Manager: Pending Donor Consent Requests */}
      {!isAdmin && donorConsentQueue.length > 0 && activeWarehouse && (
        <section className="space-y-3 rounded-xl border-2 border-rose-300 bg-rose-50/80 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                Site Property Consent Required — {activeWarehouse.name}
              </h3>
              <p className="mt-0.5 text-xs text-rose-800">
                Materials inside <strong>{activeWarehouse.name}</strong> are the
                property of your site/project and{" "}
                <strong>cannot be picked up without your explicit consent</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {donorConsentQueue.map((req) => {
              const currentStock = getSiteStock(
                activeWarehouse.name,
                req.item_code
              );
              const dist = req.transfer_distance_km ?? 80;
              return (
                <div
                  key={req.req_id}
                  className="rounded-lg border border-rose-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {req.req_id}
                        </span>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                          Pickup Request: {formatQty(req.qty, req.unit)}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {dist} km ({getTransitDays(dist)}d transit) →{" "}
                          {shortGodownName(req.requesting_warehouse_name)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        {req.item_code} — {req.item_name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Your Site Property Balance ({activeMonth}):{" "}
                        <strong className="text-slate-900">
                          {formatQty(currentStock, req.unit)}
                        </strong>{" "}
                        • Requested by {req.requested_by_name} (
                        {shortGodownName(req.requesting_warehouse_name)})
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      <input
                        type="text"
                        placeholder="Optional consent / decline note..."
                        value={consentNoteByReq[req.req_id] ?? ""}
                        onChange={(e) =>
                          setConsentNoteByReq((prev) => ({
                            ...prev,
                            [req.req_id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs sm:w-56"
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
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve Pickup
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
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Decline Pickup
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top Grid: Create Material Requisition + Requisition Approval & Routing Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Raise Material Requisition (Site Manager -> Head of Projects) */}
        <form
          onSubmit={handleSubmitReq}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4"
        >
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Request Materials (To Project Head)
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAdmin
                  ? "Submit a requisition on behalf of any site warehouse."
                  : `Scoped to your site: ${activeWarehouse?.name ?? "Assigned Site"}`}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Requesting Warehouse / Site
              </label>
              <select
                value={reqWarehouseId}
                onChange={(e) => setReqWarehouseId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              >
                {opsState.warehouses.map((w) => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.name} ({w.project_id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600">
              Material (by ID &amp; UOM)
            </label>
            <select
              value={reqItemCode}
              onChange={(e) => setReqItemCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
            >
              {allMaterials.map((m) => (
                <option key={m.item_code} value={m.item_code}>
                  {m.item_code} — {m.item_name} ({m.unit}, LT {m.lead_time_days}d)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Quantity ({selectedReqMat?.unit ?? "QTY"})
              </label>
              <input
                type="number"
                step="any"
                min={0.05}
                required
                value={reqQty}
                onChange={(e) => setReqQty(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Urgency
              </label>
              <select
                value={reqUrgency}
                onChange={(e) =>
                  setReqUrgency(e.target.value as "HIGH" | "MEDIUM" | "LOW")
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="HIGH">HIGH (Immediate)</option>
                <option value="MEDIUM">MEDIUM (This Month)</option>
                <option value="LOW">LOW (Planned Buffer)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600">
              Site Justification
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Feeder gang waiting for poles / clamp sets..."
              value={reqNotes}
              onChange={(e) => setReqNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" /> Send Request to Head of Projects
          </button>
        </form>

        {/* Right: Requisition Queue & Head of Projects Fulfillment Console */}
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isAdmin
                  ? "Head of Projects — Requisition Approval & Fulfillment Queue"
                  : `Site Requisition & Transfer Status (${activeWarehouse?.name ?? ""})`}
              </h3>
              <p className="text-[11px] text-slate-500">
                Head approves via new vendor PO or inter-site transfer; donor site
                manager consent is mandatory before pickup.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700">
              {visibleRequisitions.length} Record
              {visibleRequisitions.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {visibleRequisitions.map((req) => {
              const badge = statusBadge(req.status);
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

              // Find donor manager for quick demo switch button
              const donorManager = req.donor_warehouse_id
                ? opsState.staff.find(
                    (s) => s.warehouse_id === req.donor_warehouse_id
                  )
                : null;

              return (
                <article
                  key={req.req_id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {req.req_id}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {req.urgency}
                        </span>
                      </div>
                      <div className="mt-1.5 text-xs font-bold text-slate-900">
                        {formatQty(req.qty, req.unit)} of {req.item_code} —{" "}
                        {req.item_name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-600">
                        Site:{" "}
                        <strong>{shortGodownName(req.requesting_warehouse_name)}</strong>{" "}
                        • Requested by {req.requested_by_name} on {req.created_at}
                      </div>
                      <p className="mt-1 text-[11px] italic text-slate-500">
                        &ldquo;{req.notes}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Donor Transfer Info & Consent Lock Status */}
                  {req.donor_warehouse_name && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-sky-600" />
                        <span className="font-semibold text-slate-800">
                          {shortGodownName(req.donor_warehouse_name)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="font-semibold text-emerald-800">
                          {shortGodownName(req.requesting_warehouse_name)}
                        </span>
                        {req.transfer_distance_km !== undefined && (
                          <span className="font-mono text-slate-500">
                            ({req.transfer_distance_km} km ·{" "}
                            {getTransitDays(req.transfer_distance_km)}d)
                          </span>
                        )}
                        {req.donor_selection_mode === "LP_RECOMMENDED" && (
                          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                            LP Recommended
                          </span>
                        )}
                      </div>

                      {req.status === "PENDING_DONOR_CONSENT" &&
                        isAdmin &&
                        donorManager && (
                          <button
                            type="button"
                            onClick={() => onSwitchToStaff(donorManager.staff_id)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-1 cursor-pointer"
                          >
                            <Lock className="h-3 w-3" /> Switch to{" "}
                            {donorManager.name} to Consent
                          </button>
                        )}
                    </div>
                  )}

                  {req.donor_decision_note && (
                    <div className="mt-1.5 text-[11px] text-slate-600">
                      <strong>Donor Manager Note:</strong> {req.donor_decision_note}
                    </div>
                  )}

                  {/* Head of Projects Decision Controls */}
                  {canHeadAct && (
                    <div className="mt-3 space-y-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                          Head of Projects Fulfillment Action
                        </span>
                        <div className="inline-flex flex-wrap rounded-md border border-amber-300 bg-white p-0.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              setFulfillModeByReq((prev) => ({
                                ...prev,
                                [req.req_id]: "TRANSFER",
                              }))
                            }
                            className={`rounded px-2.5 py-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer ${
                              mode === "TRANSFER"
                                ? "bg-slate-900 text-white"
                                : "text-slate-700"
                            }`}
                          >
                            Route from Site (Needs Consent)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFulfillModeByReq((prev) => ({
                                ...prev,
                                [req.req_id]: "VENDOR",
                              }))
                            }
                            className={`rounded px-2.5 py-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer ${
                              mode === "VENDOR"
                                ? "bg-slate-900 text-white"
                                : "text-slate-700"
                            }`}
                          >
                            Create New Vendor Order
                          </button>
                        </div>
                      </div>

                      {mode === "TRANSFER" ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={chosenDonorId}
                            onChange={(e) =>
                              setSelectedDonorByReq((prev) => ({
                                ...prev,
                                [req.req_id]: e.target.value,
                              }))
                            }
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
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
                                  <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {isRec ? "★ LP Recommended: " : "Custom: "}
                                    {shortGodownName(w.name)} — On Hand:{" "}
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
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
                          >
                            <Lock className="h-3.5 w-3.5" /> Request Donor Consent
                          </button>
                          <button
                            type="button"
                            onClick={() => onHeadReject(req.req_id)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={chosenSupId}
                            onChange={(e) =>
                              setSelectedSupplierByReq((prev) => ({
                                ...prev,
                                [req.req_id]: e.target.value,
                              }))
                            }
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          >
                            {opsState.suppliers.map((s) => (
                              <option key={s.supplier_id} value={s.supplier_id}>
                                {s.supplier_id} — {s.name} (avg {s.avg_delivery_days}d ·{" "}
                                {s.on_time_rate_pct}% on-time)
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
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 cursor-pointer"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" /> Issue Vendor PO
                          </button>
                          <button
                            type="button"
                            onClick={() => onHeadReject(req.req_id)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 cursor-pointer"
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

      {/* Bottom Row: Vendor Lead-Time & Delivery Monitor + Site Ownership Audit Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Vendor Lead-Time & Delivery Tracker */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Vendor Order Lead-Time &amp; Delivery Time Monitor
              </h3>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {visibleOrders.length} PO{visibleOrders.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-2.5 py-2 text-left font-semibold">PO / Site</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Item &amp; Qty</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Supplier ID</th>
                  <th className="px-2.5 py-2 text-right font-semibold">Lead / ETA</th>
                  <th className="px-2.5 py-2 text-right font-semibold">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleOrders.map((po) => {
                  const variance =
                    po.actual_delivery_days !== undefined
                      ? po.actual_delivery_days - po.promised_lead_time_days
                      : null;
                  return (
                    <tr key={po.order_id} className="hover:bg-slate-50">
                      <td className="px-2.5 py-2">
                        <div className="font-mono font-bold text-slate-900">
                          {po.order_id}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {shortGodownName(po.destination_warehouse_name)}
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="font-semibold text-slate-900">
                          {formatQty(po.qty, po.unit)}
                        </div>
                        <div className="max-w-[180px] truncate text-[11px] text-slate-500">
                          {po.item_code} · {po.item_name}
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="font-mono text-[11px] font-semibold text-slate-800">
                          {po.supplier_id}
                        </div>
                        <div className="max-w-[140px] truncate text-[11px] text-slate-500">
                          {po.supplier_name}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-800">
                          {po.promised_lead_time_days}d LT
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ETA {po.expected_delivery_date}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        {po.status === "DELIVERED" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <PackageCheck className="h-3 w-3" /> Delivered (
                              {po.actual_delivery_days}d)
                            </span>
                            {variance !== null && (
                              <div
                                className={`mt-0.5 font-mono text-[10px] ${
                                  variance <= 0
                                    ? "text-emerald-700"
                                    : "text-rose-700"
                                }`}
                              >
                                {variance <= 0
                                  ? `${Math.abs(variance)}d early`
                                  : `+${variance}d delayed`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                              {po.status}
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                placeholder={`${po.promised_lead_time_days}d`}
                                value={deliveryDaysInput[po.order_id] ?? ""}
                                onChange={(e) =>
                                  setDeliveryDaysInput((prev) => ({
                                    ...prev,
                                    [po.order_id]: e.target.value,
                                  }))
                                }
                                className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-right font-mono text-[10px]"
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
                                className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1 cursor-pointer"
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
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Site Property &amp; Consent Ledger
            </h3>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Immutable audit of material custody changes &amp; site manager
            approvals.
          </p>

          <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
            {visibleLedger.map((entry) => (
              <div
                key={entry.entry_id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px]"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-800">
                    {shortGodownName(entry.warehouse_name)}
                  </span>
                  <span
                    className={`font-bold ${
                      entry.qty_delta >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {entry.qty_delta >= 0 ? "+" : ""}
                    {formatQty(entry.qty_delta, entry.unit)}
                  </span>
                </div>
                <div className="mt-0.5 text-slate-700">
                  {entry.item_code} • {entry.source.replace(/_/g, " ")}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  Authorized by: {entry.consent_by} ({entry.timestamp})
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
