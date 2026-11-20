"use client";

import { useEffect, useRef, useState } from "react";

export type CommitIntent = "down" | "right" | "left" | "stay";

interface CellEditorProps {
  initialValue: string;
  /** Seed when the editor is opened by typing a character on an active cell. */
  seed?: string;
  onCommit: (value: string, intent: CommitIntent) => void;
  onCancel: () => void;
}

/**
 * In-place cell editor. Enter commits and moves down, Tab / Shift+Tab commit and
 * move sideways, Escape cancels, blur commits in place. Alt+Enter inserts a newline.
 */
export function CellEditor({ initialValue, seed, onCommit, onCancel }: CellEditorProps) {
  const [value, setValue] = useState(seed ?? initialValue);
  const done = useRef(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(seed !== undefined ? end : 0, end);
  }, [seed]);

  const finish = (intent: CommitIntent) => {
    if (done.current) return;
    done.current = true;
    onCommit(value, intent);
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label="Ubah nilai sel"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish("stay")}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" && e.altKey) {
          e.preventDefault();
          setValue((v) => `${v}\n`);
        } else if (e.key === "Enter") {
          e.preventDefault();
          finish("down");
        } else if (e.key === "Tab") {
          e.preventDefault();
          finish(e.shiftKey ? "left" : "right");
        } else if (e.key === "Escape") {
          e.preventDefault();
          done.current = true;
          onCancel();
        }
      }}
      className="block min-h-9 w-full resize-none rounded-md border border-gold/60 bg-abyss px-2.5 py-2 text-[0.8rem] leading-snug text-ink shadow-[0_0_0_3px_rgba(212,175,55,0.14)] outline-none"
    />
  );
}
