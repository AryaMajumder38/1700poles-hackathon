"use client";

import { useSyncExternalStore } from "react";
import type { UserRoleType } from "./opsTypes";

export interface RbacSession {
  roleType: UserRoleType;
  staffId: string | null;
  staffName: string;
  staffTitle: string;
  warehouseId: string | null;
  warehouseName: string | null;
  projectId: string | null;
}

export const RBAC_SESSION_KEY = "lumino_rbac_session_v1";
export const RBAC_CHANGE_EVENT = "lumino:rbac-change";
export const OPS_CHANGE_EVENT = "lumino:ops-change";

export const DEFAULT_ADMIN_SESSION: RbacSession = {
  roleType: "ADMIN_HEAD",
  staffId: null,
  staffName: "Head Admin",
  staffTitle: "Head of Projects",
  warehouseId: null,
  warehouseName: null,
  projectId: null,
};

let cachedRaw: string | null | undefined = undefined;
let cachedSnapshot: RbacSession = DEFAULT_ADMIN_SESSION;

export function readRbacSession(): RbacSession {
  if (typeof window === "undefined") return DEFAULT_ADMIN_SESSION;
  try {
    const raw = window.localStorage.getItem(RBAC_SESSION_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    if (!raw) {
      cachedSnapshot = DEFAULT_ADMIN_SESSION;
      return cachedSnapshot;
    }
    const parsed = JSON.parse(raw) as Partial<RbacSession>;
    if (
      parsed.roleType !== "ADMIN_HEAD" &&
      parsed.roleType !== "SITE_MANAGER"
    ) {
      cachedSnapshot = DEFAULT_ADMIN_SESSION;
      return cachedSnapshot;
    }
    cachedSnapshot = {
      roleType: parsed.roleType,
      staffId: parsed.staffId ?? null,
      staffName: parsed.staffName ?? "Head Admin",
      staffTitle: parsed.staffTitle ?? "Head of Projects",
      warehouseId: parsed.warehouseId ?? null,
      warehouseName: parsed.warehouseName ?? null,
      projectId: parsed.projectId ?? null,
    };
    return cachedSnapshot;
  } catch {
    cachedSnapshot = DEFAULT_ADMIN_SESSION;
    return cachedSnapshot;
  }
}

export function writeRbacSession(session: RbacSession): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(session);
    window.localStorage.setItem(RBAC_SESSION_KEY, serialized);
    cachedRaw = serialized;
    cachedSnapshot = session;
  } catch {
    cachedSnapshot = session;
  }
  window.dispatchEvent(
    new CustomEvent<RbacSession>(RBAC_CHANGE_EVENT, { detail: session })
  );
}

function subscribeRbac(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => callback();
  const onStorage = (evt: StorageEvent) => {
    if (evt.key === RBAC_SESSION_KEY) {
      cachedRaw = undefined;
      callback();
    }
  };
  window.addEventListener(RBAC_CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(RBAC_CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot(): RbacSession {
  return DEFAULT_ADMIN_SESSION;
}

/**
 * Shared RBAC hook usable across page.tsx, LedgerView, PlannerView, and SetsView.
 * Synchronizes immediately whenever the active profile is switched in the global navbar
 * or inside PlannerView.
 */
export function useRbacSession(): {
  session: RbacSession;
  setSession: (next: RbacSession) => void;
} {
  const session = useSyncExternalStore(
    subscribeRbac,
    readRbacSession,
    getServerSnapshot
  );

  return {
    session,
    setSession: writeRbacSession,
  };
}
