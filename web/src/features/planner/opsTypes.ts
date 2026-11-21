import type { ActiveGodown, ItemMaster, ItemRole, ItemUnit } from "@/types/lumino";

export type UserRoleType = "ADMIN_HEAD" | "SITE_MANAGER";

export interface OpsProject {
  project_id: string;
  name: string;
  region: string;
  status: "ACTIVE" | "WIND_DOWN" | "PLANNED";
  created_at: string;
}

export interface OpsWarehouse {
  warehouse_id: string;
  name: string; // Matches ActiveGodown for the 6 core Kanpur godowns, or custom new warehouse name
  project_id: string;
  distance_from_hub_km: number;
  is_core_godown: boolean;
}

export interface OpsStaffMember {
  staff_id: string;
  name: string;
  title: "Site Manager" | "Supervisor";
  warehouse_id: string;
  project_id: string;
  contact: string;
}

export interface OpsSupplier {
  supplier_id: string;
  name: string;
  category: string;
  avg_delivery_days: number;
  on_time_rate_pct: number;
}

export interface OpsMaterial extends ItemMaster {
  supplier_id: string;
  supplier_name: string;
  is_custom?: boolean;
}

export type RequisitionStatus =
  | "PENDING_HEAD_APPROVAL"
  | "FULFILLED_BY_VENDOR_ORDER"
  | "PENDING_DONOR_CONSENT"
  | "TRANSFER_APPROVED_DISPATCHED"
  | "DONOR_DECLINED_REROUTE"
  | "REJECTED_BY_HEAD";

export interface MaterialRequisition {
  req_id: string;
  created_at: string;
  project_id: string;
  requesting_warehouse_id: string;
  requesting_warehouse_name: string;
  requested_by_staff_id: string;
  requested_by_name: string;
  item_code: string;
  item_name: string;
  unit: ItemUnit;
  qty: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  notes: string;
  status: RequisitionStatus;
  // Filled when Head routes via inter-site transfer:
  donor_warehouse_id?: string;
  donor_warehouse_name?: string;
  donor_selection_mode?: "LP_RECOMMENDED" | "CUSTOM";
  transfer_distance_km?: number;
  donor_decision_note?: string;
  // Filled when Head fulfills via new vendor order:
  linked_order_id?: string;
  head_decision_at?: string;
}

export type VendorOrderStatus = "ORDERED" | "IN_TRANSIT" | "DELIVERED";

export interface VendorPurchaseOrder {
  order_id: string;
  req_id?: string;
  project_id: string;
  destination_warehouse_id: string;
  destination_warehouse_name: string;
  item_code: string;
  item_name: string;
  unit: ItemUnit;
  qty: number;
  supplier_id: string;
  supplier_name: string;
  ordered_date: string;
  promised_lead_time_days: number;
  expected_delivery_date: string;
  actual_delivery_days?: number;
  delivered_date?: string;
  status: VendorOrderStatus;
}

export interface SiteOwnershipLedgerEntry {
  entry_id: string;
  timestamp: string;
  warehouse_name: string;
  item_code: string;
  unit: ItemUnit;
  qty_delta: number;
  source: "VENDOR_DELIVERY" | "INTER_SITE_TRANSFER_IN" | "INTER_SITE_TRANSFER_OUT";
  consent_by: string;
  reference_id: string;
}

export interface OpsStoreState {
  projects: OpsProject[];
  warehouses: OpsWarehouse[];
  staff: OpsStaffMember[];
  suppliers: OpsSupplier[];
  customMaterials: OpsMaterial[];
  materialSupplierMap: Record<string, { supplier_id: string; supplier_name: string }>;
  requisitions: MaterialRequisition[];
  vendorOrders: VendorPurchaseOrder[];
  ownershipLedger: SiteOwnershipLedgerEntry[];
  /** Live stock deltas per `${warehouse_name}::${item_code}` from approved transfers & deliveries */
  liveStockAdjustments: Record<string, number>;
}

export const OPS_STORAGE_KEY = "lumino_track_c_ops_state_v1";

export const DEFAULT_SUPPLIERS: OpsSupplier[] = [
  {
    supplier_id: "SUP-PCC-001",
    name: "Kanpur Precast Concrete Works",
    category: "PCC Poles & Heavy Structures",
    avg_delivery_days: 146,
    on_time_rate_pct: 91,
  },
  {
    supplier_id: "SUP-CBL-002",
    name: "UP Grid XLPE Cables Pvt Ltd",
    category: "AB & LT XLPE Cables",
    avg_delivery_days: 64,
    on_time_rate_pct: 86,
  },
  {
    supplier_id: "SUP-SMC-003",
    name: "Awadh Composite Enclosures",
    category: "1-Ph & 3-Ph SMC Distribution Boxes",
    avg_delivery_days: 118,
    on_time_rate_pct: 94,
  },
  {
    supplier_id: "SUP-HDW-004",
    name: "Shree Balaji Galvanized Hardware",
    category: "Pole Clamps, Eye Hooks, Nuts & Bolts",
    avg_delivery_days: 92,
    on_time_rate_pct: 88,
  },
  {
    supplier_id: "SUP-LUG-005",
    name: "Bharat Conductors & Lugs",
    category: "Aluminium Lugs & Piercing Connectors",
    avg_delivery_days: 31,
    on_time_rate_pct: 96,
  },
];

export function defaultSupplierForItem(itemCode: string): OpsSupplier {
  if (itemCode.startsWith("MPO")) return DEFAULT_SUPPLIERS[0];
  if (itemCode.startsWith("MCA02") || itemCode === "MRP070022") return DEFAULT_SUPPLIERS[1];
  if (itemCode === "MRP070064" || itemCode === "MRP070065") return DEFAULT_SUPPLIERS[2];
  if (itemCode.startsWith("MLU") || itemCode === "MRP070059") return DEFAULT_SUPPLIERS[4];
  return DEFAULT_SUPPLIERS[3];
}

export function addDaysToDate(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

const CORE_GODOWN_HUB_DIST: Record<ActiveGodown, number> = {
  "KANPUR NAGAR": 0,
  "KANPUR DEHAT": 45,
  "KANPUR KANNAUJ": 80,
  "KANPUR AURAIYA": 95,
  "KANPUR FARRUKHABAD": 140,
  "KANPUR ETAWAH": 150,
};

const CORE_SITE_MANAGERS: Record<ActiveGodown, { id: string; name: string; contact: string }> = {
  "KANPUR AURAIYA": { id: "SM-AUR-01", name: "Rajesh Sharma", contact: "r.sharma@lumino.in" },
  "KANPUR DEHAT": { id: "SM-DEH-02", name: "Amit Verma", contact: "a.verma@lumino.in" },
  "KANPUR ETAWAH": { id: "SM-ETA-03", name: "Pradeep Mishra", contact: "p.mishra@lumino.in" },
  "KANPUR FARRUKHABAD": { id: "SM-FAR-04", name: "Suresh Tiwari", contact: "s.tiwari@lumino.in" },
  "KANPUR KANNAUJ": { id: "SM-KAN-05", name: "Vikram Yadav", contact: "v.yadav@lumino.in" },
  "KANPUR NAGAR": { id: "SM-NAG-06", name: "Manoj Gupta", contact: "m.gupta@lumino.in" },
};

export function createInitialOpsState(
  godowns: ActiveGodown[],
  items: ItemMaster[]
): OpsStoreState {
  const warehouses: OpsWarehouse[] = godowns.map((g, idx) => ({
    warehouse_id: `WH-KNP-0${idx + 1}`,
    name: g,
    project_id: "PRJ-KNP-RDSS",
    distance_from_hub_km: CORE_GODOWN_HUB_DIST[g] ?? 75,
    is_core_godown: true,
  }));

  const staff: OpsStaffMember[] = [
    ...warehouses.map((w) => {
      const preset = CORE_SITE_MANAGERS[w.name as ActiveGodown];
      return {
        staff_id: preset?.id ?? `SM-${w.warehouse_id}`,
        name: preset?.name ?? `Manager (${w.name})`,
        title: "Site Manager" as const,
        warehouse_id: w.warehouse_id,
        project_id: w.project_id,
        contact: preset?.contact ?? "site.ops@lumino.in",
      };
    }),
    {
      staff_id: "SUPV-DEH-07",
      name: "Deepak Chauhan",
      title: "Supervisor" as const,
      warehouse_id: "WH-KNP-02",
      project_id: "PRJ-KNP-RDSS",
      contact: "d.chauhan@lumino.in",
    },
    {
      staff_id: "SUPV-AUR-08",
      name: "Rakesh Pandey",
      title: "Supervisor" as const,
      warehouse_id: "WH-KNP-01",
      project_id: "PRJ-KNP-RDSS",
      contact: "r.pandey@lumino.in",
    },
  ];

  const materialSupplierMap: Record<
    string,
    { supplier_id: string; supplier_name: string }
  > = {};
  for (const it of items) {
    const sup = defaultSupplierForItem(it.item_code);
    materialSupplierMap[it.item_code] = {
      supplier_id: sup.supplier_id,
      supplier_name: sup.name,
    };
  }

  return {
    projects: [
      {
        project_id: "PRJ-KNP-RDSS",
        name: "Kanpur 6-District RDSS Distribution Lines",
        region: "Kanpur Circle, Uttar Pradesh",
        status: "ACTIVE",
        created_at: "2023-03-01",
      },
    ],
    warehouses,
    staff,
    suppliers: DEFAULT_SUPPLIERS,
    customMaterials: [],
    materialSupplierMap,
    requisitions: [
      {
        req_id: "REQ-2026-101",
        created_at: "2026-11-20",
        project_id: "PRJ-KNP-RDSS",
        requesting_warehouse_id: "WH-KNP-01",
        requesting_warehouse_name: "KANPUR AURAIYA",
        requested_by_staff_id: "SM-AUR-01",
        requested_by_name: "Rajesh Sharma",
        item_code: "MPO010014",
        item_name: "PCC POLE 8.5 MTR 180 KG",
        unit: "PCS",
        qty: 320,
        urgency: "HIGH",
        notes:
          "Feeder erection gang mobilized in Auraiya block; local yard below 1.5m safety floor.",
        status: "PENDING_HEAD_APPROVAL",
      },
      {
        req_id: "REQ-2026-102",
        created_at: "2026-11-19",
        project_id: "PRJ-KNP-RDSS",
        requesting_warehouse_id: "WH-KNP-03",
        requesting_warehouse_name: "KANPUR ETAWAH",
        requested_by_staff_id: "SM-ETA-03",
        requested_by_name: "Pradeep Mishra",
        item_code: "MRP070060",
        item_name: "POLE CLAMP RDSS",
        unit: "SET",
        qty: 450,
        urgency: "MEDIUM",
        notes:
          "Urgent pole clamp sets needed to unblock eye-hook assembly crews in Etawah.",
        status: "PENDING_DONOR_CONSENT",
        donor_warehouse_id: "WH-KNP-02",
        donor_warehouse_name: "KANPUR DEHAT",
        donor_selection_mode: "LP_RECOMMENDED",
        transfer_distance_km: 110,
        head_decision_at: "2026-11-20",
      },
    ],
    vendorOrders: [
      {
        order_id: "PO-2026-401",
        project_id: "PRJ-KNP-RDSS",
        destination_warehouse_id: "WH-KNP-06",
        destination_warehouse_name: "KANPUR NAGAR",
        item_code: "MCA020009",
        item_name:
          "LT AERIAL BUNCHED XLPE CABLE 3X95 SQ.MM+1X70 SQ.MM+1X16 SQ.MM",
        unit: "KM",
        qty: 24,
        supplier_id: "SUP-CBL-002",
        supplier_name: "UP Grid XLPE Cables Pvt Ltd",
        ordered_date: "2026-09-25",
        promised_lead_time_days: 60,
        expected_delivery_date: "2026-11-24",
        status: "IN_TRANSIT",
      },
      {
        order_id: "PO-2026-398",
        project_id: "PRJ-KNP-RDSS",
        destination_warehouse_id: "WH-KNP-05",
        destination_warehouse_name: "KANPUR KANNAUJ",
        item_code: "MLU020008",
        item_name: "25 SQMM ALUMINIUM LUGS RING TYPE",
        unit: "NOS",
        qty: 6000,
        supplier_id: "SUP-LUG-005",
        supplier_name: "Bharat Conductors & Lugs",
        ordered_date: "2026-10-12",
        promised_lead_time_days: 30,
        expected_delivery_date: "2026-11-11",
        actual_delivery_days: 28,
        delivered_date: "2026-11-09",
        status: "DELIVERED",
      },
    ],
    ownershipLedger: [
      {
        entry_id: "OWN-001",
        timestamp: "2026-11-09",
        warehouse_name: "KANPUR KANNAUJ",
        item_code: "MLU020008",
        unit: "NOS",
        qty_delta: 6000,
        source: "VENDOR_DELIVERY",
        consent_by: "Vikram Yadav (Site Property Registered)",
        reference_id: "PO-2026-398",
      },
    ],
    liveStockAdjustments: {},
  };
}

export function loadOpsState(
  godowns: ActiveGodown[],
  items: ItemMaster[]
): OpsStoreState {
  if (typeof window === "undefined") {
    return createInitialOpsState(godowns, items);
  }
  try {
    const raw = window.localStorage.getItem(OPS_STORAGE_KEY);
    if (!raw) return createInitialOpsState(godowns, items);
    const parsed = JSON.parse(raw) as OpsStoreState;
    if (!parsed || !Array.isArray(parsed.warehouses) || !Array.isArray(parsed.staff)) {
      return createInitialOpsState(godowns, items);
    }
    return parsed;
  } catch {
    return createInitialOpsState(godowns, items);
  }
}

export function saveOpsState(state: OpsStoreState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota issues in restricted browsers
  }
  window.dispatchEvent(new CustomEvent("lumino:ops-change"));
}

export function getAllCatalogMaterials(
  baseItems: ItemMaster[],
  ops: OpsStoreState
): OpsMaterial[] {
  const baseWithSup: OpsMaterial[] = baseItems.map((it) => {
    const mapped = ops.materialSupplierMap[it.item_code];
    const fallback = defaultSupplierForItem(it.item_code);
    return {
      ...it,
      supplier_id: mapped?.supplier_id ?? fallback.supplier_id,
      supplier_name: mapped?.supplier_name ?? fallback.name,
      is_custom: false,
    };
  });
  return [...baseWithSup, ...ops.customMaterials];
}

export const ITEM_UNITS: ItemUnit[] = ["PCS", "NOS", "SET", "KG", "MT", "KM", "MTR"];
export const ITEM_ROLES: ItemRole[] = ["Independent", "Parent", "Child"];
