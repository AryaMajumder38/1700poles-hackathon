import type { ItemUnit } from "@/types/lumino";

export function formatQty(value: number, unit?: ItemUnit | string): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "0";
  }

  // G.I. Nuts & Bolts or items measured in Metric Tonnes (MT) require decimal precision
  if (unit === "MT" || unit === "KM") {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(value);
  }

  // Integer items or whole items (PCS, NOS, SET, etc.)
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatWithUnit(value: number, unit?: ItemUnit | string): string {
  const formatted = formatQty(value, unit);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map((row) =>
      row
        .map((val) => {
          if (typeof val === "number") return val;
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
