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
    createInitialOpsState(metadata?.godowns ?? FALLBACK_GODOWNS, metadata?.items ?? [])
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
        className="flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-900 py-1 pl-1.5 pr-3 text-left transition-colors hover:border-amber-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
      >
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-slate-950 shadow-xs">
          {isAdmin ? "HA" : getInitials(session.staffName)}
          {badgeCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-slate-950">
              {badgeCount}
            </span>
          )}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="max-w-[140px] truncate text-xs font-bold text-white">
            {session.staffName}
          </div>
          <div className="max-w-[140px] truncate text-[10px] text-slate-400">
            {isAdmin
              ? "Head Admin · All Sites"
              : `${session.staffTitle} · ${shortGodownName(
                  session.warehouseName ?? ""
                )}`}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            menuOpen ? "rotate-180 text-amber-400" : ""
          }`}
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Global RBAC user selector"
          className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl sm:w-96"
        >
          <div className="border-b border-slate-800 bg-slate-950 px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Switch User Profile (RBAC)
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {1 + opsState.staff.length} Users
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Applies across See It, Plan It &amp; Match Sets immediately.
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
            {/* Executive / Head Admin */}
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Head Admin / Global Access
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSession(DEFAULT_ADMIN_SESSION);
                  setMenuOpen(false);
                }}
                className={`mt-0.5 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer ${
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
                        ALL SITES
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-slate-400">
                      Full analytics, master registry &amp; dispatch approvals
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {pendingHeadCount > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                      {pendingHeadCount} req
                    </span>
                  )}
                  {isAdmin && <Check className="h-4 w-4 text-amber-400" />}
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
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer ${
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
  );
}
