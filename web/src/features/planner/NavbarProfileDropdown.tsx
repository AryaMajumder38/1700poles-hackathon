"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ShieldCheck } from "lucide-react";
import type { ActiveGodown, MetadataPayload } from "@/types/lumino";
import {
  createInitialOpsState,
  loadOpsState,
  type OpsStoreState,
} from "./opsTypes";
import { shortGodownName } from "./plannerTypes";
import {
  DEFAULT_ADMIN_SESSION,
  OPS_CHANGE_EVENT,
  useRbacSession,
} from "./rbacBridge";

const FALLBACK_GODOWNS: ActiveGodown[] = [
  "KANPUR AURAIYA",
  "KANPUR DEHAT",
  "KANPUR ETAWAH",
  "KANPUR FARRUKHABAD",
  "KANPUR KANNAUJ",
  "KANPUR NAGAR",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

interface NavbarProfileDropdownProps {
  /** Optional metadata already loaded by page.tsx */
  metadata?: MetadataPayload | null;
}

/**
 * Standalone, zero-login RBAC Profile Avatar + Scrollable Dropdown Menu
 * built for mounting directly in the global top navbar (web/src/app/page.tsx).
 * Syncs live across See It, Plan It, and Match Sets via rbacBridge.
 */
export default function NavbarProfileDropdown({
  metadata,
}: NavbarProfileDropdownProps) {
  const { session, setSession } = useRbacSession();
  const [opsState, setOpsState] = useState<OpsStoreState>(() =>
    createInitialOpsState(
      metadata?.godowns ?? FALLBACK_GODOWNS,
      metadata?.items ?? []
    )
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncOps = () => {
      setOpsState(
        loadOpsState(
          metadata?.godowns ?? FALLBACK_GODOWNS,
          metadata?.items ?? []
        )
      );
    };
    syncOps();

    window.addEventListener(OPS_CHANGE_EVENT, syncOps);
    window.addEventListener("storage", syncOps);
    return () => {
      window.removeEventListener(OPS_CHANGE_EVENT, syncOps);
      window.removeEventListener("storage", syncOps);
    };
  }, [metadata]);

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

  const isAdmin = session.roleType === "ADMIN_HEAD";

  const pendingHeadCount = useMemo(
    () =>
      opsState.requisitions.filter(
        (r) =>
          r.status === "PENDING_HEAD_APPROVAL" ||
          r.status === "DONOR_DECLINED_REROUTE"
      ).length,
    [opsState.requisitions]
  );

  const pendingConsentByWarehouse = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of opsState.requisitions) {
      if (r.status === "PENDING_DONOR_CONSENT" && r.donor_warehouse_id) {
        counts[r.donor_warehouse_id] = (counts[r.donor_warehouse_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [opsState.requisitions]);

  const badgeCount = isAdmin
    ? pendingHeadCount
    : session.warehouseId
    ? pendingConsentByWarehouse[session.warehouseId] ?? 0
    : 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Open global RBAC profile switcher"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] pl-1.5 pr-3 text-left transition-all duration-200 hover:bg-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] cursor-pointer"
      >
        <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#151515] text-[11px] font-medium text-[#e7e7e7] ring-1 ring-inset ring-white/[0.12]">
          {isAdmin ? "HA" : getInitials(session.staffName)}
          {badgeCount > 0 && (
            <>
              <span
                aria-hidden="true"
                className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-[#222222] ${
                  isAdmin
                    ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.85)]"
                    : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.85)]"
                }`}
              />
              <span className="sr-only">{badgeCount} pending actions</span>
            </>
          )}
        </div>
        <span className="hidden max-w-[136px] truncate text-[13px] font-medium text-[#e7e7e7] md:inline">
          {session.staffName}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#898989] transition-transform duration-200 ${
            menuOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Global RBAC user selector"
          className="steep-fade-in absolute right-0 z-50 mt-2 w-[min(19.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-[20px] border border-white/[0.1] bg-[#1a1a1a]/95 text-[#e7e7e7] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:w-80"
        >
          <div className="border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-white">
                Switch profile
              </span>
              <span className="text-xs tabular-nums text-[#898989]">
                {1 + opsState.staff.length} users
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#a0a0a0]">
              {isAdmin
                ? "Head Admin · All sites"
                : `${session.staffTitle} · ${shortGodownName(
                    session.warehouseName ?? ""
                  )}`}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06]">
            {/* Executive / Head Admin */}
            <div className="p-1.5">
              <div className="px-2.5 py-1 text-xs font-normal text-[#898989]">
                Global access
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSession(DEFAULT_ADMIN_SESSION);
                  setMenuOpen(false);
                }}
                className={`mt-0.5 flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
                  isAdmin ? "bg-white/[0.09]" : "hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#151515] text-[#a0a0a0] ring-1 ring-inset ring-white/[0.1]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#e7e7e7]" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">
                      Head Admin
                    </div>
                    <div className="truncate text-xs text-[#898989]">
                      All sites · Dispatch approvals
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {pendingHeadCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-[#a0a0a0]">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.75)]"
                      />
                      {pendingHeadCount}
                    </span>
                  )}
                  {isAdmin && <Check className="h-4 w-4 text-white" />}
                </div>
              </button>
            </div>

            {/* Site Managers & Supervisors grouped by Project */}
            {opsState.projects.map((proj) => {
              const projStaff = opsState.staff.filter(
                (s) => s.project_id === proj.project_id
              );
              if (projStaff.length === 0) return null;
              return (
                <div key={proj.project_id} className="p-1.5">
                  <div className="flex items-center justify-between px-2.5 py-1">
                    <span className="truncate text-xs font-normal text-[#898989]">
                      {proj.name}
                    </span>
                    <span className="ml-2 shrink-0 font-mono text-[11px] text-[#898989]">
                      {proj.project_id}
                    </span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {projStaff.map((member) => {
                      const wh = opsState.warehouses.find(
                        (w) => w.warehouse_id === member.warehouse_id
                      );
                      const isSelected =
                        !isAdmin && session.staffId === member.staff_id;
                      const consentCount =
                        pendingConsentByWarehouse[member.warehouse_id] ?? 0;

                      return (
                        <button
                          key={member.staff_id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setSession({
                              roleType: "SITE_MANAGER",
                              staffId: member.staff_id,
                              staffName: member.name,
                              staffTitle: member.title,
                              warehouseId: member.warehouse_id,
                              warehouseName: wh?.name ?? null,
                              projectId: member.project_id,
                            });
                            setMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
                            isSelected
                              ? "bg-white/[0.09]"
                              : "hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#151515] text-[11px] font-medium text-[#e7e7e7] ring-1 ring-inset ring-white/[0.1]">
                              {getInitials(member.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-[#e7e7e7]">
                                {member.name}
                              </div>
                              <div className="truncate text-xs text-[#898989]">
                                {member.title} ·{" "}
                                {shortGodownName(
                                  wh?.name ?? member.warehouse_id
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {consentCount > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-[#a0a0a0]">
                                <span
                                  aria-hidden="true"
                                  className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.75)]"
                                />
                                {consentCount}
                              </span>
                            )}
                            {isSelected && (
                              <Check className="h-4 w-4 text-white" />
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
  );
}
