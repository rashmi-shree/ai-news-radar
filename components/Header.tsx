import Link from "next/link";
import { Layers, Radar, UserCircle2, Zap } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <Radar
            size={20}
            className="text-cyan-400 group-hover:text-cyan-300 transition-colors"
          />
          <span className="text-sm font-semibold tracking-wide text-slate-100">
            AI News <span className="text-cyan-400">Radar</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/feed"
            className="text-xs text-zinc-400 hover:text-slate-100 transition-colors"
          >
            Feed
          </Link>
          <Link
            href="/workspace"
            className="text-xs text-zinc-400 hover:text-slate-100 transition-colors"
          >
            Workspace
          </Link>
          <Link
            href="/collections"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-violet-300 transition-colors"
          >
            <Layers size={11} className="text-violet-500" />
            Collections
          </Link>
          <Link
            href="/digest"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-cyan-300 transition-colors"
            title="Daily Digest"
          >
            <Zap size={11} className="text-cyan-500" />
            Digest
          </Link>
          <Link
            href="/onboarding"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:text-slate-100 transition-colors"
          >
            Interests
          </Link>
          <Link
            href="/settings/profile"
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
            title="Builder Profile"
          >
            <UserCircle2 size={13} />
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
