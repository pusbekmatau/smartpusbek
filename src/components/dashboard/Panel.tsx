import { cn } from "@/lib/cn";

/** Titled glass container used for charts and tables. */
export function Panel({
  title,
  eyebrow,
  actions,
  className,
  children,
}: {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("glass rounded-2xl", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
        <div>
          {eyebrow && <p className="eyebrow !text-[0.58rem] text-gold-soft/90">{eyebrow}</p>}
          <h2 className="mt-1 font-display text-lg text-ink">{title}</h2>
        </div>
        {actions}
      </header>
      <div className="px-3 pb-5 sm:px-4">{children}</div>
    </section>
  );
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-gold-soft">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-mist">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
