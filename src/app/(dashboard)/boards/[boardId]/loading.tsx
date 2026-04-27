export default function BoardDetailLoading() {
  return (
    <section className="space-y-4">
      <div className="surface-panel p-4">
        <div className="h-6 w-48 animate-pulse rounded bg-[var(--app-column)]" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        <div className="h-48 w-[260px] shrink-0 animate-pulse rounded-lg bg-[var(--app-column)] sm:w-[280px]" />
        <div className="h-48 w-[260px] shrink-0 animate-pulse rounded-lg bg-[var(--app-column)] sm:w-[280px]" />
      </div>
    </section>
  );
}
