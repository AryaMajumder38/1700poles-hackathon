"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import type { ItemMaster, ItemRole, ItemUnit } from "@/types/lumino";
import {
  getAllCatalogMaterials,
  ITEM_ROLES,
  ITEM_UNITS,
  type OpsMaterial,
  type OpsProject,
  type OpsStaffMember,
  type OpsStoreState,
  type OpsSupplier,
  type OpsWarehouse,
  type UserRoleType,
} from "./opsTypes";

interface AdminMasterDataPanelProps {
  roleType: UserRoleType;
  baseItems: ItemMaster[];
  opsState: OpsStoreState;
  onAddMaterialAndSupplier: (
    material: OpsMaterial,
    newSupplier?: OpsSupplier
  ) => void;
  onAddProject: (project: OpsProject) => void;
  onAddWarehouse: (warehouse: OpsWarehouse) => void;
  onAddStaff: (staff: OpsStaffMember) => void;
  onSwitchToAdmin: () => void;
}

const INPUT_CLASS =
  "h-9 w-full rounded-xl border border-white/[0.1] bg-[#141414] px-3 text-sm text-[#e7e7e7] placeholder:text-[#666666] transition-colors focus-visible:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50";

const OPTION_CLASS = "bg-[#1a1a1a] text-[#e7e7e7]";

const PRIMARY_BTN_CLASS =
  "inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-sm font-medium text-black transition-all duration-200 hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a] cursor-pointer";

export default function AdminMasterDataPanel({
  roleType,
  baseItems,
  opsState,
  onAddMaterialAndSupplier,
  onAddProject,
  onAddWarehouse,
  onAddStaff,
  onSwitchToAdmin,
}: AdminMasterDataPanelProps) {
  const [matCode, setMatCode] = useState("");
  const [matName, setMatName] = useState("");
  const [matUnit, setMatUnit] = useState<ItemUnit>("PCS");
  const [matRole, setMatRole] = useState<ItemRole>("Independent");
  const [matLeadDays, setMatLeadDays] = useState("60");
  const [supMode, setSupMode] = useState<"existing" | "new">("existing");
  const [selectedSupId, setSelectedSupId] = useState(
    opsState.suppliers[0]?.supplier_id ?? "SUP-PCC-001"
  );
  const [newSupId, setNewSupId] = useState("");
  const [newSupName, setNewSupName] = useState("");
  const [newSupCategory, setNewSupCategory] = useState("Electrical Hardware");

  const [projId, setProjId] = useState("");
  const [projName, setProjName] = useState("");
  const [projRegion, setProjRegion] = useState("");

  const [whId, setWhId] = useState("");
  const [whName, setWhName] = useState("");
  const [whProjId, setWhProjId] = useState(
    opsState.projects[0]?.project_id ?? "PRJ-KNP-RDSS"
  );
  const [whDistKm, setWhDistKm] = useState("70");

  const [staffId, setStaffId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffTitle, setStaffTitle] = useState<"Site Manager" | "Supervisor">(
    "Site Manager"
  );
  const [staffWhId, setStaffWhId] = useState(
    opsState.warehouses[0]?.warehouse_id ?? "WH-KNP-01"
  );
  const [staffContact, setStaffContact] = useState("");

  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  if (roleType !== "ADMIN_HEAD") {
    return (
      <section className="rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-10 text-center">
        <Lock
          aria-hidden="true"
          className="mx-auto h-5 w-5 text-[#898989]"
        />
        <h3 className="mt-3 text-[17px] font-medium text-[#e7e7e7]">
          Head Admin access required
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-[#a0a0a0]">
          Master data onboarding is restricted to the Head Admin role.
        </p>
        <button
          type="button"
          onClick={onSwitchToAdmin}
          className={`mt-5 ${PRIMARY_BTN_CLASS}`}
        >
          Switch to Head Admin
        </button>
      </section>
    );
  }

  const allMaterials = getAllCatalogMaterials(baseItems, opsState);

  const flash = (msg: string) => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    setFeedback(msg);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 4000);
  };

  const handleMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = matCode.trim().toUpperCase();
    const name = matName.trim();
    const lt = Math.max(1, Number(matLeadDays) || 30);
    if (!code || !name) return;
    if (allMaterials.some((m) => m.item_code === code)) {
      flash(`Material ID ${code} already exists in the catalog.`);
      return;
    }

    let supId = selectedSupId;
    let supName =
      opsState.suppliers.find((s) => s.supplier_id === selectedSupId)?.name ??
      "Lumino Approved Vendor";
    let createdSupplier: OpsSupplier | undefined;

    if (supMode === "new") {
      const sid =
        newSupId.trim().toUpperCase() ||
        `SUP-${Date.now().toString().slice(-4)}`;
      const sname = newSupName.trim();
      if (!sname) return;
      supId = sid;
      supName = sname;
      createdSupplier = {
        supplier_id: sid,
        name: sname,
        category: newSupCategory.trim() || "General Electrical",
        avg_delivery_days: lt,
        on_time_rate_pct: 95,
      };
    }

    onAddMaterialAndSupplier(
      {
        item_code: code,
        item_name: name,
        unit: matUnit,
        lead_time_days: lt,
        role: matRole,
        supplier_id: supId,
        supplier_name: supName,
        is_custom: true,
      },
      createdSupplier
    );
    setMatCode("");
    setMatName("");
    setNewSupId("");
    setNewSupName("");
    flash(`Added material ${code} (${matUnit}, ${lt}d LT) linked to ${supId}.`);
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = projId.trim().toUpperCase();
    const name = projName.trim();
    if (!id || !name) return;
    if (opsState.projects.some((p) => p.project_id === id)) {
      flash(`Project ID ${id} already exists.`);
      return;
    }
    onAddProject({
      project_id: id,
      name,
      region: projRegion.trim() || "Uttar Pradesh",
      status: "ACTIVE",
      created_at: new Date().toISOString().slice(0, 10),
    });
    setProjId("");
    setProjName("");
    setProjRegion("");
    flash(`Created project ${id} — ${name}.`);
  };

  const handleWarehouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = whId.trim().toUpperCase();
    const name = whName.trim().toUpperCase();
    if (!id || !name) return;
    if (
      opsState.warehouses.some((w) => w.warehouse_id === id || w.name === name)
    ) {
      flash(`Warehouse ${id} / ${name} already exists.`);
      return;
    }
    onAddWarehouse({
      warehouse_id: id,
      name,
      project_id: whProjId,
      distance_from_hub_km: Math.max(5, Number(whDistKm) || 60),
      is_core_godown: false,
    });
    setWhId("");
    setWhName("");
    flash(`Registered warehouse ${name} (${id}) under ${whProjId}.`);
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id =
      staffId.trim().toUpperCase() || `SM-${Date.now().toString().slice(-4)}`;
    const name = staffName.trim();
    if (!name) return;
    const wh = opsState.warehouses.find((w) => w.warehouse_id === staffWhId);
    if (!wh) return;
    onAddStaff({
      staff_id: id,
      name,
      title: staffTitle,
      warehouse_id: wh.warehouse_id,
      project_id: wh.project_id,
      contact:
        staffContact.trim() ||
        `${name.toLowerCase().replace(/\s+/g, ".")}@lumino.in`,
    });
    setStaffId("");
    setStaffName("");
    setStaffContact("");
    flash(`Onboarded ${staffTitle} ${name} (${id}) to ${wh.name}.`);
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-[20px] border border-white/[0.08] bg-[#1a1a1a] px-5 py-3.5 text-sm text-[#e7e7e7]"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]"
          />
          <span>{feedback}</span>
        </div>
      )}

      {/* Row 1: Onboarding Forms */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form 1: New Material & Supplier */}
        <form
          onSubmit={handleMaterialSubmit}
          className="space-y-4 rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-6"
        >
          <div>
            <h3 className="text-[17px] font-medium text-[#e7e7e7]">
              Add material &amp; supplier mapping
            </h3>
            <p className="mt-0.5 text-xs text-[#a0a0a0]">
              Register new SKUs with UOM, lead time, and supplier ID.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-normal text-[#898989]">
                Material ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MPO010099"
                value={matCode}
                onChange={(e) => setMatCode(e.target.value)}
                className={`${INPUT_CLASS} font-mono text-xs`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-normal text-[#898989]">
                Lead time (days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                required
                value={matLeadDays}
                onChange={(e) => setMatLeadDays(e.target.value)}
                className={`${INPUT_CLASS} tabular-nums`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-normal text-[#898989]">
              Material name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 11KV Polymer Pin Insulator with GI Pin"
              value={matName}
              onChange={(e) => setMatName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-normal text-[#898989]">
                Unit (UOM)
              </label>
              <select
                value={matUnit}
                onChange={(e) => setMatUnit(e.target.value as ItemUnit)}
                className={INPUT_CLASS}
              >
                {ITEM_UNITS.map((u) => (
                  <option key={u} value={u} className={OPTION_CLASS}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-normal text-[#898989]">
                Kit role
              </label>
              <select
                value={matRole}
                onChange={(e) => setMatRole(e.target.value as ItemRole)}
                className={INPUT_CLASS}
              >
                {ITEM_ROLES.map((r) => (
                  <option key={r} value={r} className={OPTION_CLASS}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier Link Divider Section */}
          <div className="space-y-3 border-t border-white/[0.06] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-normal text-[#898989]">
                Supplier link
              </span>
              <div className="inline-flex rounded-full border border-white/[0.06] bg-white/[0.05] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSupMode("existing")}
                  className={`rounded-full px-3 py-1 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
                    supMode === "existing"
                      ? "bg-white font-medium text-black shadow-sm"
                      : "text-[#a0a0a0] hover:text-white"
                  }`}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => setSupMode("new")}
                  className={`rounded-full px-3 py-1 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer ${
                    supMode === "new"
                      ? "bg-white font-medium text-black shadow-sm"
                      : "text-[#a0a0a0] hover:text-white"
                  }`}
                >
                  New supplier
                </button>
              </div>
            </div>

            {supMode === "existing" ? (
              <select
                aria-label="Select existing supplier"
                value={selectedSupId}
                onChange={(e) => setSelectedSupId(e.target.value)}
                className={INPUT_CLASS}
              >
                {opsState.suppliers.map((s) => (
                  <option
                    key={s.supplier_id}
                    value={s.supplier_id}
                    className={OPTION_CLASS}
                  >
                    {s.supplier_id} — {s.name} (avg {s.avg_delivery_days}d)
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="SUP-006"
                  value={newSupId}
                  onChange={(e) => setNewSupId(e.target.value)}
                  className={`${INPUT_CLASS} font-mono text-xs`}
                />
                <input
                  type="text"
                  required
                  placeholder="Supplier name"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className={INPUT_CLASS}
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={newSupCategory}
                  onChange={(e) => setNewSupCategory(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            )}
          </div>

          <button type="submit" className={PRIMARY_BTN_CLASS}>
            Add material to catalog
          </button>
        </form>

        {/* Right Column: Project, Warehouse & Staff Forms */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Add Project */}
            <form
              onSubmit={handleProjectSubmit}
              className="space-y-3 rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-6"
            >
              <h3 className="text-[15px] font-medium text-[#e7e7e7]">
                Add project
              </h3>
              <input
                type="text"
                required
                placeholder="Project ID (PRJ-LKO-02)"
                value={projId}
                onChange={(e) => setProjId(e.target.value)}
                className={`${INPUT_CLASS} font-mono text-xs`}
              />
              <input
                type="text"
                required
                placeholder="Project name"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                className={INPUT_CLASS}
              />
              <input
                type="text"
                placeholder="Region / circle"
                value={projRegion}
                onChange={(e) => setProjRegion(e.target.value)}
                className={INPUT_CLASS}
              />
              <button type="submit" className={`w-full ${PRIMARY_BTN_CLASS}`}>
                Register project
              </button>
            </form>

            {/* Add Warehouse */}
            <form
              onSubmit={handleWarehouseSubmit}
              className="space-y-3 rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-6"
            >
              <h3 className="text-[15px] font-medium text-[#e7e7e7]">
                Add warehouse
              </h3>
              <input
                type="text"
                required
                placeholder="Warehouse ID (WH-UNN-07)"
                value={whId}
                onChange={(e) => setWhId(e.target.value)}
                className={`${INPUT_CLASS} font-mono text-xs`}
              />
              <input
                type="text"
                required
                placeholder="Warehouse name"
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                className={INPUT_CLASS}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Warehouse project"
                  value={whProjId}
                  onChange={(e) => setWhProjId(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {opsState.projects.map((p) => (
                    <option
                      key={p.project_id}
                      value={p.project_id}
                      className={OPTION_CLASS}
                    >
                      {p.project_id}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={5}
                  placeholder="km to hub"
                  value={whDistKm}
                  onChange={(e) => setWhDistKm(e.target.value)}
                  className={`${INPUT_CLASS} tabular-nums`}
                />
              </div>
              <button type="submit" className={`w-full ${PRIMARY_BTN_CLASS}`}>
                Add warehouse
              </button>
            </form>
          </div>

          {/* Add Site Manager / Supervisor */}
          <form
            onSubmit={handleStaffSubmit}
            className="space-y-3 rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-6"
          >
            <div>
              <h3 className="text-[15px] font-medium text-[#e7e7e7]">
                Onboard site manager or supervisor
              </h3>
              <p className="mt-0.5 text-xs text-[#a0a0a0]">
                Assigned staff appear immediately in the RBAC profile switcher.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input
                type="text"
                placeholder="Staff ID (SM-07)"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className={`${INPUT_CLASS} font-mono text-xs`}
              />
              <input
                type="text"
                required
                placeholder="Full name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className={INPUT_CLASS}
              />
              <select
                aria-label="Staff role"
                value={staffTitle}
                onChange={(e) =>
                  setStaffTitle(e.target.value as "Site Manager" | "Supervisor")
                }
                className={INPUT_CLASS}
              >
                <option value="Site Manager" className={OPTION_CLASS}>
                  Site Manager
                </option>
                <option value="Supervisor" className={OPTION_CLASS}>
                  Supervisor
                </option>
              </select>
              <select
                aria-label="Assigned warehouse"
                value={staffWhId}
                onChange={(e) => setStaffWhId(e.target.value)}
                className={INPUT_CLASS}
              >
                {opsState.warehouses.map((w) => (
                  <option
                    key={w.warehouse_id}
                    value={w.warehouse_id}
                    className={OPTION_CLASS}
                  >
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="Email (optional)"
                value={staffContact}
                onChange={(e) => setStaffContact(e.target.value)}
                className={`${INPUT_CLASS} flex-1`}
              />
              <button
                type="submit"
                className={`shrink-0 ${PRIMARY_BTN_CLASS}`}
              >
                Assign staff
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Live Master Registries */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Materials & Suppliers Table */}
        <section className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h4 className="text-[15px] font-medium text-[#e7e7e7]">
              Material &amp; supplier registry ({allMaterials.length})
            </h4>
            <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs text-[#a0a0a0] tabular-nums">
              {opsState.suppliers.length} suppliers
            </span>
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#161616] text-xs font-normal text-[#898989]">
                <tr>
                  <th className="px-6 py-2.5 text-left font-normal">SKU</th>
                  <th className="px-4 py-2.5 text-left font-normal">
                    Supplier
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">UOM</th>
                  <th className="px-6 py-2.5 text-right font-normal">
                    Lead time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
                {allMaterials.map((m) => (
                  <tr
                    key={m.item_code}
                    className="transition-colors duration-150 hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-white">
                          {m.item_code}
                        </span>
                        {m.is_custom && (
                          <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-300">
                            New
                          </span>
                        )}
                      </div>
                      <div className="max-w-[200px] truncate text-xs text-[#898989]">
                        {m.item_name}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-xs text-[#898989]">
                        {m.supplier_id}
                      </div>
                      <div className="max-w-[160px] truncate text-xs text-[#a0a0a0]">
                        {m.supplier_name}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-[#898989]">
                      {m.unit}
                    </td>
                    <td className="whitespace-nowrap px-6 py-2.5 text-right font-medium text-white tabular-nums">
                      {m.lead_time_days}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sites, Projects & RBAC Staff Directory */}
        <section className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h4 className="text-[15px] font-medium text-[#e7e7e7]">
              Sites &amp; RBAC staff ({opsState.staff.length})
            </h4>
            <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs text-[#a0a0a0] tabular-nums">
              {opsState.projects.length} project
              {opsState.projects.length === 1 ? "" : "s"} ·{" "}
              {opsState.warehouses.length} sites
            </span>
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#161616] text-xs font-normal text-[#898989]">
                <tr>
                  <th className="px-6 py-2.5 text-left font-normal">Staff</th>
                  <th className="px-4 py-2.5 text-left font-normal">Role</th>
                  <th className="px-4 py-2.5 text-left font-normal">
                    Assigned site
                  </th>
                  <th className="px-6 py-2.5 text-left font-normal">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
                {opsState.staff.map((s) => {
                  const wh = opsState.warehouses.find(
                    (w) => w.warehouse_id === s.warehouse_id
                  );
                  return (
                    <tr
                      key={s.staff_id}
                      className="transition-colors duration-150 hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-2.5">
                        <div className="font-medium text-[#e7e7e7]">
                          {s.name}
                        </div>
                        <div className="text-xs text-[#898989]">
                          <span className="font-mono">{s.staff_id}</span> ·{" "}
                          {s.contact}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="rounded-full border border-white/[0.06] bg-white/[0.05] px-2.5 py-0.5 text-xs text-[#a0a0a0]">
                          {s.title}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[#e7e7e7]">
                        {wh?.name ?? s.warehouse_id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-2.5 font-mono text-xs text-[#898989]">
                        {s.project_id}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
