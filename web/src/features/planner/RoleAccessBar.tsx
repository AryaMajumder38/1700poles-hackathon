"use client";

import {
  Bell,
  Compass,
  Database,
  Lock,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import type {
  OpsProject,
  OpsStaffMember,
  OpsWarehouse,
  UserRoleType,
} from "./opsTypes";

export type PlannerSubTab = "replay" | "workflow" | "admin";

interface RoleAccessBarProps {
  roleType: UserRoleType;
  activeStaffId: string | null;
  staff: OpsStaffMember[];
  warehouses: OpsWarehouse[];
  projects: OpsProject[];
  activeSubTab: PlannerSubTab;
  onChangeSubTab: (tab: PlannerSubTab) => void;
  pendingHeadCount: number;
  pendingConsentForUserCount: number;
  activeDeliveriesCount: number;
  onResetDemo: () => void;
}

export default function RoleAccessBar({
  roleType,
  activeStaffId,
  staff,
  warehouses,
  projects,
  activeSubTab,
  onChangeSubTab,
  pendingHeadCount,
  pendingConsentForUserCount,
  activeDeliveriesCount,
  onResetDemo,
}: RoleAccessBarProps) {
  const activeStaff = staff.find((s) => s.staff_id === activeStaffId) ?? null;
  const activeWarehouse = activeStaff
    ? warehouses.find((w) => w.warehouse_id === activeStaff.warehouse_id) ?? null
    : null;
  const activeProject = activeStaff
    ? projects.find((p) => p.project_id === activeStaff.project_id) ?? null
    : null;

  const isAdmin = roleType === "ADMIN_HEAD";

  return (
    <section
      aria-label="Role-Based Access Control and Operations Bar"
      className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Scope Indicator & Navigation Context */}
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isAdmin
                  ? "bg-amber-500 text-slate-950"
                  : "bg-sky-500 text-slate-950"
              }`}
            >
              {isAdmin ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <UserCircle2 className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span>RBAC Access Scope</span>
                {!isAdmin ? (
                  <span className="inline-flex items-center gap-0.5 rounded bg-sky-500/20 px-1.5 py-0.5 text-sky-300">
                    <Lock className="h-2.5 w-2.5" /> Site Scoped
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-300">
                    All Projects &amp; Sites
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-200 break-words">
                {isAdmin ? (
                  <span>
                    Head Admin view across{" "}
                    <strong className="text-amber-300">
                      {projects.length} project{projects.length > 1 ? "s" : ""}
                    </strong>{" "}
                    &amp;{" "}
                    <strong className="text-amber-300">
                      {warehouses.length} warehouses
                    </strong>
                  </span>
                ) : (
                  <span>
                    Locked to{" "}
                    <strong className="text-sky-300">
                      {activeWarehouse?.name}
                    </strong>{" "}
                    · {activeProject?.name ?? activeStaff?.project_id}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Notification Pills & Reset */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && pendingHeadCount > 0 && (
            <button
              type="button"
              onClick={() => onChangeSubTab("workflow")}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
            >
              <Bell className="h-3.5 w-3.5" />
              {pendingHeadCount} Pending Request{pendingHeadCount > 1 ? "s" : ""}
            </button>
          )}

          {!isAdmin && pendingConsentForUserCount > 0 && (
            <button
              type="button"
              onClick={() => onChangeSubTab("workflow")}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/60 bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-200 hover:bg-rose-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              {pendingConsentForUserCount} Pickup Consent Needed
            </button>
          )}

          <span className="hidden sm:inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-[11px] text-slate-300">
            {activeDeliveriesCount} Active PO{activeDeliveriesCount === 1 ? "" : "s"}
          </span>

          <button
            type="button"
            onClick={onResetDemo}
            title="Reset demo requests, orders, and custom master data"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => onChangeSubTab("replay")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer ${
            activeSubTab === "replay"
              ? "bg-amber-500 text-slate-950"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Compass className="h-3.5 w-3.5" />
          Causal Replay &amp; The Bar
        </button>

        <button
          type="button"
          onClick={() => onChangeSubTab("workflow")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer ${
            activeSubTab === "workflow"
              ? "bg-amber-500 text-slate-950"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          Requests, Dispatch &amp; Site Consent
          {(isAdmin ? pendingHeadCount : pendingConsentForUserCount) > 0 && (
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeSubTab === "workflow"
                  ? "bg-slate-950 text-amber-400"
                  : "bg-rose-500 text-white"
              }`}
            >
              {isAdmin ? pendingHeadCount : pendingConsentForUserCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onChangeSubTab("admin")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer ${
            activeSubTab === "admin"
              ? "bg-amber-500 text-slate-950"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          Admin Master Data &amp; Registry
          {!isAdmin && <Lock className="h-3 w-3 opacity-70" />}
        </button>
      </div>
    </section>
  );
}
