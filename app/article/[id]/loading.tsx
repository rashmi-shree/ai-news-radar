import Header from "@/components/Header";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-800/60 ${className ?? ""}`} />
  );
}

export default function ArticleLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        {/* Back button */}
        <Skeleton className="mb-8 h-8 w-28" />

        {/* Badge row */}
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>

        {/* Title */}
        <Skeleton className="mb-2 h-8 w-full" />
        <Skeleton className="mb-6 h-8 w-3/4" />

        {/* Meta row */}
        <Skeleton className="mb-8 h-4 w-56" />

        {/* Divider */}
        <div className="mb-8 h-px bg-zinc-800" />

        {/* AI Summary */}
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-8 h-4 w-2/3" />

        {/* Why This Matters */}
        <Skeleton className="mb-3 h-4 w-36" />
        <Skeleton className="mb-8 h-24 w-full" />

        {/* Full Summary */}
        <Skeleton className="mb-3 h-4 w-28" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-10 h-4 w-1/2" />

        {/* Related articles */}
        <Skeleton className="mb-6 h-5 w-36" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </main>
    </div>
  );
}
