"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Lock } from "lucide-react";
import type {
  ActiveGodown,
  MetadataPayload,
  SimulationAction,
  SimulationDecision,
} from "@/types/lumino";
import ActionCardsGrid from "./ActionCardsGrid";
import AdminMasterDataPanel from "./AdminMasterDataPanel";
import IdleStockChart from "./IdleStockChart";
import MonthScrubber, { type DecisionFilter } from "./MonthScrubber";
import RequisitionWorkflowPanel from "./RequisitionWorkflowPanel";
import RoleAccessBar, { type PlannerSubTab } from "./RoleAccessBar";
import TheBarScorecard from "./TheBarScorecard";
import TransferLogisticsPanel from "./TransferLogisticsPanel";
import {
  addDaysToDate,
  createInitialOpsState,
  getAllCatalogMaterials,
  loadOpsState,
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

export default function PlannerView() {
  const [metadata, setMetadata] = useState<MetadataPayload | null>(null);
  const [actions, setActions] = useState<SimulationAction[]>([]);
  const [summaries, setSummaries] = useState<PlannerBacktestComparison[]>([]);
  const [opsState, setOpsState] = useState<OpsStoreState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // RBAC & Sub-view state (instant role switcher, zero login wall)
  const [roleType, setRoleType] = useState<UserRoleType>("ADMIN_HEAD");
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<PlannerSubTab>("replay");

  // Causal Replay controls
  const [selectedItemCode, setSelectedItemCode] =
    useState<string>(FLAGSHIP_ITEM_CODE);
  const [monthIndex, setMonthIndex] = useState<number>(8); // 2023-11
  const [selectedGodown, setSelectedGodown] = useState<"ALL" | ActiveGodown>(
    "ALL"
  );
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("ALL");
  const [isPlaying, setIsPlaying] = useState(false);

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
          setMetadata(metaJson);
          setActions(simJson);
          setSummaries(btJson);
          setOpsState(loadOpsState(metaJson.godowns, metaJson.items));
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

  // Helper to update and persist opsState cleanly
  const updateOps = (updater: (prev: OpsStoreState) => OpsStoreState) => {
    setOpsState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveOpsState(next);
      return next;
    });
  };

  const months = useMemo(
    () => metadata?.date_range.months ?? [],
    [metadata]
  );

  // Playback timer for month-by-month causal replay
  useEffect(() => {
    if (!isPlaying || months.length === 0) return;
    const timer = window.setInterval(() => {
      setMonthIndex((prev) => {
        if (prev >= months.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [isPlaying, months.length]);

  const activeMonth = months[monthIndex] ?? "2023-03";

  // Active RBAC staff & assigned site
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
  const adjustedItemActions = useMemo(() => {
    const base = actions.filter((a) => a.item_code === selectedItemCode);
    if (!opsState) return base;
    return base.map((a) => {
      const adj =
        opsState.liveStockAdjustments[`${a.godown}::${a.item_code}`] ?? 0;
      if (adj === 0) return a;
      return {
        ...a,
        godown_on_hand: Math.max(0, Number((a.godown_on_hand + adj).toFixed(3))),
      };
    });
  }, [actions, selectedItemCode, opsState]);

  const monthActionsAllGodowns = useMemo(
    () => adjustedItemActions.filter((a) => a.month === activeMonth),
    [adjustedItemActions, activeMonth]
  );

  // Latest active-month actions across all 16 items (for live LP donor recommendation in Workflow tab)
  const activeMonthAllItemsActions = useMemo(
    () => actions.filter((a) => a.month === activeMonth),
    [actions, activeMonth]
  );

  // Scope visible actions by RBAC: Site Managers see ONLY their assigned site
  const rbacScopedMonthActions = useMemo(() => {
    if (!lockedGodownName) return monthActionsAllGodowns;
    return monthActionsAllGodowns.filter((a) => a.godown === lockedGodownName);
  }, [monthActionsAllGodowns, lockedGodownName]);

  const decisionCounts = useMemo(() => {
    const counts: Record<SimulationDecision, number> = {
      ORDER: 0,
      HOLD: 0,
      TRANSFER_IN: 0,
      TRANSFER_OUT: 0,
      WAIT: 0,
    };
    for (const a of rbacScopedMonthActions) {
      counts[a.decision] += 1;
    }
    return counts;
  }, [rbacScopedMonthActions]);

  const filteredMonthActions = useMemo(() => {
    return rbacScopedMonthActions.filter((a) => {
      if (
        !lockedGodownName &&
        selectedGodown !== "ALL" &&
        a.godown !== selectedGodown
      ) {
        return false;
      }
      if (decisionFilter === "ALL") return true;
      if (decisionFilter === "TRANSFER") {
        return a.decision === "TRANSFER_IN" || a.decision === "TRANSFER_OUT";
      }
      return a.decision === decisionFilter;
    });
  }, [rbacScopedMonthActions, lockedGodownName, selectedGodown, decisionFilter]);

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
    const routes = collectTransfersFromActions(adjustedItemActions);
    if (!lockedGodownName) return routes;
    return routes.filter(
      (r) =>
        r.from_godown === lockedGodownName || r.to_godown === lockedGodownName
    );
  }, [adjustedItemActions, lockedGodownName]);

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
    const requesterName = activeStaff?.name ?? "Admin (Head of Projects)";
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

  const handleResetDemo = () => {
    if (!metadata) return;
    const fresh = createInitialOpsState(metadata.godowns, metadata.items);
    saveOpsState(fresh);
    setOpsState(fresh);
    setRoleType("ADMIN_HEAD");
    setActiveStaffId(null);
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
      <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-600 shadow-xs">
        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
        Loading 44-month causal replay &amp; LP logistics simulation...
      </div>
    );
  }

  if (error || !metadata || !selectedItem || !selectedSummary || !opsState) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div>
          <div className="font-semibold">Unable to load Planner simulation</div>
          <p className="mt-1 text-xs text-rose-700">
            {error ?? "Missing pre-aggregated JSON payloads in /public/data/."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Persistent RBAC Role Switcher & Operations Navigation */}
      <RoleAccessBar
        roleType={roleType}
        activeStaffId={activeStaffId}
        staff={opsState.staff}
        warehouses={opsState.warehouses}
        projects={opsState.projects}
        onSwitchToAdmin={() => {
          setRoleType("ADMIN_HEAD");
          setActiveStaffId(null);
        }}
        onSwitchToStaff={(staffId) => {
          setRoleType("SITE_MANAGER");
          setActiveStaffId(staffId);
          setDecisionFilter("ALL");
        }}
        activeSubTab={activeSubTab}
        onChangeSubTab={setActiveSubTab}
        pendingHeadCount={pendingHeadCount}
        pendingConsentForUserCount={pendingConsentForUserCount}
        activeDeliveriesCount={activeDeliveriesCount}
        onResetDemo={handleResetDemo}
      />

      {/* SUB-TAB 1: Causal Replay & The Bar (RBAC-Scoped for Site Managers) */}
      {activeSubTab === "replay" && (
        <div className="space-y-6">
          {lockedGodownName && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-sky-700" />
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
                  className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
                >
                  Review {pendingConsentForUserCount} Pickup Consent Request
                </button>
              )}
            </div>
          )}

          {/* 1. "The Bar" Headline Scorecard + 16-SKU Matrix */}
          <TheBarScorecard
            selected={selectedSummary}
            allSummaries={summaries}
            onSelectItem={(code) => {
              setSelectedItemCode(code);
              setDecisionFilter("ALL");
            }}
          />

          {/* 2. Interactive Month Scrubber + Filters */}
          <MonthScrubber
            months={months}
            monthIndex={monthIndex}
            onChangeMonthIndex={(idx) => {
              setIsPlaying(false);
              setMonthIndex(idx);
            }}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            items={metadata.items}
            selectedItemCode={selectedItemCode}
            onChangeItemCode={(code) => {
              setSelectedItemCode(code);
              setDecisionFilter("ALL");
            }}
            godowns={metadata.godowns}
            selectedGodown={selectedGodown}
            onChangeGodown={setSelectedGodown}
            lockedGodown={lockedGodownName}
            decisionFilter={decisionFilter}
            onChangeDecisionFilter={setDecisionFilter}
            selectedItem={selectedItem}
            contractorIdleStock={contractorIdleStock}
            totalProjectedDemand={totalProjectedDemand}
            decisionCounts={decisionCounts}
          />

          {/* 3. Actual vs. Planned Idle Stock Curve (Recharts) */}
          <IdleStockChart
            summary={selectedSummary}
            activeMonth={activeMonth}
            onSelectMonth={handleSelectMonthByString}
          />

          {/* 4. Monthly Action Cards (RBAC-Scoped) */}
          <ActionCardsGrid
            actions={filteredMonthActions}
            activeMonth={activeMonth}
          />

          {/* 5. Inter-Godown Transfer Logistics Panel (RBAC-Scoped) */}
          <TransferLogisticsPanel
            monthRoutes={monthTransferRoutes}
            allItemRoutes={allItemTransferRoutes}
            activeMonth={activeMonth}
            unit={selectedItem.unit}
            leadTimeDays={selectedItem.lead_time_days}
          />
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
          onSwitchToStaff={(staffId) => {
            setRoleType("SITE_MANAGER");
            setActiveStaffId(staffId);
          }}
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
          onSwitchToAdmin={() => {
            setRoleType("ADMIN_HEAD");
            setActiveStaffId(null);
          }}
        />
      )}
    </div>
  );
}
