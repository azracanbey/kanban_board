export default function BoardsLoading() {
  return (
    <section className="space-y-4">
      <div className="surface-panel p-4">
        <div className="h-6 w-36 animate-pulse rounded bg-[var(--app-column)]" />
        <div className="mt-3 h-4 w-64 animate-pulse rounded bg-[var(--app-column)]" />
        <div className="mt-4 h-10 w-full animate-pulse rounded bg-[var(--app-column)]" />
      </div>
      <div className="surface-panel p-4">
        <div className="h-16 animate-pulse rounded bg-[var(--app-column)]" />
      </div>
    </section>
  );
}
