"use client";

import { useRef, type KeyboardEvent } from "react";
import { Lock, RotateCcw } from "lucide-react";
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

const SUB_TABS: Array<{ id: PlannerSubTab; label: string }> = [
  { id: "replay", label: "Causal Replay" },
  { id: "workflow", label: "Requests & Dispatch" },
  { id: "admin", label: "Admin Registry" },
];

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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeStaff = staff.find((s) => s.staff_id === activeStaffId) ?? null;
  const activeWarehouse = activeStaff
    ? warehouses.find((w) => w.warehouse_id === activeStaff.warehouse_id) ?? null
    : null;
  const activeProject = activeStaff
    ? projects.find((p) => p.project_id === activeStaff.project_id) ?? null
    : null;

  const isAdmin = roleType === "ADMIN_HEAD";
  const workflowAlertCount = isAdmin
    ? pendingHeadCount
    : pendingConsentForUserCount;

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % SUB_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + SUB_TABS.length) % SUB_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = SUB_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      onChangeSubTab(SUB_TABS[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <section
      aria-label="Role-Based Access Control and Operations Bar"
      className="rounded-[20px] border border-white/[0.06] bg-[#1a1a1a]"
    >
      {/* Slim Top Scope & Status Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        {/* Left: Quiet Scope Text */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[#a0a0a0]">
          {!isAdmin && (
            <Lock
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-[#898989]"
            />
          )}
          {isAdmin ? (
            <span className="truncate">
              <span className="font-medium text-white">Head Admin</span>
              {" · "}All sites ({projects.length} project
              {projects.length > 1 ? "s" : ""}, {warehouses.length} warehouses)
            </span>
          ) : (
            <span className="truncate">
              <span className="font-medium text-white">
                {activeWarehouse?.name ?? "Assigned site"}
              </span>
              {" · "}
              {activeProject?.name ?? activeStaff?.project_id}
            </span>
          )}
        </div>

        {/* Right: Ghost Pill Counter Chips + Ghost Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && pendingHeadCount > 0 && (
            <button
              type="button"
              onClick={() => onChangeSubTab("workflow")}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.05] px-3 text-xs font-medium text-[#e7e7e7] transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer tabular-nums"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.75)]"
              />
              {pendingHeadCount} pending
            </button>
          )}

          {!isAdmin && pendingConsentForUserCount > 0 && (
            <button
              type="button"
              onClick={() => onChangeSubTab("workflow")}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.05] px-3 text-xs font-medium text-[#e7e7e7] transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer tabular-nums"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"
              />
              {pendingConsentForUserCount} consent needed
            </button>
          )}

          <span className="hidden h-7 items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.05] px-3 text-xs text-[#a0a0a0] tabular-nums sm:inline-flex">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(94,234,212,0.7)]"
            />
            {activeDeliveriesCount} active PO
            {activeDeliveriesCount === 1 ? "" : "s"}
          </span>

          <button
            type="button"
            onClick={onResetDemo}
            title="Reset demo requests, orders, and custom master data"
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.05] px-3 text-xs font-medium text-[#a0a0a0] transition-colors hover:bg-white/[0.11] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3 text-[#898989]" />
            Reset
          </button>
        </div>
      </div>

      {/* Underline Sub-Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Planner views"
        className="flex items-center gap-6 overflow-x-auto border-t border-white/[0.06] px-5"
      >
        {SUB_TABS.map((tab, index) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`planner-subtab-${tab.id}`}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChangeSubTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`relative inline-flex shrink-0 items-center gap-2 border-b-2 py-3 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/50 cursor-pointer ${
                isActive
                  ? "border-white font-medium text-white"
                  : "border-transparent text-[#898989] hover:text-[#e7e7e7]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === "workflow" && workflowAlertCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#e7e7e7] tabular-nums">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      isAdmin
                        ? "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.8)]"
                        : "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]"
                    }`}
                  />
                  {workflowAlertCount}
                </span>
              )}
              {tab.id === "admin" && !isAdmin && (
                <Lock
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-[#898989]"
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
