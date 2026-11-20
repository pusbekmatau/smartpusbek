/** Subtle aerospace backdrop: radial glow, tactical grid and a slow radar sweep (CSS, GPU-only). */
export function AmbientBackground({ intensity = "normal" }: { intensity?: "normal" | "calm" }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(29,78,216,0.22),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_85%_100%,rgba(212,175,55,0.05),transparent_70%)]" />
      <div className="ambient-grid absolute inset-0" />
      {intensity === "normal" && (
        <div className="absolute top-[-35vmax] left-1/2 size-[110vmax] -translate-x-1/2 opacity-60">
          <div className="radar-sweep size-full rounded-full" />
        </div>
      )}
    </div>
  );
}
