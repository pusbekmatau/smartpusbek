"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface AddRecordModalProps {
  open: boolean;
  title: string;
  columns: string[];
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<boolean>;
}

/** Dynamic entry form generated from the active module's column structure. */
export function AddRecordModal({ open, title, columns, onClose, onSubmit }: AddRecordModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setValues({});
  }, [open]);

  const filled = Object.values(values).some((v) => v.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filled) return;
    setSubmitting(true);
    const ok = await onSubmit(values);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Input Data Baru"
      title={`Tambah Entri · ${title}`}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" type="submit" form="add-record-form" loading={submitting} disabled={!filled} icon={<Plus className="size-4" aria-hidden />}>
            Simpan ke Server
          </Button>
        </>
      }
    >
      <form id="add-record-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {columns.map((column, i) => (
          <label key={column} className="block">
            <span className="mb-1.5 block truncate text-xs text-mist" title={column}>
              {column}
            </span>
            <input
              autoFocus={i === 0}
              value={values[column] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [column]: e.target.value }))}
              className="focus-ring h-10 w-full rounded-lg border border-line bg-abyss/70 px-3 text-sm text-ink transition focus:border-gold/50"
            />
          </label>
        ))}
        {columns.length === 0 && <p className="text-sm text-mist">Struktur kolom modul belum tersedia.</p>}
      </form>
      <p className="mt-5 text-[0.7rem] text-haze">Kolom yang dikosongkan akan disimpan sebagai nilai kosong. Seluruh perubahan tercatat dalam log audit.</p>
    </Modal>
  );
}
