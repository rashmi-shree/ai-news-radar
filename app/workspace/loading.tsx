import Header from "@/components/Header";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800/60 ${className ?? ""}`} />;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-32" />
      <div className="flex justify-between border-t border-zinc-800/60 pt-3">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-6 w-8" />
      </div>
    </div>
  );
}

export default function WorkspaceLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        {/* Nav row */}
        <Skeleton className="mb-8 h-6 w-28" />

        {/* Page header */}
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="mb-10 h-4 w-40" />

        {/* Summary bar */}
        <div className="mb-10 flex gap-3">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Section 1 */}
        <Skeleton className="mb-4 h-6 w-36" />
        <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Section 2 */}
        <Skeleton className="mb-4 h-6 w-24" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </main>
    </div>
  );
}
