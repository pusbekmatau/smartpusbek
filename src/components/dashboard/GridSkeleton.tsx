export function GridSkeleton({ charts = true }: { charts?: boolean }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat data dari server">
      {charts && <div className="skeleton h-80 rounded-2xl" />}
      <div className="glass space-y-3 rounded-2xl p-5">
        <div className="flex gap-3">
          <div className="skeleton h-9 w-72" />
          <div className="skeleton h-9 w-28" />
          <div className="skeleton ml-auto h-9 w-40" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-8" style={{ opacity: 1 - i * 0.09 }} />
        ))}
      </div>
    </div>
  );
}
