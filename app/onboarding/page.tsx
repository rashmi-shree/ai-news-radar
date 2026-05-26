"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FlaskConical,
  Loader2,
  Network,
  Shield,
  Target,
  Wrench,
  Zap,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import Header from "@/components/Header";
import InterestCard from "@/components/InterestCard";
import { saveInterests } from "@/src/lib/supabase/interests";
import { saveUserProfile } from "@/src/lib/supabase/userProfile";
import { saveUserPreferences, DEFAULT_PREFERENCES } from "@/src/lib/supabase/userPreferences";
import { supabase } from "@/src/lib/supabase/client";
import { logBehavior } from "@/src/lib/supabase/userBehavior";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "anr_interests";

interface Role {
  id:    string;
  label: string;
  icon:  LucideIcon;
  desc:  string;
  seedCategories: string[];
}

const ROLES: Role[] = [
  {
    id: "ai-engineer",
    label: "AI Engineer",
    icon: Cpu,
    desc: "Build AI-powered products, agents, and integrations",
    seedCategories: ["Coding Agents", "Tools", "MCP"],
  },
  {
    id: "researcher",
    label: "Researcher",
    icon: FlaskConical,
    desc: "Study models, papers, evaluations, and benchmarks",
    seedCategories: ["Research Papers", "Benchmarks"],
  },
  {
    id: "founder",
    label: "Founder",
    icon: Zap,
    desc: "Build and launch AI startups and products",
    seedCategories: ["AI Startups", "OpenAI", "Anthropic"],
  },
  {
    id: "developer",
    label: "Developer",
    icon: Wrench,
    desc: "Code with AI assistance, explore repos and tools",
    seedCategories: ["GitHub Repos", "Coding Agents", "Tools"],
  },
  {
    id: "product",
    label: "Product",
    icon: Target,
    desc: "Track AI products, industry trends, and releases",
    seedCategories: ["AI Startups", "Tools", "OpenAI"],
  },
];

const TOOL_OPTIONS = [
  "Claude", "ChatGPT", "Gemini", "Copilot", "Cursor", "Perplexity", "Devin",
  "Replit", "V0", "Bolt", "Lovable", "Windsurf", "Codeium", "Aider",
];

interface Topic { id: string; label: string; icon: LucideIcon }

const TOPICS: Topic[] = [
  { id: "openai",          label: "OpenAI",          icon: Zap           },
  { id: "anthropic",       label: "Anthropic",       icon: FlaskConical  },
  { id: "coding-agents",   label: "Coding Agents",   icon: Wrench        },
  { id: "mcp",             label: "MCP",             icon: Network       },
  { id: "github-repos",    label: "GitHub Repos",    icon: Box           },
  { id: "research-papers", label: "Research Papers", icon: Activity      },
  { id: "ai-startups",     label: "AI Startups",     icon: Target        },
  { id: "benchmarks",      label: "Benchmarks",      icon: CheckCircle2  },
  { id: "tools",           label: "Tools",           icon: Cpu           },
  { id: "security",        label: "Security",        icon: Shield        },
];

/** Maps topic IDs → article category strings (for seeding behavior) */
const TOPIC_TO_CATEGORY: Record<string, string> = {
  "openai":          "OpenAI",
  "anthropic":       "Anthropic",
  "coding-agents":   "Coding Agents",
  "mcp":             "MCP",
  "github-repos":    "GitHub Repos",
  "research-papers": "Research Papers",
  "ai-startups":     "AI Startups",
  "benchmarks":      "Benchmarks",
  "tools":           "Tools",
  "security":        "Security",
};

// ─── Step types ───────────────────────────────────────────────────────────────

type Step = "role" | "context" | "topics" | "generating";

// ─── Seed initial behavior ────────────────────────────────────────────────────

async function seedInitialBehavior(
  selectedTopics: string[],
  selectedRole: Role
): Promise<void> {
  // Gather categories to seed (topics + role defaults)
  const categories = new Set<string>();
  for (const t of selectedTopics) {
    const cat = TOPIC_TO_CATEGORY[t];
    if (cat) categories.add(cat);
  }
  for (const cat of selectedRole.seedCategories) {
    categories.add(cat);
  }

  // For each category, find up to 3 high-scoring articles and log view events
  for (const category of categories) {
    const { data } = await supabase
      .from("articles")
      .select("id")
      .eq("category", category)
      .order("builder_score", { ascending: false })
      .limit(3);

    if (!data?.length) continue;

    for (const article of data as { id: string }[]) {
      await logBehavior(article.id, "view");
    }
  }
}

// ─── Stepper indicator ────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: "role",    label: "Role"    },
  { id: "context", label: "Context" },
  { id: "topics",  label: "Topics"  },
];

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="mb-10 flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done    = i < idx;
        const active  = i === idx;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={clsx(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all",
                done   ? "border-cyan-500 bg-cyan-500 text-zinc-950"
                : active ? "border-cyan-500 bg-zinc-950 text-cyan-400"
                : "border-zinc-700 bg-zinc-900 text-zinc-600"
              )}>
                {done ? <Check size={12} strokeWidth={3} /> : i + 1}
              </div>
              <span className={clsx("text-[10px] font-medium",
                active ? "text-cyan-400" : done ? "text-zinc-400" : "text-zinc-700"
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                "mb-4 h-px w-12 transition-colors sm:w-20",
                done ? "bg-cyan-500" : "bg-zinc-800"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Role card ────────────────────────────────────────────────────────────────

function RoleCard({ role, selected, onSelect }: {
  role: Role;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = role.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "relative flex flex-col gap-3 rounded-xl border p-5 text-left transition-all",
        selected
          ? "border-cyan-500/60 bg-cyan-950/20 text-slate-100"
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-slate-200"
      )}
    >
      <div className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        selected ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-800 text-zinc-500"
      )}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold">{role.label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed opacity-60">{role.desc}</p>
      </div>
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500">
          <Check size={10} strokeWidth={3} className="text-zinc-950" />
        </span>
      )}
    </button>
  );
}

// ─── Generating screen ────────────────────────────────────────────────────────

function GeneratingScreen({ progress }: { progress: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-20">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-zinc-800" />
        <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-2 border-transparent border-t-cyan-500" />
        <Zap size={20} className="absolute inset-0 m-auto text-cyan-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-100">Building your intelligence profile…</p>
        <p className="mt-1 text-xs text-zinc-500">{progress}</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  // ── Step state ──
  const [step, setStep] = useState<Step>("role");

  // ── Step 1: Role ──
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // ── Step 2: Context ──
  const [company, setCompany] = useState("");
  const [domain,  setDomain]  = useState("");
  const [tools,   setTools]   = useState<string[]>([]);

  // ── Step 3: Topics ──
  const [topics, setTopics] = useState<Set<string>>(new Set());

  // ── Generating ──
  const [progress, setProgress] = useState("Saving your preferences…");
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  function toggleTool(t: string) {
    setTools((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function toggleTopic(id: string) {
    setTopics((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Complete onboarding ──
  async function finalize() {
    setStep("generating");
    setOnboardingError(null);
    const topicList = [...topics];

    try {
      // 1. Save to localStorage
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(topicList)); } catch { /* ignore */ }

      setProgress("Saving your profile…");

      // 2. Save user_interests
      await saveInterests(topicList).catch(console.error);

      // 3. Save user_profiles
      await saveUserProfile({
        role:            selectedRole?.label ?? "",
        company:         company,
        domain:          domain,
        tools,
        favorite_topics: topicList,
      }).catch(console.error);

      setProgress("Saving your preferences…");

      // 4. Save user_preferences (topics + defaults)
      await saveUserPreferences({
        ...DEFAULT_PREFERENCES,
        topics: topicList,
      }).catch(console.error);

      setProgress("Seeding your intelligence feed…");

      // 5. Seed initial behavior signals for fast affinity warm-up
      if (selectedRole) {
        await seedInitialBehavior(topicList, selectedRole).catch(console.error);
      }

      setProgress("All done — loading your feed");
      router.push("/feed");
    } catch (err) {
      console.error("[ONBOARDING] finalize failed:", err);
      setOnboardingError("Something went wrong saving your profile. Try again.");
      setStep("topics");
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">

        {step !== "generating" && <StepBar current={step} />}

        {/* ══ Step 1: Role ══════════════════════════════════════════════════ */}
        {step === "role" && (
          <div className="animate-page-enter flex flex-1 flex-col">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
                What&apos;s your role?
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                We&apos;ll personalise your builder feed and score ranking based on your work.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  selected={selectedRole?.id === role.id}
                  onSelect={() => setSelectedRole(role)}
                />
              ))}
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-6">
              <p className="text-sm text-zinc-500">
                {selectedRole ? `Selected: ${selectedRole.label}` : "Choose your role to continue"}
              </p>
              <button
                disabled={!selectedRole}
                onClick={() => setStep("context")}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md shadow-cyan-500/20 transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ══ Step 2: Context ════════════════════════════════════════════════ */}
        {step === "context" && (
          <div className="animate-page-enter flex flex-1 flex-col">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
                Tell us your context
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Company domain and tools help calibrate your personalised ranking.
              </p>
            </div>

            <div className="space-y-8">
              {/* Company */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Company / Organisation
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Akalvio, CISA, Cloudflare…"
                  className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-slate-100 placeholder-zinc-600 outline-none transition-colors focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20"
                />
                <p className="mt-1.5 text-[11px] text-zinc-600">Optional — used for profile display only</p>
              </div>

              {/* Domain / specialisation */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Security Domain
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. Agent Patterns, MCP, LLM Tooling, AI Infra…"
                  className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-slate-100 placeholder-zinc-600 outline-none transition-colors focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20"
                />
                <p className="mt-1.5 text-[11px] text-zinc-600">Optional — helps calibrate signal relevance</p>
              </div>

              {/* Tools */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  AI &amp; Security Tools <span className="ml-2 font-normal normal-case text-zinc-600">({tools.length} selected)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TOOL_OPTIONS.map((tool) => {
                    const on = tools.includes(tool);
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => toggleTool(tool)}
                        className={clsx(
                          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          on
                            ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300"
                            : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500 hover:text-slate-200"
                        )}
                      >
                        {on && <Check size={10} strokeWidth={3} />}
                        {tool}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-6">
              <button
                onClick={() => setStep("role")}
                className="text-sm text-zinc-500 transition-colors hover:text-slate-300"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep("topics")}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md shadow-cyan-500/20 transition-all hover:bg-cyan-400"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ══ Step 3: Topics ═════════════════════════════════════════════════ */}
        {step === "topics" && (
          <div className="animate-page-enter flex flex-1 flex-col">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
                What do you follow?
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Select topics to tune your feed. More selections = better signal.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {TOPICS.map((topic) => (
                <InterestCard
                  key={topic.id}
                  id={topic.id}
                  label={topic.label}
                  icon={topic.icon}
                  selected={topics.has(topic.id)}
                  onToggle={toggleTopic}
                />
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-6">
              <button
                onClick={() => setStep("context")}
                className="text-sm text-zinc-500 transition-colors hover:text-slate-300"
              >
                ← Back
              </button>

              <div className="flex flex-col items-end gap-2">
                {onboardingError && (
                  <p className="text-xs text-red-400">{onboardingError}</p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-zinc-500">
                    {topics.size === 0
                      ? "Select at least one topic"
                      : `${topics.size} topic${topics.size !== 1 ? "s" : ""} selected`}
                  </span>
                  <button
                    disabled={topics.size === 0}
                    onClick={() => void finalize()}
                    className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md shadow-cyan-500/20 transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Zap size={14} />
                    Build my profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ Generating ═════════════════════════════════════════════════════ */}
        {step === "generating" && <GeneratingScreen progress={progress} />}

      </main>
    </div>
  );
}
