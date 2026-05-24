import Link from "next/link";
import Header from "@/components/Header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
          <span className="font-mono text-2xl font-bold text-zinc-500">404</span>
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-100">Page not found</h1>
        <p className="mb-8 max-w-sm text-sm text-zinc-500">
          The intelligence you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
        <Link
          href="/feed"
          className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md shadow-cyan-500/20 transition-all hover:bg-cyan-400"
        >
          Back to feed
        </Link>
      </main>
    </div>
  );
}
