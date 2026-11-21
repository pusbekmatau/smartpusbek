"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CloudUpload,
  Eye,
  FileDown,
  FileText,
  Filter,
  Plus,
  Rows3,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { exportCsv, exportXlsx } from "@/lib/export";
import { formatNumber } from "@/lib/format";
import { compareValues, matchesBucket, preferredDimensions, profileColumns } from "@/lib/stats";
import { PIE_SERIES } from "./chart-theme";
import type { ConnectorMode, DataRow } from "@/lib/types";
import { AddRecordModal } from "./AddRecordModal";
import { CellEditor, type CommitIntent } from "./CellEditor";

interface GridProps {
  slug: string;
  title: string;
  columns: string[];
  rows: DataRow[];
  mode: ConnectorMode;
  setRows: (updater: (rows: DataRow[]) => DataRow[]) => void;
  onStructuralChange: () => void;
  permissions: { create: boolean; update: boolean; delete: boolean; export: boolean };
  initialQuery?: string;
  /** Filter pushed from a chart click: only rows whose `column` equals `value` are shown. */
  externalFilter?: { column: string; value: string } | null;
  onClearExternalFilter?: () => void;
}

type CellRef = { rowId: string; column: string };
type SaveState = { phase: "idle" } | { phase: "saving"; count: number } | { phase: "saved" } | { phase: "error"; message: string };

const PAGE_SIZES = [10, 25, 50, 100];
const SYS_INDEX = "__index";
const SYS_ACTIONS = "__actions";

const includesText: FilterFn<DataRow> = (row, columnId, filterValue: string) =>
  String(row.getValue(columnId) ?? "")
    .toLowerCase()
    .includes(String(filterValue).toLowerCase());

const matchesAnyColumn: FilterFn<DataRow> = (row, _columnId, filterValue: string) => {
  const term = String(filterValue).trim().toLowerCase();
  if (!term) return true;
  return Object.values(row.original.values).some((v) => v.toLowerCase().includes(term));
};

const cellKey = (c: CellRef) => `${c.rowId}\u0000${c.column}`;

export function InteractiveDataGrid({ slug, title, columns, rows, mode, setRows, onStructuralChange, permissions, initialQuery = "", externalFilter = null, onClearExternalFilter }: GridProps) {
  const toast = useToast();
  const [globalFilter, setGlobalFilter] = useState(initialQuery);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [showFilters, setShowFilters] = useState(false);
  const [active, setActive] = useState<CellRef | null>(null);
  const [editing, setEditing] = useState<(CellRef & { seed?: string }) | null>(null);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [save, setSave] = useState<SaveState>({ phase: "idle" });
  const [pending, setPending] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState<Record<string, string>>({});
  const [quickBusy, setQuickBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DataRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const quickFirstRef = useRef<HTMLInputElement>(null);

  useEffect(() => setGlobalFilter(initialQuery), [initialQuery]);
  useEffect(() => setPagination((p) => ({ ...p, pageIndex: 0 })), [globalFilter, columnFilters, externalFilter]);

  // ------------------------------------------------------------------ table

  const columnDefs = useMemo<ColumnDef<DataRow>[]>(() => {
    const data: ColumnDef<DataRow>[] = columns.map((name) => ({
      id: name,
      header: name,
      accessorFn: (row) => row.values[name] ?? "",
      sortingFn: (a, b, id) => compareValues(String(a.getValue(id)), String(b.getValue(id))),
      filterFn: includesText,
    }));
    const index: ColumnDef<DataRow> = { id: SYS_INDEX, header: "#", enableSorting: false, enableColumnFilter: false };
    const actions: ColumnDef<DataRow> = { id: SYS_ACTIONS, header: "", enableSorting: false, enableColumnFilter: false };
    return permissions.delete ? [index, ...data, actions] : [index, ...data];
  }, [columns, permissions.delete]);

  const visibleRows = useMemo(
    () => (externalFilter ? rows.filter((r) => matchesBucket(r.values[externalFilter.column], externalFilter.value)) : rows),
    [rows, externalFilter],
  );

  // Low-cardinality text columns (status, jenis, …) get colour chips so they scan quickly.
  const chipColors = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const p of preferredDimensions(profileColumns(columns, rows))) {
      if (p.distinct > 8 || p.distinct < 2) continue;
      const values = new Map<string, string>();
      for (const r of rows) {
        const v = (r.values[p.name] ?? "").trim().toLowerCase();
        if (v && !values.has(v)) values.set(v, PIE_SERIES[values.size % PIE_SERIES.length]);
      }
      map.set(p.name, values);
    }
    return map;
  }, [columns, rows]);

  const table = useReactTable({
    data: visibleRows,
    columns: columnDefs,
    getRowId: (row) => row.id,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: matchesAnyColumn,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageRows = table.getRowModel().rows;
  const filteredCount = table.getPrePaginationRowModel().rows.length;
  const canEdit = permissions.update;

  // ------------------------------------------------------------------ saving

  const markSaved = useCallback((key: string) => {
    setFlash((f) => ({ ...f, [key]: Date.now() }));
    setTimeout(
      () =>
        setFlash((f) => {
          const next = { ...f };
          delete next[key];
          return next;
        }),
      1400,
    );
  }, []);

  useEffect(() => {
    if (pending > 0) setSave({ phase: "saving", count: pending });
  }, [pending]);

  const commitCell = useCallback(
    async (ref: CellRef, value: string) => {
      const previous = rows.find((r) => r.id === ref.rowId)?.values[ref.column] ?? "";
      if (previous === value) return;
      setRows((list) => list.map((r) => (r.id === ref.rowId ? { ...r, values: { ...r.values, [ref.column]: value } } : r)));
      setPending((n) => n + 1);
      try {
        const res = await apiFetch<{ row: DataRow }>(`/api/database/${slug}`, {
          method: "PATCH",
          json: { rowId: ref.rowId, values: { [ref.column]: value } },
        });
        setRows((list) => list.map((r) => (r.id === ref.rowId ? res.row : r)));
        markSaved(cellKey(ref));
        setSave({ phase: "saved" });
      } catch (err) {
        // Roll back only if no newer edit replaced the optimistic value.
        setRows((list) =>
          list.map((r) =>
            r.id === ref.rowId && r.values[ref.column] === value ? { ...r, values: { ...r.values, [ref.column]: previous } } : r,
          ),
        );
        const message = err instanceof ApiError ? err.message : "Perubahan gagal disimpan.";
        setSave({ phase: "error", message });
        toast("error", "Perubahan dibatalkan", message);
      } finally {
        setPending((n) => n - 1);
      }
    },
    [rows, setRows, slug, markSaved, toast],
  );

  // ------------------------------------------------------------------ keyboard navigation

  const move = useCallback(
    (from: CellRef, dRow: number, dCol: number): CellRef | null => {
      const r = pageRows.findIndex((row) => row.id === from.rowId);
      const c = columns.indexOf(from.column);
      if (r === -1 || c === -1) return null;
      let nr = r + dRow;
      let nc = c + dCol;
      if (nc >= columns.length) {
        nc = 0;
        nr += 1;
      } else if (nc < 0) {
        nc = columns.length - 1;
        nr -= 1;
      }
      if (nr < 0 || nr >= pageRows.length) return from;
      return { rowId: pageRows[nr].id, column: columns[nc] };
    },
    [pageRows, columns],
  );

  const focusGrid = () => requestAnimationFrame(() => gridRef.current?.focus({ preventScroll: true }));

  const onEditorCommit = (ref: CellRef, value: string, intent: CommitIntent) => {
    setEditing(null);
    void commitCell(ref, value);
    const delta: Record<CommitIntent, [number, number]> = { down: [1, 0], right: [0, 1], left: [0, -1], stay: [0, 0] };
    const [dr, dc] = delta[intent];
    const next = intent === "stay" ? ref : move(ref, dr, dc);
    if (next) setActive(next);
    if (intent !== "stay") focusGrid();
  };

  const onGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing || !active) return;
    const arrows: Record<string, [number, number]> = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] };
    if (arrows[e.key]) {
      e.preventDefault();
      const next = move(active, ...arrows[e.key]);
      if (next) setActive(next);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const next = move(active, 0, e.shiftKey ? -1 : 1);
      if (next) setActive(next);
    } else if ((e.key === "Enter" || e.key === "F2") && canEdit) {
      e.preventDefault();
      setEditing(active);
    } else if (e.key === "Escape") {
      setActive(null);
    } else if (canEdit && (e.key === "Delete" || e.key === "Backspace")) {
      e.preventDefault();
      void commitCell(active, "");
    } else if (canEdit && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setEditing({ ...active, seed: e.key });
    }
  };

  useEffect(() => {
    if (!active) return;
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${CSS.escape(cellKey(active))}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  // ------------------------------------------------------------------ create / delete

  const createRecord = async (values: Record<string, string>): Promise<boolean> => {
    try {
      const res = await apiFetch<{ row: DataRow }>(`/api/database/${slug}`, { method: "POST", json: { values } });
      setRows((list) => [...list, res.row]);
      markSaved(`row:${res.row.id}`);
      setSave({ phase: "saved" });
      toast("success", "Entri baru tersimpan", "Data telah disinkronkan ke Basis Data Server.");
      return true;
    } catch (err) {
      toast("error", "Gagal menambahkan entri", err instanceof ApiError ? err.message : undefined);
      return false;
    }
  };

  const submitQuick = async () => {
    if (!Object.values(quick).some((v) => v.trim())) return;
    setQuickBusy(true);
    const ok = await createRecord(quick);
    setQuickBusy(false);
    if (ok) {
      setQuick({});
      quickFirstRef.current?.focus();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/database/${slug}`, { method: "DELETE", json: { rowId: deleteTarget.id } });
      setRows((list) => list.filter((r) => r.id !== deleteTarget.id));
      toast("success", "Baris dihapus", "Penghapusan tercatat dalam Log Audit.");
      setDeleteTarget(null);
      // Live sources renumber rows after a deletion — refresh identifiers.
      if (mode === "live") onStructuralChange();
    } catch (err) {
      toast("error", "Penghapusan gagal", err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  const exportRows = () => table.getPrePaginationRowModel().rows.map((r) => r.original);

  // ------------------------------------------------------------------ render

  const { pageIndex, pageSize } = table.getState().pagination;
  const from = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(filteredCount, (pageIndex + 1) * pageSize);
  const writable = permissions.create || permissions.update;

  return (
    <section className="glass overflow-hidden rounded-2xl">
      {externalFilter && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gold/30 bg-gold/10 px-4 py-2.5 text-xs sm:px-5">
          <span className="text-mist">Filter dari grafik:</span>
          <span className="rounded-md bg-gold/20 px-2 py-0.5 font-medium text-gold-soft">
            {externalFilter.column} = {externalFilter.value}
          </span>
          <span className="tabular text-mist">{formatNumber(visibleRows.length)} entri</span>
          <button type="button" onClick={onClearExternalFilter} className="focus-ring ml-auto rounded-md border border-line px-2.5 py-1 text-mist transition hover:border-line-strong hover:text-ink">
            Hapus filter ✕
          </button>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-haze" aria-hidden />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari di semua kolom…"
            aria-label="Pencarian tabel"
            className="focus-ring h-9 w-full rounded-lg border border-line bg-abyss/60 pr-3 pl-9 text-sm text-ink placeholder:text-haze focus:border-gold/40"
          />
        </div>
        <Button size="sm" variant={showFilters ? "secondary" : "ghost"} onClick={() => setShowFilters((s) => !s)} icon={<Filter className="size-3.5" aria-hidden />}>
          Filter Kolom
        </Button>

        <SaveIndicator state={save} readOnly={!writable} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {permissions.export && (
            <>
              <Button size="sm" variant="ghost" onClick={() => exportCsv(slug, columns, exportRows())} icon={<FileText className="size-3.5" aria-hidden />}>
                CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void exportXlsx(slug, title, columns, exportRows())}
                icon={<FileDown className="size-3.5" aria-hidden />}
              >
                Excel
              </Button>
            </>
          )}
          {permissions.create && (
            <>
              <Button
                size="sm"
                variant={quickOpen ? "secondary" : "ghost"}
                onClick={() => {
                  setQuickOpen((q) => !q);
                  requestAnimationFrame(() => quickFirstRef.current?.focus());
                }}
                icon={<Rows3 className="size-3.5" aria-hidden />}
              >
                + Baris Cepat
              </Button>
              <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} icon={<Plus className="size-3.5" aria-hidden />}>
                Tambah Entri Baru
              </Button>
            </>
          )}
        </div>
      </div>

      {canEdit && (
        <p className="border-b border-line px-5 py-2 text-[0.68rem] text-haze">
          Klik ganda atau tekan <Kbd>Enter</Kbd> untuk mengedit · <Kbd>Tab</Kbd>/<Kbd>Shift+Tab</Kbd> berpindah kolom · <Kbd>Esc</Kbd> membatalkan · perubahan tersimpan otomatis.
        </p>
      )}

      {/* Grid */}
      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label={`Tabel ${title}`}
        aria-readonly={!canEdit}
        onKeyDown={onGridKeyDown}
        className="thin-scroll relative max-h-[68vh] overflow-auto outline-none"
      >
        <table className="w-max min-w-full border-separate border-spacing-0 text-left text-[0.8rem]">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const id = header.column.id;
                  const sorted = header.column.getIsSorted();
                  const isSystem = id === SYS_INDEX || id === SYS_ACTIONS;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        "border-b-2 border-gold/40 bg-deck/95 px-3 py-2.5 align-bottom text-[0.72rem] font-semibold tracking-wide whitespace-nowrap text-gold-soft uppercase backdrop-blur",
                        id === SYS_INDEX && "sticky left-0 z-20 w-12 text-right",
                        id === SYS_ACTIONS && "w-12",
                      )}
                    >
                      {isSystem ? (
                        flexRender(header.column.columnDef.header, header.getContext())
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className="focus-ring group flex max-w-72 items-center gap-1.5 rounded text-left hover:text-ink"
                            title={id}
                          >
                            <span className="truncate">{id}</span>
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3 text-gold-soft" aria-hidden />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3 text-gold-soft" aria-hidden />
                            ) : (
                              <ArrowUpDown className="size-3 opacity-0 transition group-hover:opacity-60" aria-hidden />
                            )}
                          </button>
                          {showFilters && (
                            <input
                              value={(header.column.getFilterValue() as string) ?? ""}
                              onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                              placeholder="Saring…"
                              aria-label={`Saring ${id}`}
                              className="focus-ring h-7 w-full min-w-28 rounded-md border border-line bg-abyss/70 px-2 text-[0.72rem] font-normal text-ink placeholder:text-haze"
                            />
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {permissions.create && quickOpen && (
              <tr className="bg-gold/[0.035]">
                <td className="sticky left-0 z-[5] border-b border-gold/25 bg-night px-3 py-2 text-right">
                  <Plus className="ml-auto size-3.5 text-gold-soft" aria-hidden />
                </td>
                {columns.map((column, i) => (
                  <td key={column} className="border-b border-gold/25 px-1.5 py-1.5">
                    <input
                      ref={i === 0 ? quickFirstRef : undefined}
                      value={quick[column] ?? ""}
                      disabled={quickBusy}
                      onChange={(e) => setQuick((q) => ({ ...q, [column]: e.target.value }))}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void submitQuick();
                        }
                        if (e.key === "Escape") setQuickOpen(false);
                      }}
                      placeholder={i === 0 ? "Ketik, lalu Enter…" : ""}
                      aria-label={`Baris cepat: ${column}`}
                      className="focus-ring h-8 w-full min-w-32 rounded-md border border-line bg-abyss/70 px-2 text-[0.78rem] text-ink placeholder:text-haze focus:border-gold/50"
                    />
                  </td>
                ))}
                {permissions.delete && <td className="border-b border-gold/25" />}
              </tr>
            )}

            {pageRows.map((row, ri) => {
              const rowFlash = flash[`row:${row.id}`];
              return (
                <tr key={row.id} className="group/row even:bg-ice/[0.035]">
                  {row.getVisibleCells().map((cell) => {
                    const id = cell.column.id;
                    if (id === SYS_INDEX) {
                      return (
                        <td
                          key={cell.id}
                          className="tabular sticky left-0 z-[5] border-b border-line/60 bg-night px-3 py-2 text-right text-[0.7rem] text-haze group-hover/row:text-mist"
                        >
                          {pageIndex * pageSize + ri + 1}
                        </td>
                      );
                    }
                    if (id === SYS_ACTIONS) {
                      return (
                        <td key={cell.id} className="border-b border-line/60 px-2 py-1.5">
                          <button
                            onClick={() => setDeleteTarget(row.original)}
                            className="focus-ring rounded-md p-1.5 text-haze opacity-60 transition group-hover/row:opacity-100 hover:bg-crimson/15 hover:text-[#fca5a5]"
                            aria-label="Hapus baris"
                            title="Hapus baris"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      );
                    }
                    const ref = { rowId: row.id, column: id };
                    const key = cellKey(ref);
                    const isActive = active?.rowId === row.id && active.column === id;
                    const isEditing = editing?.rowId === row.id && editing.column === id;
                    const value = String(cell.getValue() ?? "");
                    const flashedAt = flash[key] ?? rowFlash;
                    return (
                      <td
                        key={cell.id}
                        data-cell={key}
                        role="gridcell"
                        aria-selected={isActive}
                        onClick={() => setActive(ref)}
                        onDoubleClick={() => canEdit && setEditing(ref)}
                        className={cn(
                          "relative border-b border-line/60 px-3 py-2 align-top text-ink/90 transition-colors",
                          canEdit ? "cursor-cell" : "cursor-default",
                          !isActive && "group-hover/row:bg-steel/[0.14]",
                          isEditing && "p-1",
                        )}
                      >
                        {flashedAt && (
                          <motion.span
                            key={flashedAt}
                            aria-hidden
                            initial={{ opacity: 0.55 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 1.3, ease: "easeOut" }}
                            className="pointer-events-none absolute inset-0 bg-gold/25"
                          />
                        )}
                        {isActive && !isEditing && (
                          <span aria-hidden className={cn("pointer-events-none absolute inset-0 rounded-[3px] ring-1 ring-inset", canEdit ? "ring-steel/80" : "ring-mist/40")} />
                        )}
                        {isEditing ? (
                          <div className="min-w-48">
                            <CellEditor
                              initialValue={value}
                              seed={editing?.seed}
                              onCommit={(v, intent) => onEditorCommit(ref, v, intent)}
                              onCancel={() => {
                                setEditing(null);
                                focusGrid();
                              }}
                            />
                          </div>
                        ) : (
                          <span className="relative block max-w-80 truncate" title={value || undefined}>
                            {value && chipColors.get(id)?.get(value.trim().toLowerCase()) ? (
                              <span
                                className="inline-block max-w-full truncate rounded-md px-2 py-0.5 text-[0.72rem] font-medium"
                                style={{
                                  color: chipColors.get(id)!.get(value.trim().toLowerCase()),
                                  background: `${chipColors.get(id)!.get(value.trim().toLowerCase())}1f`,
                                  boxShadow: `inset 0 0 0 1px ${chipColors.get(id)!.get(value.trim().toLowerCase())}40`,
                                }}
                              >
                                {value}
                              </span>
                            ) : (
                              value || <span className="text-haze/50">—</span>
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {pageRows.length === 0 && (
          <div className="px-6 py-16 text-center text-sm text-mist">
            {rows.length === 0 ? "Modul ini belum memiliki entri data." : "Tidak ada entri yang cocok dengan kriteria pencarian."}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-mist sm:px-5">
        <div className="flex items-center gap-3">
          <span className="tabular">
            {formatNumber(from)}–{formatNumber(to)} dari {formatNumber(filteredCount)}
            {filteredCount !== rows.length && <span className="text-haze"> (total {formatNumber(rows.length)})</span>}
          </span>
          <select
            aria-label="Baris per halaman"
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="focus-ring h-8 rounded-lg border border-line bg-abyss/70 px-2 text-xs text-ink"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / halaman
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <PageButton label="Halaman pertama" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()} icon={ChevronsLeft} />
          <PageButton label="Sebelumnya" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} icon={ChevronLeft} />
          <span className="tabular px-2">
            {pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <PageButton label="Berikutnya" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} icon={ChevronRight} />
          <PageButton label="Halaman terakhir" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()} icon={ChevronsRight} />
        </div>
      </div>

      <AddRecordModal open={addOpen} title={title} columns={columns} onClose={() => setAddOpen(false)} onSubmit={createRecord} />

      <Modal
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        eyebrow="Konfirmasi Keamanan"
        title="Hapus baris data secara permanen?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting} icon={<Trash2 className="size-4" aria-hidden />}>
              Hapus Permanen
            </Button>
          </>
        }
      >
        <p className="text-sm text-mist">
          Tindakan ini menghapus baris dari Basis Data Server dan tidak dapat dibatalkan. Rekaman penghapusan akan dicatat pada Log Audit.
        </p>
        {deleteTarget && (
          <dl className="mt-4 max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-line bg-abyss/50 p-3 text-xs">
            {columns
              .filter((c) => deleteTarget.values[c])
              .slice(0, 8)
              .map((c) => (
                <div key={c} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
                  <dt className="truncate text-haze">{c}</dt>
                  <dd className="truncate text-ink">{deleteTarget.values[c]}</dd>
                </div>
              ))}
          </dl>
        )}
      </Modal>
    </section>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="tabular rounded border border-line px-1 py-px text-[0.62rem] text-mist">{children}</kbd>;
}

function PageButton({ label, onClick, disabled, icon: Icon }: { label: string; onClick: () => void; disabled: boolean; icon: typeof ChevronLeft }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="focus-ring rounded-md p-1.5 text-mist transition hover:bg-white/5 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="size-4" />
    </button>
  );
}

function SaveIndicator({ state, readOnly }: { state: SaveState; readOnly: boolean }) {
  if (readOnly) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-mist/25 px-2.5 py-1 text-[0.7rem] text-mist">
        <Eye className="size-3.5" aria-hidden /> Mode Lihat (Read-Only)
      </span>
    );
  }
  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.phase !== "idle" && (
        <motion.span
          key={state.phase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          role="status"
          className={cn(
            "inline-flex items-center gap-1.5 text-[0.72rem]",
            state.phase === "saving" && "text-ice",
            state.phase === "saved" && "text-gold-soft",
            state.phase === "error" && "text-[#fca5a5]",
          )}
        >
          {state.phase === "saving" && (
            <>
              <CloudUpload className="size-3.5 animate-pulse" aria-hidden /> Menyimpan ke Server…
            </>
          )}
          {state.phase === "saved" && (
            <>
              <CheckCircle2 className="size-3.5" aria-hidden /> Tersimpan
            </>
          )}
          {state.phase === "error" && (
            <>
              <TriangleAlert className="size-3.5" aria-hidden /> Gagal disimpan
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
