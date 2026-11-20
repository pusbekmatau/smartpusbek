"use client";

import { Clock, Database, Server } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useSession } from "@/components/layout/AppProviders";
import { formatDateTimeWIB, formatNumber } from "@/lib/format";
import type { ModuleDescriptor } from "@/lib/modules";
import type { DataRow, DatasetResponse } from "@/lib/types";
import { useRemote } from "@/lib/use-remote";
import { ModuleChart } from "./ChartsPanel";
import { GridSkeleton } from "./GridSkeleton";
import { InteractiveDataGrid } from "./InteractiveDataGrid";
import { Reveal } from "./MotionWrappers";
import { PageHeading } from "./Panel";
import { StatusCard } from "./StatusCard";

export function ModuleView({ module }: { module: ModuleDescriptor }) {
  const { can } = useSession();
  const query = useSearchParams().get("q") ?? "";
  const { data, error, loading, reload, setData } = useRemote<DatasetResponse>(`/api/database/${module.slug}`);

  const setRows = useCallback(
    (updater: (rows: DataRow[]) => DataRow[]) =>
      setData((d) => {
        if (!d) return d;
        const rows = updater(d.rows);
        return { ...d, rows, meta: { ...d.meta, rowCount: rows.length } };
      }),
    [setData],
  );

  return (
    <>
      <Reveal>
        <PageHeading
          eyebrow="Modul Data"
          title={module.title}
          description={module.description}
          actions={
            data && (
              <dl className="flex flex-wrap gap-2 text-[0.7rem]">
                <Meta icon={Database} label="Entri" value={formatNumber(data.rows.length)} />
                <Meta icon={Server} label="Atribut" value={formatNumber(data.columns.length)} />
                <Meta icon={Clock} label="Sinkron" value={formatDateTimeWIB(data.meta.syncedAt)} />
              </dl>
            )
          }
        />
      </Reveal>

      {error && !data ? (
        <StatusCard message={error.status === 403 || error.status === 401 ? error.message : undefined} onRetry={() => reload(true)} retrying={loading} />
      ) : !data ? (
        <GridSkeleton />
      ) : (
        <div className="space-y-5">
          <Reveal delay={0.08}>
            <ModuleChart columns={data.columns} rows={data.rows} />
          </Reveal>
          <Reveal delay={0.16}>
            <InteractiveDataGrid
              slug={module.slug}
              title={module.title}
              columns={data.columns}
              rows={data.rows}
              mode={data.meta.mode}
              setRows={setRows}
              onStructuralChange={() => reload()}
              initialQuery={query}
              permissions={{
                create: can("data:create"),
                update: can("data:update"),
                delete: can("data:delete"),
                export: can("data:export"),
              }}
            />
          </Reveal>
        </div>
      )}
    </>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
      <Icon className="size-3.5 text-steel" aria-hidden />
      <dt className="text-haze">{label}</dt>
      <dd className="tabular text-ink">{value}</dd>
    </div>
  );
}
