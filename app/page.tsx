import Link from "next/link";
import { Radar, ArrowRight, ShieldCheck, Zap, Clock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Subtle dot grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, #27272a 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.45,
        }}
      />

      {/* Glow blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-cyan-500/10 blur-3xl"
      />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <Radar size={18} className="text-cyan-400" />
          <span className="text-sm font-semibold text-slate-100">
            AI News <span className="text-cyan-400">Radar</span>
          </span>
        </div>
        <Link
          href="/feed"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          View Feed
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          <span className="text-xs font-medium text-cyan-300">
            Built for cybersecurity engineers
          </span>
        </div>

        {/* Headline */}
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl lg:text-6xl">
          Stay ahead of the{" "}
          <span className="text-cyan-400">threat landscape</span>
        </h1>

        <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
          Personalized security intelligence—CVEs, threat intel, red team
          tactics, and more—curated to your role. In under 60 seconds a day.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/onboarding"
            className="group flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 hover:shadow-cyan-400/30"
          >
            Get started
            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/feed"
            className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-slate-100"
          >
            Preview the feed
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap justify-center gap-3">
          {[
            { icon: ShieldCheck, text: "CVEs & Vulnerabilities" },
            { icon: Zap, text: "AI Security" },
            { icon: Clock, text: "Under 60 seconds" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2"
            >
              <Icon size={13} className="text-zinc-500" />
              <span className="text-xs text-zinc-400">{text}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-xs text-zinc-700">
          AI News Radar · Phase 1 MVP
        </p>
      </footer>
    </div>
  );
}
