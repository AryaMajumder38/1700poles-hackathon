"use client";

import {
  Bell,
  Compass,
  Database,
  Lock,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type {
  OpsProject,
  OpsStaffMember,
  OpsWarehouse,
  UserRoleType,
} from "./opsTypes";
import { shortGodownName } from "./plannerTypes";

export type PlannerSubTab = "replay" | "workflow" | "admin";

interface RoleAccessBarProps {
  roleType: UserRoleType;
  activeStaffId: string | null;
  staff: OpsStaffMember[];
  warehouses: OpsWarehouse[];
  projects: OpsProject[];
  onSwitchToAdmin: () => void;
  onSwitchToStaff: (staffId: string) => void;
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
  onSwitchToAdmin,
  onSwitchToStaff,
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
        {/* Left: Instant RBAC Role Switcher (No Login Wall — Hackathon Rule 6) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
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
                <UserCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Active RBAC Session (Instant Demo Switch)</span>
                {!isAdmin && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-sky-500/20 px-1.5 py-0.5 text-sky-300">
                    <Lock className="h-2.5 w-2.5" /> Site Scoped
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <select
                  aria-label="Switch user role"
                  value={isAdmin ? "ADMIN_HEAD" : activeStaffId ?? "ADMIN_HEAD"}
                  onChange={(e) => {
                    if (e.target.value === "ADMIN_HEAD") {
                      onSwitchToAdmin();
                    } else {
                      onSwitchToStaff(e.target.value);
                    }
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ADMIN_HEAD">
                    Admin / Head of Projects (All {projects.length} Project
                    {projects.length > 1 ? "s" : ""} · All {warehouses.length} Sites)
                  </option>
                  <optgroup label="Site Managers & Supervisors (Scoped to Assigned Site)">
                    {staff.map((m) => {
                      const wh = warehouses.find(
                        (w) => w.warehouse_id === m.warehouse_id
                      );
                      return (
                        <option key={m.staff_id} value={m.staff_id}>
                          {m.title}: {m.name} ({shortGodownName(wh?.name ?? m.warehouse_id)})
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          {/* Scope Indicator Pill */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[11px]">
            {isAdmin ? (
              <span className="text-amber-300">
                Full Access: All {projects.length} project(s), {warehouses.length}{" "}
                warehouses, master registry &amp; fulfillment routing
              </span>
            ) : (
              <span className="text-sky-300">
                Scoped View: <strong>{activeWarehouse?.name}</strong> (
                {activeProject?.name ?? activeStaff?.project_id}) — property-locked
                inventory
              </span>
            )}
          </div>
        </div>

        {/* Right: Notification Badges & Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && pendingHeadCount > 0 && (
            <button
              type="button"
              onClick={() => onChangeSubTab("workflow")}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 cursor-pointer"
            >
              <Bell className="h-3.5 w-3.5" />
              {pendingHeadCount} Pending Request{pendingHeadCount > 1 ? "s" : ""}
            </button>
          )}
          {!isAdmin && pendingConsentForUserCount > 0 && (
            <button
              type="button"
              onClick={() => onChangeSubTab("workflow")}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/60 bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-200 hover:bg-rose-500/30 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              {pendingConsentForUserCount} Pickup Consent Needed
            </button>
          )}
          <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-[11px] text-slate-300">
            {activeDeliveriesCount} Active PO{activeDeliveriesCount === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={onResetDemo}
            title="Reset demo requests, orders, and custom master data"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
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
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
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
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
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
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
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
