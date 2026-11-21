"use client";

import { useState } from "react";
import {
  Building2,
  FolderPlus,
  Lock,
  PackagePlus,
  Plus,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";
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
  onAddMaterialAndSupplier: (material: OpsMaterial, newSupplier?: OpsSupplier) => void;
  onAddProject: (project: OpsProject) => void;
  onAddWarehouse: (warehouse: OpsWarehouse) => void;
  onAddStaff: (staff: OpsStaffMember) => void;
  onSwitchToAdmin: () => void;
}

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

  if (roleType !== "ADMIN_HEAD") {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-bold text-slate-900">
          Admin / Head of Projects Access Required
        </h3>
        <p className="mx-auto mt-1 max-w-lg text-xs text-slate-600">
          Role-Based Access Control (RBAC) restricts master data onboarding
          (materials, supplier IDs, projects, warehouses, and site
          managers/supervisors) strictly to the Admin role.
        </p>
        <button
          type="button"
          onClick={onSwitchToAdmin}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
        >
          Switch to Admin / Head of Projects
        </button>
      </section>
    );
  }

  const allMaterials = getAllCatalogMaterials(baseItems, opsState);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 4000);
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
      const sid = newSupId.trim().toUpperCase() || `SUP-${Date.now().toString().slice(-4)}`;
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
    if (opsState.warehouses.some((w) => w.warehouse_id === id || w.name === name)) {
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
    const id = staffId.trim().toUpperCase() || `SM-${Date.now().toString().slice(-4)}`;
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
      contact: staffContact.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@lumino.in`,
    });
    setStaffId("");
    setStaffName("");
    setStaffContact("");
    flash(`Onboarded ${staffTitle} ${name} (${id}) to ${wh.name} — available in RBAC Role Switcher!`);
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900">
          {feedback}
        </div>
      )}

      {/* Row 1: Add Material + Supplier AND Add Project & Warehouse */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Form 1: New Material & Supplier */}
        <form
          onSubmit={handleMaterialSubmit}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Add New Material &amp; Supplier Mapping
              </h3>
              <p className="text-[11px] text-slate-500">
                Register new SKUs by Material ID, unit, lead time, and Supplier ID.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Material ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MPO010099"
                value={matCode}
                onChange={(e) => setMatCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Lead Time (Days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                required
                value={matLeadDays}
                onChange={(e) => setMatLeadDays(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600">
              Material Name / Specification
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 11KV Polymer Pin Insulator with GI Pin"
              value={matName}
              onChange={(e) => setMatName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Unit (UOM)
              </label>
              <select
                value={matUnit}
                onChange={(e) => setMatUnit(e.target.value as ItemUnit)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              >
                {ITEM_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Kit Role
              </label>
              <select
                value={matRole}
                onChange={(e) => setMatRole(e.target.value as ItemRole)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              >
                {ITEM_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">
                Supplier Link
              </span>
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSupMode("existing")}
                  className={`rounded px-2 py-0.5 font-semibold cursor-pointer ${
                    supMode === "existing"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600"
                  }`}
                >
                  Existing Supplier
                </button>
                <button
                  type="button"
                  onClick={() => setSupMode("new")}
                  className={`rounded px-2 py-0.5 font-semibold cursor-pointer ${
                    supMode === "new"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600"
                  }`}
                >
                  + New Supplier ID
                </button>
              </div>
            </div>

            {supMode === "existing" ? (
              <select
                value={selectedSupId}
                onChange={(e) => setSelectedSupId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              >
                {opsState.suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.supplier_id} — {s.name} (avg {s.avg_delivery_days}d)
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Supplier ID (SUP-006)"
                  value={newSupId}
                  onChange={(e) => setNewSupId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="Supplier Name"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={newSupCategory}
                  onChange={(e) => setNewSupCategory(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Material to Catalog
          </button>
        </form>

        {/* Form 2 & 3: Add Project + Add Warehouse + Add Manager/Supervisor */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Add Project */}
            <form
              onSubmit={handleProjectSubmit}
              className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Add New Project
                </h3>
              </div>
              <input
                type="text"
                required
                placeholder="Project ID (e.g. PRJ-LKO-02)"
                value={projId}
                onChange={(e) => setProjId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
              />
              <input
                type="text"
                required
                placeholder="Project Name"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <input
                type="text"
                placeholder="Region / Circle"
                value={projRegion}
                onChange={(e) => setProjRegion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
              >
                + Register Project
              </button>
            </form>

            {/* Add Warehouse */}
            <form
              onSubmit={handleWarehouseSubmit}
              className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Add New Warehouse / Site
                </h3>
              </div>
              <input
                type="text"
                required
                placeholder="Warehouse ID (WH-UNN-07)"
                value={whId}
                onChange={(e) => setWhId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
              />
              <input
                type="text"
                required
                placeholder="Warehouse Name (UNNAO STORE)"
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={whProjId}
                  onChange={(e) => setWhProjId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                >
                  {opsState.projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
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
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 cursor-pointer"
              >
                + Add Warehouse
              </button>
            </form>
          </div>

          {/* Add Site Manager / Supervisor */}
          <form
            onSubmit={handleStaffSubmit}
            className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900">
                Onboard Site Manager / Supervisor (Auto-Enables RBAC Role)
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                type="text"
                placeholder="Staff ID (SM-07)"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
              />
              <input
                type="text"
                required
                placeholder="Full Name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <select
                value={staffTitle}
                onChange={(e) =>
                  setStaffTitle(e.target.value as "Site Manager" | "Supervisor")
                }
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
              >
                <option value="Site Manager">Site Manager</option>
                <option value="Supervisor">Supervisor</option>
              </select>
              <select
                value={staffWhId}
                onChange={(e) => setStaffWhId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
              >
                {opsState.warehouses.map((w) => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="Email / Contact (optional)"
                value={staffContact}
                onChange={(e) => setStaffContact(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800 cursor-pointer"
              >
                + Assign Manager / Supervisor
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Live Master Registries: Materials+Suppliers & Staff+Warehouses */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Materials & Suppliers Table */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Truck className="h-4 w-4 text-amber-600" />
              Material &amp; Supplier Registry ({allMaterials.length} SKUs)
            </h4>
            <span className="font-mono text-[11px] text-slate-500">
              {opsState.suppliers.length} Active Suppliers
            </span>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-2.5 py-2 text-left font-semibold">SKU ID</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Supplier</th>
                  <th className="px-2.5 py-2 text-right font-semibold">UOM</th>
                  <th className="px-2.5 py-2 text-right font-semibold">Lead Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allMaterials.map((m) => (
                  <tr key={m.item_code} className="hover:bg-slate-50">
                    <td className="px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-900">
                        <span>{m.item_code}</span>
                        {m.is_custom && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="max-w-[200px] truncate text-[11px] text-slate-500">
                        {m.item_name}
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <div className="font-mono text-[11px] font-semibold text-slate-800">
                        {m.supplier_id}
                      </div>
                      <div className="max-w-[160px] truncate text-[11px] text-slate-500">
                        {m.supplier_name}
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono text-slate-700">
                      {m.unit}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-amber-800">
                      {m.lead_time_days}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Projects, Warehouses & Staff RBAC Directory */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Users className="h-4 w-4 text-indigo-600" />
              Sites, Projects &amp; RBAC Staff ({opsState.staff.length} Assigned)
            </h4>
            <span className="font-mono text-[11px] text-slate-500">
              {opsState.projects.length} Project(s) · {opsState.warehouses.length} Sites
            </span>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-2.5 py-2 text-left font-semibold">Staff</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Role</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Assigned Site</th>
                  <th className="px-2.5 py-2 text-left font-semibold">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opsState.staff.map((s) => {
                  const wh = opsState.warehouses.find(
                    (w) => w.warehouse_id === s.warehouse_id
                  );
                  return (
                    <tr key={s.staff_id} className="hover:bg-slate-50">
                      <td className="px-2.5 py-1.5">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {s.staff_id} · {s.contact}
                        </div>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            s.title === "Site Manager"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {s.title}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 font-medium text-slate-800">
                        {wh?.name ?? s.warehouse_id}
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-[11px] text-slate-600">
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
