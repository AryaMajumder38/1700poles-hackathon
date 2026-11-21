"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
} from "lucide-react";
import type {
  ActiveGodown,
  MetadataPayload,
  SimulationAction,
  SimulationDecision,
} from "@/types/lumino";
import ActionCardsGrid from "./ActionCardsGrid";
import AdminMasterDataPanel from "./AdminMasterDataPanel";
import {
  CornerMarks,
  FadingRulesDivider,
  HexFontLoader,
  PrimaryPlateButton,
} from "./HexPrimitives";
import IdleStockChart from "./IdleStockChart";
import MonthScrubber, { type DecisionFilter } from "./MonthScrubber";
import "./plannerHex.css";
import RequisitionWorkflowPanel from "./RequisitionWorkflowPanel";
import RoleAccessBar, { type PlannerSubTab } from "./RoleAccessBar";
import TheBarScorecard from "./TheBarScorecard";
import TransferLogisticsPanel from "./TransferLogisticsPanel";
import {
  addDaysToDate,
  createInitialOpsState,
  getAllCatalogMaterials,
  loadOpsState,
  OPS_STORAGE_KEY,
  saveOpsState,
  type OpsMaterial,
  type OpsProject,
  type OpsStaffMember,
  type OpsStoreState,
  type OpsSupplier,
  type OpsWarehouse,
  type UserRoleType,
} from "./opsTypes";
import {
  collectTransfersFromActions,
  FLAGSHIP_ITEM_CODE,
  shortGodownName,
  type PlannerBacktestComparison,
} from "./plannerTypes";
import {
  DEFAULT_ADMIN_SESSION,
  OPS_CHANGE_EVENT,
  useRbacSession,
} from "./rbacBridge";

export interface PlannerViewProps {
  /** Retained for caller compatibility with page.tsx */
  hideProfileSwitcher?: boolean;
}

export default function PlannerView(props: PlannerViewProps = {}) {
  void props.hideProfileSwitcher;
  const [metadata, setMetadata] = useState<MetadataPayload | null>(null);
  const [actions, setActions] = useState<SimulationAction[]>([]);
  const [summaries, setSummaries] = useState<PlannerBacktestComparison[]>([]);
  const [opsState, setOpsState] = useState<OpsStoreState | null>(null);
  const opsStateRef = useRef<OpsStoreState | null>(null);
  const selfOpsDispatchRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shared RBAC Session synced with global NavbarProfileDropdown (No login wall)
  const { session: rbacSession, setSession: setRbacSession } = useRbacSession();
  const roleType: UserRoleType = rbacSession.roleType;
  const activeStaffId: string | null = rbacSession.staffId;
  const [activeSubTab, setActiveSubTab] = useState<PlannerSubTab>("replay");

  // Causal Replay State
  const [selectedItemCode, setSelectedItemCode] =
    useState<string>(FLAGSHIP_ITEM_CODE);
  const [monthIndex, setMonthIndex] = useState<number>(8); // 2023-11: rich transfer + order activity
  const [selectedGodown, setSelectedGodown] = useState<"ALL" | ActiveGodown>(
    "ALL"
  );
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("ALL");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAllMatrix, setShowAllMatrix] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPlannerData() {
      try {
        const [metaRes, simRes, btRes] = await Promise.all([
          fetch("/data/metadata.json"),
          fetch("/data/simulation_default.json"),
          fetch("/data/backtest_summary.json"),
        ]);

        if (!metaRes.ok || !simRes.ok || !btRes.ok) {
          throw new Error(
            "Failed to load Track C simulation JSONs from /data/."
          );
        }

        const [metaJson, simJson, btJson] = (await Promise.all([
          metaRes.json(),
          simRes.json(),
          btRes.json(),
        ])) as [
          MetadataPayload,
          SimulationAction[],
          PlannerBacktestComparison[]
        ];

        if (!cancelled) {
          const initialOps = loadOpsState(metaJson.godowns, metaJson.items);
          opsStateRef.current = initialOps;
          setMetadata(metaJson);
          setActions(simJson);
          setSummaries(btJson);
          setOpsState(initialOps);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unknown simulation load error"
          );
          setLoading(false);
        }
      }
    }

    loadPlannerData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    opsStateRef.current = opsState;
  }, [opsState]);

  useEffect(() => {
    if (!metadata) return;
    const syncOpsFromStorage = () => {
      if (selfOpsDispatchRef.current) return;
      const latest = loadOpsState(metadata.godowns, metadata.items);
      opsStateRef.current = latest;
      setOpsState(latest);
    };
    const onStorage = (evt: StorageEvent) => {
      if (evt.key !== null && evt.key !== OPS_STORAGE_KEY) return;
      syncOpsFromStorage();
    };
    window.addEventListener(OPS_CHANGE_EVENT, syncOpsFromStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(OPS_CHANGE_EVENT, syncOpsFromStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [metadata]);

  const persistOpsState = (next: OpsStoreState) => {
    selfOpsDispatchRef.current = true;
    try {
      saveOpsState(next);
    } finally {
      selfOpsDispatchRef.current = false;
    }
  };

  const updateOps = (updater: (prev: OpsStoreState) => OpsStoreState) => {
    const current = opsStateRef.current;
    if (!current) return;
    const next = updater(current);
    if (next === current) return;
    opsStateRef.current = next;
    setOpsState(next);
    persistOpsState(next);
  };

  const months = useMemo(
    () => metadata?.date_range.months ?? [],
    [metadata]
  );

  useEffect(() => {
    if (!isPlaying || months.length === 0) return;
    const lastIndex = months.length - 1;
    if (monthIndex >= lastIndex) {
      const stopTimer = window.setTimeout(() => setIsPlaying(false), 0);
      return () => window.clearTimeout(stopTimer);
    }
    const timer = window.setTimeout(() => {
      const nextIndex = Math.min(lastIndex, monthIndex + 1);
      setMonthIndex(nextIndex);
      if (nextIndex >= lastIndex) {
        setIsPlaying(false);
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [isPlaying, monthIndex, months.length]);

  const activeMonth = months[monthIndex] ?? "2023-03";

  // Active RBAC staff & assigned warehouse
  const activeStaff = useMemo(() => {
    if (roleType === "ADMIN_HEAD" || !opsState || !activeStaffId) return null;
    return opsState.staff.find((s) => s.staff_id === activeStaffId) ?? null;
  }, [roleType, opsState, activeStaffId]);

  const activeStaffWarehouse = useMemo(() => {
    if (!activeStaff || !opsState) return null;
    return (
      opsState.warehouses.find(
        (w) => w.warehouse_id === activeStaff.warehouse_id
      ) ?? null
    );
  }, [activeStaff, opsState]);

  const lockedGodownName =
    roleType === "SITE_MANAGER" ? activeStaffWarehouse?.name ?? null : null;

  const selectedItem = useMemo(() => {
    if (!metadata) return null;
    return (
      metadata.items.find((i) => i.item_code === selectedItemCode) ??
      metadata.items[0] ??
      null
    );
  }, [metadata, selectedItemCode]);

  const selectedSummary = useMemo(() => {
    return (
      summaries.find((s) => s.item_code === selectedItemCode) ??
      summaries[0] ??
      null
    );
  }, [summaries, selectedItemCode]);

  // Apply live operational stock adjustments from approved transfers & deliveries
  const itemActions = useMemo(() => {
    const base = actions.filter((a) => a.item_code === selectedItemCode);
    if (!opsState) return base;
    return base.map((a) => {
      const adj =
        opsState.liveStockAdjustments[`${a.godown}::${a.item_code}`] ?? 0;
      if (adj === 0) return a;
      return {
        ...a,
        godown_on_hand: Math.max(
          0,
          Number((a.godown_on_hand + adj).toFixed(3))
        ),
      };
    });
  }, [actions, selectedItemCode, opsState]);

  const monthActionsAllGodowns = useMemo(
    () => itemActions.filter((a) => a.month === activeMonth),
    [itemActions, activeMonth]
  );

  const activeMonthAllItemsActions = useMemo(
    () => actions.filter((a) => a.month === activeMonth),
    [actions, activeMonth]
  );

  const rbacScopedMonthActions = useMemo(() => {
    if (!lockedGodownName) return monthActionsAllGodowns;
    return monthActionsAllGodowns.filter((a) => a.godown === lockedGodownName);
  }, [monthActionsAllGodowns, lockedGodownName]);

  const godownScopedMonthActions = useMemo(() => {
    if (lockedGodownName || selectedGodown === "ALL") {
      return rbacScopedMonthActions;
    }
    return rbacScopedMonthActions.filter((a) => a.godown === selectedGodown);
  }, [rbacScopedMonthActions, lockedGodownName, selectedGodown]);

  const decisionCounts = useMemo(() => {
    const counts: Record<SimulationDecision, number> = {
      ORDER: 0,
      HOLD: 0,
      TRANSFER_IN: 0,
      TRANSFER_OUT: 0,
      WAIT: 0,
    };
    for (const a of godownScopedMonthActions) {
      counts[a.decision] += 1;
    }
    return counts;
  }, [godownScopedMonthActions]);

  const filteredMonthActions = useMemo(() => {
    return godownScopedMonthActions.filter((a) => {
      if (decisionFilter === "ALL") return true;
      if (decisionFilter === "TRANSFER") {
        return a.decision === "TRANSFER_IN" || a.decision === "TRANSFER_OUT";
      }
      return a.decision === decisionFilter;
    });
  }, [godownScopedMonthActions, decisionFilter]);

  const scopedMonthAction = lockedGodownName
    ? rbacScopedMonthActions[0] ?? null
    : null;

  const contractorIdleStock =
    monthActionsAllGodowns[0]?.contractor_idle_stock ?? 0;

  const totalProjectedDemand = useMemo(
    () =>
      monthActionsAllGodowns.reduce(
        (acc, a) => acc + a.projected_monthly_demand,
        0
      ),
    [monthActionsAllGodowns]
  );

  const monthTransferRoutes = useMemo(() => {
    const routes = collectTransfersFromActions(monthActionsAllGodowns);
    if (!lockedGodownName) return routes;
    return routes.filter(
      (r) =>
        r.from_godown === lockedGodownName || r.to_godown === lockedGodownName
    );
  }, [monthActionsAllGodowns, lockedGodownName]);

  const allItemTransferRoutes = useMemo(() => {
    const routes = collectTransfersFromActions(itemActions);
    if (!lockedGodownName) return routes;
    return routes.filter(
      (r) =>
        r.from_godown === lockedGodownName || r.to_godown === lockedGodownName
    );
  }, [itemActions, lockedGodownName]);

  // Notification counts for RoleAccessBar
  const pendingHeadCount = useMemo(
    () =>
      opsState
        ? opsState.requisitions.filter(
            (r) =>
              r.status === "PENDING_HEAD_APPROVAL" ||
              r.status === "DONOR_DECLINED_REROUTE"
          ).length
        : 0,
    [opsState]
  );

  const pendingConsentForUserCount = useMemo(() => {
    if (!opsState || !activeStaffWarehouse) return 0;
    return opsState.requisitions.filter(
      (r) =>
        r.status === "PENDING_DONOR_CONSENT" &&
        r.donor_warehouse_id === activeStaffWarehouse.warehouse_id
    ).length;
  }, [opsState, activeStaffWarehouse]);

  const activeDeliveriesCount = useMemo(
    () =>
      opsState
        ? opsState.vendorOrders.filter((po) => po.status !== "DELIVERED").length
        : 0,
    [opsState]
  );

  // Operational Handlers
  const handleAddMaterialAndSupplier = (
    material: OpsMaterial,
    newSupplier?: OpsSupplier
  ) => {
    updateOps((prev) => ({
      ...prev,
      suppliers: newSupplier ? [...prev.suppliers, newSupplier] : prev.suppliers,
      customMaterials: [...prev.customMaterials, material],
      materialSupplierMap: {
        ...prev.materialSupplierMap,
        [material.item_code]: {
          supplier_id: material.supplier_id,
          supplier_name: material.supplier_name,
        },
      },
    }));
  };

  const handleAddProject = (project: OpsProject) => {
    updateOps((prev) => ({
      ...prev,
      projects: [...prev.projects, project],
    }));
  };

  const handleAddWarehouse = (warehouse: OpsWarehouse) => {
    updateOps((prev) => ({
      ...prev,
      warehouses: [...prev.warehouses, warehouse],
    }));
  };

  const handleAddStaff = (member: OpsStaffMember) => {
    updateOps((prev) => ({
      ...prev,
      staff: [...prev.staff, member],
    }));
  };

  const handleCreateRequisition = (payload: {
    warehouse_id: string;
    item_code: string;
    qty: number;
    urgency: "HIGH" | "MEDIUM" | "LOW";
    notes: string;
  }) => {
    if (!metadata || !opsState) return;
    const wh = opsState.warehouses.find(
      (w) => w.warehouse_id === payload.warehouse_id
    );
    const catalog = getAllCatalogMaterials(metadata.items, opsState);
    const mat = catalog.find((m) => m.item_code === payload.item_code);
    if (!wh || !mat) return;

    const today = new Date().toISOString().slice(0, 10);
    const requesterName = activeStaff?.name ?? "Head Admin";
    const requesterId = activeStaff?.staff_id ?? "ADMIN-HEAD";

    updateOps((prev) => ({
      ...prev,
      requisitions: [
        {
          req_id: `REQ-2026-${103 + prev.requisitions.length}`,
          created_at: today,
          project_id: wh.project_id,
          requesting_warehouse_id: wh.warehouse_id,
          requesting_warehouse_name: wh.name,
          requested_by_staff_id: requesterId,
          requested_by_name: requesterName,
          item_code: mat.item_code,
          item_name: mat.item_name,
          unit: mat.unit,
          qty: payload.qty,
          urgency: payload.urgency,
          notes: payload.notes,
          status: "PENDING_HEAD_APPROVAL",
        },
        ...prev.requisitions,
      ],
    }));
  };

  const handleHeadOrderVendor = (
    reqId: string,
    supplierId: string,
    leadTimeDays: number
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    updateOps((prev) => {
      const req = prev.requisitions.find((r) => r.req_id === reqId);
      const sup = prev.suppliers.find((s) => s.supplier_id === supplierId);
      if (!req || !sup) return prev;
      const poId = `PO-2026-${402 + prev.vendorOrders.length}`;

      return {
        ...prev,
        requisitions: prev.requisitions.map((r) =>
          r.req_id === reqId
            ? {
                ...r,
                status: "FULFILLED_BY_VENDOR_ORDER",
                linked_order_id: poId,
                head_decision_at: today,
              }
            : r
        ),
        vendorOrders: [
          {
            order_id: poId,
            req_id: req.req_id,
            project_id: req.project_id,
            destination_warehouse_id: req.requesting_warehouse_id,
            destination_warehouse_name: req.requesting_warehouse_name,
            item_code: req.item_code,
            item_name: req.item_name,
            unit: req.unit,
            qty: req.qty,
            supplier_id: sup.supplier_id,
            supplier_name: sup.name,
            ordered_date: today,
            promised_lead_time_days: leadTimeDays,
            expected_delivery_date: addDaysToDate(today, leadTimeDays),
            status: "ORDERED",
          },
          ...prev.vendorOrders,
        ],
      };
    });
  };

  const handleHeadRouteTransfer = (
    reqId: string,
    donorWarehouseId: string,
    mode: "LP_RECOMMENDED" | "CUSTOM",
    distanceKm: number
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    updateOps((prev) => {
      const donor = prev.warehouses.find(
        (w) => w.warehouse_id === donorWarehouseId
      );
      if (!donor) return prev;
      return {
        ...prev,
        requisitions: prev.requisitions.map((r) =>
          r.req_id === reqId
            ? {
                ...r,
                status: "PENDING_DONOR_CONSENT",
                donor_warehouse_id: donor.warehouse_id,
                donor_warehouse_name: donor.name,
                donor_selection_mode: mode,
                transfer_distance_km: distanceKm,
                donor_decision_note: undefined,
                head_decision_at: today,
              }
            : r
        ),
      };
    });
  };

  const handleHeadReject = (reqId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    updateOps((prev) => ({
      ...prev,
      requisitions: prev.requisitions.map((r) =>
        r.req_id === reqId
          ? { ...r, status: "REJECTED_BY_HEAD", head_decision_at: today }
          : r
      ),
    }));
  };

  const handleDonorConsentDecision = (
    reqId: string,
    approved: boolean,
    note: string
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    const managerName = activeStaff?.name ?? "Site Manager";

    updateOps((prev) => {
      const req = prev.requisitions.find((r) => r.req_id === reqId);
      if (!req || !req.donor_warehouse_name) return prev;

      if (!approved) {
        return {
          ...prev,
          requisitions: prev.requisitions.map((r) =>
            r.req_id === reqId
              ? {
                  ...r,
                  status: "DONOR_DECLINED_REROUTE",
                  donor_decision_note: `${managerName}: ${note}`,
                }
              : r
          ),
        };
      }

      const donorKey = `${req.donor_warehouse_name}::${req.item_code}`;
      const recvKey = `${req.requesting_warehouse_name}::${req.item_code}`;

      return {
        ...prev,
        requisitions: prev.requisitions.map((r) =>
          r.req_id === reqId
            ? {
                ...r,
                status: "TRANSFER_APPROVED_DISPATCHED",
                donor_decision_note: `${managerName}: ${note}`,
              }
            : r
        ),
        liveStockAdjustments: {
          ...prev.liveStockAdjustments,
          [donorKey]: (prev.liveStockAdjustments[donorKey] ?? 0) - req.qty,
          [recvKey]: (prev.liveStockAdjustments[recvKey] ?? 0) + req.qty,
        },
        ownershipLedger: [
          {
            entry_id: `OWN-${Date.now().toString().slice(-4)}-IN`,
            timestamp: today,
            warehouse_name: req.requesting_warehouse_name,
            item_code: req.item_code,
            unit: req.unit,
            qty_delta: req.qty,
            source: "INTER_SITE_TRANSFER_IN",
            consent_by: `${managerName} (Donor Consent Granted)`,
            reference_id: req.req_id,
          },
          {
            entry_id: `OWN-${Date.now().toString().slice(-4)}-OUT`,
            timestamp: today,
            warehouse_name: req.donor_warehouse_name,
            item_code: req.item_code,
            unit: req.unit,
            qty_delta: -req.qty,
            source: "INTER_SITE_TRANSFER_OUT",
            consent_by: `${managerName} (Released Site Property)`,
            reference_id: req.req_id,
          },
          ...prev.ownershipLedger,
        ],
      };
    });
  };

  const handleMarkOrderDelivered = (orderId: string, actualDays: number) => {
    const today = new Date().toISOString().slice(0, 10);
    updateOps((prev) => {
      const po = prev.vendorOrders.find((o) => o.order_id === orderId);
      if (!po || po.status === "DELIVERED") return prev;
      const destKey = `${po.destination_warehouse_name}::${po.item_code}`;
      const siteMgr = prev.staff.find(
        (s) => s.warehouse_id === po.destination_warehouse_id
      );

      return {
        ...prev,
        vendorOrders: prev.vendorOrders.map((o) =>
          o.order_id === orderId
            ? {
                ...o,
                status: "DELIVERED",
                actual_delivery_days: actualDays,
                delivered_date: today,
              }
            : o
        ),
        liveStockAdjustments: {
          ...prev.liveStockAdjustments,
          [destKey]: (prev.liveStockAdjustments[destKey] ?? 0) + po.qty,
        },
        ownershipLedger: [
          {
            entry_id: `OWN-${Date.now().toString().slice(-4)}-PO`,
            timestamp: today,
            warehouse_name: po.destination_warehouse_name,
            item_code: po.item_code,
            unit: po.unit,
            qty_delta: po.qty,
            source: "VENDOR_DELIVERY",
            consent_by: `${siteMgr?.name ?? "Site Manager"} (Locked as Site Property)`,
            reference_id: po.order_id,
          },
          ...prev.ownershipLedger,
        ],
      };
    });
  };

  const switchToAdmin = () => {
    setRbacSession(DEFAULT_ADMIN_SESSION);
  };

  const switchToStaff = (staffId: string) => {
    const member = opsState?.staff.find((s) => s.staff_id === staffId);
    const wh = member
      ? opsState?.warehouses.find((w) => w.warehouse_id === member.warehouse_id)
      : null;
    setRbacSession({
      roleType: "SITE_MANAGER",
      staffId,
      staffName: member?.name ?? "Site Manager",
      staffTitle: member?.title ?? "Site Manager",
      warehouseId: member?.warehouse_id ?? null,
      warehouseName: wh?.name ?? null,
      projectId: member?.project_id ?? null,
    });
    setDecisionFilter("ALL");
  };

  const handleResetDemo = () => {
    if (!metadata) return;
    const fresh = createInitialOpsState(metadata.godowns, metadata.items);
    opsStateRef.current = fresh;
    setOpsState(fresh);
    persistOpsState(fresh);
    switchToAdmin();
  };

  const handleTogglePlay = () => {
    if (!isPlaying && monthIndex >= months.length - 1) {
      setMonthIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSelectMonthByString = (m: string) => {
    const idx = months.indexOf(m);
    if (idx !== -1) {
      setIsPlaying(false);
      setMonthIndex(idx);
    }
  };

  if (loading) {
    return (
      <div className="hex-planner p-14">
        <HexFontLoader />
        <div className="hp-noise" />
        <div className="relative z-10 flex items-center justify-center gap-3 text-sm font-light text-[#43394c]">
          <Loader2 className="h-4 w-4 animate-spin text-[#a98529]" />
          <span className="hp-mono text-xs">
            Loading 44-month causal replay &amp; Stage A LP simulation...
          </span>
        </div>
      </div>
    );
  }

  if (error || !metadata || !selectedItem || !selectedSummary || !opsState) {
    return (
      <div className="hex-planner p-8">
        <HexFontLoader />
        <div className="hp-noise" />
        <div className="relative z-10 flex items-start gap-3 border border-[#b43c57]/35 bg-[#fcf8f8] p-5 text-sm text-[#b43c57]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="hp-heading font-bold text-[#14141c]">
              Unable to load Planner simulation
            </div>
            <p className="mt-1 text-xs font-light text-[#43394c]">
              {error ?? "Missing pre-aggregated JSON payloads in /public/data/."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Persistent Top RBAC Scope & Sub-Navigation Bar */}
      <RoleAccessBar
        roleType={roleType}
        activeStaffId={activeStaffId}
        staff={opsState.staff}
        warehouses={opsState.warehouses}
        projects={opsState.projects}
        activeSubTab={activeSubTab}
        onChangeSubTab={setActiveSubTab}
        pendingHeadCount={pendingHeadCount}
        pendingConsentForUserCount={pendingConsentForUserCount}
        activeDeliveriesCount={activeDeliveriesCount}
        onResetDemo={handleResetDemo}
      />

      {/* SUB-TAB 1: Hex-Styled Causal Replay & The Bar (RBAC-Scoped for Site Managers) */}
      {activeSubTab === "replay" && (
        <div className="hex-planner">
          <HexFontLoader />
          <div className="hp-noise" />
          <CornerMarks tone="light" />

          {lockedGodownName && (
            <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 sm:px-9">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-sky-700" />
                <span>
                  <strong>Site-Scoped Analytics Active:</strong> Viewing strictly{" "}
                  <strong>{shortGodownName(lockedGodownName)}</strong> (
                  {activeStaffWarehouse?.project_id}). Other sites&apos; yards are
                  hidden under RBAC.
                </span>
              </div>
              {pendingConsentForUserCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab("workflow")}
                  className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 cursor-pointer"
                >
                  Review {pendingConsentForUserCount} Pickup Consent Request
                </button>
              )}
            </div>
          )}

          {/* 1. Compact Toolbar Header — Metrics First, Zero Fluff */}
          <header className="relative px-4 py-4 sm:px-7">
            <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="hp-heading text-lg font-extrabold text-[#14141c] whitespace-nowrap">
                  Ordering Planner
                </h2>
                <span className="hp-italic text-[21px] text-[#31263b] whitespace-nowrap">
                  causal replay
                </span>
              </div>

              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
                <select
                  id="planner-item-select"
                  aria-label="Select tracked material"
                  value={selectedItemCode}
                  onChange={(e) => {
                    setSelectedItemCode(e.target.value);
                    setDecisionFilter("ALL");
                  }}
                  className="hp-select sm:w-72"
                >
                  {metadata.items.map((it) => (
                    <option key={it.item_code} value={it.item_code}>
                      {it.item_code} — {it.item_name} ({it.unit})
                    </option>
                  ))}
                </select>

                <PrimaryPlateButton
                  variant="light"
                  onClick={() => setShowAllMatrix((prev) => !prev)}
                >
                  {showAllMatrix ? (
                    <>
                      Hide SKUs
                      <ChevronUp className="h-3.5 w-3.5 text-[#43394c]" />
                    </>
                  ) : (
                    <>
                      All 16 SKUs
                      <ChevronDown className="h-3.5 w-3.5 text-[#43394c]" />
                    </>
                  )}
                </PrimaryPlateButton>
              </div>
            </div>
          </header>

          {/* 2. Continuous 4-Column Ruled Proof Strip ("The Bar") + Optional Matrix */}
          <TheBarScorecard
            selected={selectedSummary}
            allSummaries={summaries}
            onSelectItem={(code) => {
              setSelectedItemCode(code);
              setDecisionFilter("ALL");
            }}
            showAllMatrix={showAllMatrix}
            scopedGodown={lockedGodownName}
            scopedMonthAction={scopedMonthAction}
            scopedTransferCount={allItemTransferRoutes.length}
          />

          {/* 3. Airy Workspace Body */}
          <div className="relative z-10 space-y-9 px-4 py-7 sm:space-y-12 sm:px-9 sm:py-11">
            <IdleStockChart
              summary={selectedSummary}
              activeMonth={activeMonth}
              onSelectMonth={handleSelectMonthByString}
              scopedGodown={lockedGodownName}
              footerSlot={
                <MonthScrubber
                  months={months}
                  monthIndex={monthIndex}
                  onChangeMonthIndex={(idx) => {
                    setIsPlaying(false);
                    setMonthIndex(idx);
                  }}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                  selectedItem={selectedItem}
                  contractorIdleStock={contractorIdleStock}
                  totalProjectedDemand={totalProjectedDemand}
                  scopedGodown={lockedGodownName}
                  scopedProjectedDemand={
                    scopedMonthAction?.projected_monthly_demand ?? null
                  }
                />
              }
            />

            {/* Monthly Godown Decisions (RBAC-Scoped) */}
            <ActionCardsGrid
              actions={filteredMonthActions}
              activeMonth={activeMonth}
              godowns={metadata.godowns}
              selectedGodown={selectedGodown}
              onChangeGodown={setSelectedGodown}
              lockedGodown={lockedGodownName}
              decisionFilter={decisionFilter}
              onChangeDecisionFilter={setDecisionFilter}
              decisionCounts={decisionCounts}
            />

            {/* Stage A LP Transfer Logistics (RBAC-Scoped) */}
            <TransferLogisticsPanel
              monthRoutes={monthTransferRoutes}
              allItemRoutes={allItemTransferRoutes}
              activeMonth={activeMonth}
              unit={selectedItem.unit}
              leadTimeDays={selectedItem.lead_time_days}
              scopedGodown={lockedGodownName}
            />

            <div className="space-y-4 pt-2">
              <FadingRulesDivider />
              <footer className="hp-mono flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.07em] text-[#89828d]">
                <span>
                  Lumino · Plan It · Strictly causal (t_obs ≤ t) · 6 Active
                  Kanpur Godowns
                </span>
                <span>
                  {metadata.date_range.start} → {metadata.date_range.end} ·
                  Receipts end {metadata.date_range.receipts_end} · Native UOMs
                </span>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Material Requisitions, Head Routing, Donor Site Consent & Lead-Time Monitor */}
      {activeSubTab === "workflow" && (
        <RequisitionWorkflowPanel
          roleType={roleType}
          activeStaffId={activeStaffId}
          baseItems={metadata.items}
          opsState={opsState}
          latestMonthActions={activeMonthAllItemsActions}
          activeMonth={activeMonth}
          onCreateRequisition={handleCreateRequisition}
          onHeadOrderVendor={handleHeadOrderVendor}
          onHeadRouteTransfer={handleHeadRouteTransfer}
          onHeadReject={handleHeadReject}
          onDonorConsentDecision={handleDonorConsentDecision}
          onMarkOrderDelivered={handleMarkOrderDelivered}
          onSwitchToStaff={switchToStaff}
        />
      )}

      {/* SUB-TAB 3: Admin Master Data & RBAC Registry */}
      {activeSubTab === "admin" && (
        <AdminMasterDataPanel
          roleType={roleType}
          baseItems={metadata.items}
          opsState={opsState}
          onAddMaterialAndSupplier={handleAddMaterialAndSupplier}
          onAddProject={handleAddProject}
          onAddWarehouse={handleAddWarehouse}
          onAddStaff={handleAddStaff}
          onSwitchToAdmin={switchToAdmin}
        />
      )}
    </div>
  );
}
