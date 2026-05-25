export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Film,
  FolderOpen,
  Bookmark,
  GitFork,
  Hammer,
  Layers,
  Lightbulb,
  Megaphone,
  Microscope,
  Radar,
  Scroll,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import Header from "@/components/Header";
import ArticleRow from "@/components/ArticleRow";
import { getHomeDashboard } from "@/src/lib/supabase/homeDashboard";
import { getUserProfile } from "@/src/lib/supabase/userProfile";
import type { FeedItem } from "@/src/lib/rss/fetchFeeds";

// ─── Greeting ─────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getUTCHours() + 5; // rough IST offset for server
  const hour = h % 24;
  if (hour >= 5  && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Hey";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  accent,
  href,
  hrefLabel = "View all",
  empty,
  children,
}: {
  icon:       React.ElementType;
  title:      string;
  accent:     string;
  href:       string;
  hrefLabel?: string;
  empty?:     React.ReactNode;
  children:   React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={13} className={accent} />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            {title}
          </h2>
        </div>
        <Link
          href={href}
          className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {hrefLabel}
          <ArrowRight size={10} />
        </Link>
      </div>
      {empty ?? <div className="flex flex-col gap-2">{children}</div>}
    </section>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyRow({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-5 text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      {sublabel && <p className="mt-0.5 text-[10px] text-zinc-700">{sublabel}</p>}
    </div>
  );
}

// ─── Today pill ───────────────────────────────────────────────────────────────

function TodayPill({
  icon: Icon,
  label,
  count,
  accent,
  href,
}: {
  icon:   React.ElementType;
  label:  string;
  count:  number;
  accent: string;
  href:   string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2 rounded-xl border px-4 py-3 transition-all hover:scale-[1.02]",
        count > 0
          ? "border-zinc-700/80 bg-zinc-900/60 hover:border-zinc-600"
          : "border-zinc-800/40 bg-zinc-900/20 opacity-50"
      )}
    >
      <Icon size={14} className={count > 0 ? accent : "text-zinc-600"} />
      <div className="min-w-0">
        <p className={clsx("text-xl font-bold tabular-nums leading-none", count > 0 ? "text-zinc-100" : "text-zinc-600")}>
          {count}
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-500">{label}</p>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [dashboard, profile] = await Promise.all([
    getHomeDashboard(),
    getUserProfile(),
  ]);

  const { pills, buildThisWeek, researchNext, createContent, savedItems } = dashboard;

  const name = profile?.role
    ? profile.role.split(" ")[0]   // e.g. "AI Engineer" → "AI"... let's use role or company
    : null;

  const displayName = profile?.company || profile?.role || "Builder";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">

        {/* ── Greeting ── */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2">
            <Radar size={14} className="text-cyan-400" />
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
              {todayLabel()}
            </p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            {greeting()},{" "}
            <span className="text-cyan-400">{displayName}</span>
          </h1>
          {profile?.domain && (
            <p className="mt-1 text-sm text-zinc-500">
              Your {profile.domain} briefing is ready.
            </p>
          )}
        </div>

        {/* ── Today's overview pills ── */}
        <section className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={12} className="text-zinc-500" />
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Today
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <TodayPill
              icon={Zap}
              label="OpenAI"
              count={pills.openai}
              accent="text-emerald-400"
              href="/feed?category=OpenAI"
            />
            <TodayPill
              icon={Bot}
              label="Anthropic"
              count={pills.anthropic}
              accent="text-violet-400"
              href="/feed?category=Anthropic"
            />
            <TodayPill
              icon={GitFork}
              label="Repos"
              count={pills.repos}
              accent="text-amber-400"
              href="/feed?category=GitHub+Repos"
            />
            <TodayPill
              icon={Scroll}
              label="Papers"
              count={pills.papers}
              accent="text-rose-400"
              href="/feed?category=Research+Papers"
            />
            <TodayPill
              icon={Lightbulb}
              label="Build Ideas"
              count={pills.buildIdeas}
              accent="text-amber-300"
              href="/workspace"
            />
            <TodayPill
              icon={Film}
              label="Content Ops"
              count={pills.contentOps}
              accent="text-sky-400"
              href="/feed"
            />
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="mb-10 h-px bg-zinc-800/60" />

        {/* ── Build this week ── */}
        <Section
          icon={Hammer}
          title="Build This Week"
          accent="text-amber-400"
          href="/feed"
          empty={buildThisWeek.length === 0
            ? <EmptyRow label="No high build-potential articles this week yet." sublabel="Check back after the next ingest." />
            : undefined
          }
        >
          {buildThisWeek.map((item) => (
            <ArticleRow key={item.id ?? item.link} item={item} />
          ))}
        </Section>

        {/* ── Research next ── */}
        <Section
          icon={Microscope}
          title="Research Next"
          accent="text-rose-400"
          href="/feed?category=Research+Papers"
          empty={researchNext.length === 0
            ? <EmptyRow label="No research papers indexed yet." sublabel="New papers appear after each ingest." />
            : undefined
          }
        >
          {researchNext.map((item) => (
            <ArticleRow key={item.id ?? item.link} item={item} />
          ))}
        </Section>

        {/* ── Create content ── */}
        <Section
          icon={Megaphone}
          title="Create Content"
          accent="text-sky-400"
          href="/feed"
          empty={createContent.length === 0
            ? <EmptyRow label="No high content-potential articles this week yet." />
            : undefined
          }
        >
          {createContent.map((item) => (
            <ArticleRow key={item.id ?? item.link} item={item} />
          ))}
        </Section>

        {/* ── Saved items ── */}
        <Section
          icon={Bookmark}
          title="Saved Items"
          accent="text-cyan-400"
          href="/workspace"
          hrefLabel="Open workspace"
          empty={savedItems.length === 0
            ? <EmptyRow label="Nothing saved yet." sublabel={`Open an article and mark it as "Watching" to save it here.`} />
            : undefined
          }
        >
          {savedItems.map((item) => (
            <ArticleRow key={item.id ?? item.link} item={item} />
          ))}
        </Section>

        {/* ── Quick links ── */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: "/feed",        icon: TrendingUp, label: "Feed",        cls: "text-cyan-500"   },
            { href: "/workspace",   icon: BookOpen,   label: "Workspace",   cls: "text-violet-400" },
            { href: "/collections", icon: Layers,     label: "Collections", cls: "text-amber-400"  },
            { href: "/digest",      icon: Zap,        label: "Digest",      cls: "text-rose-400"   },
          ].map(({ href, icon: Icon, label, cls }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-xs text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
            >
              <Icon size={12} className={cls} />
              {label}
            </Link>
          ))}
        </div>

      </main>

      <footer className="py-5 text-center">
        <p className="text-[10px] text-zinc-800">AI News Radar · Builder Edition</p>
      </footer>
    </div>
  );
}
