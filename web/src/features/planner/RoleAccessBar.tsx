"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
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
  pendingConsentByWarehouse: Record<string, number>;
  activeDeliveriesCount: number;
  onResetDemo: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
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
  pendingConsentByWarehouse,
  activeDeliveriesCount,
  onResetDemo,
}: RoleAccessBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const activeStaff = staff.find((s) => s.staff_id === activeStaffId) ?? null;
  const activeWarehouse = activeStaff
    ? warehouses.find((w) => w.warehouse_id === activeStaff.warehouse_id) ?? null
    : null;
  const activeProject = activeStaff
    ? projects.find((p) => p.project_id === activeStaff.project_id) ?? null
    : null;

  const isAdmin = roleType === "ADMIN_HEAD";

  // Close profile switcher dropdown on outside click or Escape key
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const totalPendingConsents = Object.values(pendingConsentByWarehouse).reduce(
    (sum, n) => sum + n,
    0
  );

  return (
    <section
      aria-label="Role-Based Access Control and Operations Bar"
      className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Scope Indicator & Navigation Context */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
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
            <div>
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
              <div className="mt-0.5 text-xs font-medium text-slate-200">
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

        {/* Right: Notification Pills, Reset, and Clickable Profile Icon Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
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

          <span className="hidden sm:inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-[11px] text-slate-300">
            {activeDeliveriesCount} Active PO{activeDeliveriesCount === 1 ? "" : "s"}
          </span>

          <button
            type="button"
            onClick={onResetDemo}
            title="Reset demo requests, orders, and custom master data"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>

          {/* Clickable Profile Icon Button with Scrollable Role Switcher Window */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open profile role switcher"
              className="flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-900 py-1 pl-1.5 pr-3 text-left transition-colors hover:border-amber-400 hover:bg-slate-800 cursor-pointer"
            >
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-slate-950 shadow-xs">
                {isAdmin
                  ? "HA"
                  : getInitials(activeStaff?.name ?? "SM")}
                {totalPendingConsents > 0 && (
                  <span
                    title="Pending approvals/consents"
                    className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-slate-950"
                  >
                    {isAdmin ? pendingHeadCount || totalPendingConsents : pendingConsentForUserCount || totalPendingConsents}
                  </span>
                )}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="max-w-[140px] truncate text-xs font-bold text-white">
                  {isAdmin ? "Head Admin" : activeStaff?.name ?? "Site Manager"}
                </div>
                <div className="max-w-[140px] truncate text-[10px] text-slate-400">
                  {isAdmin
                    ? "Head of Projects"
                    : `${activeStaff?.title ?? "Site Manager"} · ${shortGodownName(
                        activeWarehouse?.name ?? ""
                      )}`}
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  menuOpen ? "rotate-180 text-amber-400" : ""
                }`}
              />
            </button>

            {/* Scrollable Profile Switcher Popover Window */}
            {menuOpen && (
              <div
                role="menu"
                aria-label="Switch RBAC user profile"
                className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl sm:w-96"
              >
                <div className="border-b border-slate-800 bg-slate-950 px-3.5 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Switch Active User Profile (RBAC)
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {1 + staff.length} Profiles
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    No login required for demo — select any role to test scoped
                    access &amp; site pickup consent.
                  </p>
                </div>

                {/* Scrollable Body */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                  {/* Executive / Head Admin Section */}
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Executive / Global Admin
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onSwitchToAdmin();
                        setMenuOpen(false);
                      }}
                      className={`mt-0.5 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                        isAdmin
                          ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40"
                          : "hover:bg-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-950">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <span>Head Admin</span>
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                              HEAD OF PROJECTS
                            </span>
                          </div>
                          <div className="truncate text-[11px] text-slate-400">
                            All {projects.length} project(s) · All{" "}
                            {warehouses.length} warehouses · Full admin
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {pendingHeadCount > 0 && (
                          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                            {pendingHeadCount} req
                          </span>
                        )}
                        {isAdmin && (
                          <Check className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Site Managers & Supervisors grouped by Project */}
                  {projects.map((proj) => {
                    const projStaff = staff.filter(
                      (s) => s.project_id === proj.project_id
                    );
                    if (projStaff.length === 0) return null;
                    return (
                      <div key={proj.project_id} className="p-2">
                        <div className="flex items-center justify-between px-2 py-1">
                          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {proj.name}
                          </span>
                          <span className="ml-2 shrink-0 font-mono text-[9px] text-slate-500">
                            {proj.project_id}
                          </span>
                        </div>
                        <div className="mt-0.5 space-y-1">
                          {projStaff.map((member) => {
                            const wh = warehouses.find(
                              (w) => w.warehouse_id === member.warehouse_id
                            );
                            const isSelected =
                              !isAdmin && activeStaffId === member.staff_id;
                            const consentCount =
                              pendingConsentByWarehouse[member.warehouse_id] ??
                              0;
                            return (
                              <button
                                key={member.staff_id}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  onSwitchToStaff(member.staff_id);
                                  setMenuOpen(false);
                                }}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/40"
                                    : "hover:bg-slate-800 text-slate-200"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                      member.title === "Site Manager"
                                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                        : "bg-slate-700 text-slate-200"
                                    }`}
                                  >
                                    {getInitials(member.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate text-xs font-bold text-white">
                                        {member.name}
                                      </span>
                                      <span
                                        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                                          member.title === "Site Manager"
                                            ? "bg-sky-500/20 text-sky-300"
                                            : "bg-slate-700 text-slate-300"
                                        }`}
                                      >
                                        {member.title}
                                      </span>
                                    </div>
                                    <div className="truncate text-[11px] text-slate-400">
                                      {wh?.name ?? member.warehouse_id} ·{" "}
                                      <span className="font-mono text-[10px]">
                                        {member.staff_id}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {consentCount > 0 && (
                                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                      {consentCount} consent
                                    </span>
                                  )}
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-sky-400" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
