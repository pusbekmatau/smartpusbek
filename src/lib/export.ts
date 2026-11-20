import type { DataRow } from "./types";

/** Neutralises formula injection (=, +, -, @, tab, CR) in exported cells. */
function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

export function exportCsv(baseName: string, columns: string[], rows: DataRow[]) {
  const escape = (v: string) => `"${safeCell(v).replace(/"/g, '""')}"`;
  const lines = [columns.map(escape).join(","), ...rows.map((r) => columns.map((c) => escape(r.values[c] ?? "")).join(","))];
  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${baseName}-${stamp()}.csv`);
}

export async function exportXlsx(baseName: string, title: string, columns: string[], rows: DataRow[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SMART PUSBEKMATAU";
  workbook.created = new Date();
  const ws = workbook.addWorksheet(title.slice(0, 31).replace(/[\\/*?:[\]]/g, " "), { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c, key: c, width: Math.min(48, Math.max(12, c.length + 4)) }));
  rows.forEach((r) => ws.addRow(Object.fromEntries(columns.map((c) => [c, safeCell(r.values[c] ?? "")]))));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFF8FAFC" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1222" } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, columns.length) } };
  const buffer = await workbook.xlsx.writeBuffer();
  download(new Blob([buffer], { type: "application/octet-stream" }), `${baseName}-${stamp()}.xlsx`);
}
