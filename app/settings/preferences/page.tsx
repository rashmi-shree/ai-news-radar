"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  Bell,
  Check,
  CheckCircle2,
  Loader2,
  Save,
  Shield,
  ShieldAlert,
  Zap,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import SettingsShell from "@/components/SettingsShell";
import {
  getUserPreferences,
  saveUserPreferences,
  DEFAULT_PREFERENCES,
  type UserPreferences,
  type DigestFrequency,
  type RiskThreshold,
} from "@/src/lib/supabase/userPreferences";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPIC_OPTIONS = [
  { id: "OpenAI",          color: "emerald" },
  { id: "Anthropic",       color: "orange"  },
  { id: "Coding Agents",   color: "violet"  },
  { id: "MCP",             color: "cyan"    },
  { id: "Research Papers", color: "amber"   },
  { id: "AI Startups",     color: "sky"     },
  { id: "Benchmarks",      color: "rose"    },
  { id: "Tools",           color: "teal"    },
  { id: "GitHub Repos",    color: "zinc"    },
  { id: "Security",        color: "red"     },
] as const;

type TopicColor = (typeof TOPIC_OPTIONS)[number]["color"];

const TOPIC_ACTIVE: Record<TopicColor, string> = {
  emerald: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
  orange:  "border-orange-500/60 bg-orange-500/10 text-orange-300",
  violet:  "border-violet-500/60 bg-violet-500/10 text-violet-300",
  cyan:    "border-cyan-500/60 bg-cyan-500/10 text-cyan-300",
  amber:   "border-amber-500/60 bg-amber-500/10 text-amber-300",
  sky:     "border-sky-500/60 bg-sky-500/10 text-sky-300",
  rose:    "border-rose-500/60 bg-rose-500/10 text-rose-300",
  teal:    "border-teal-500/60 bg-teal-500/10 text-teal-300",
  zinc:    "border-zinc-500/60 bg-zinc-500/10 text-zinc-300",
  red:     "border-red-500/60 bg-red-500/10 text-red-300",
};

const DIGEST_OPTIONS: { value: DigestFrequency; label: string; desc: string }[] = [
  { value: "daily",  label: "Daily",  desc: "One brief every morning" },
  { value: "weekly", label: "Weekly", desc: "One brief every Monday" },
  { value: "off",    label: "Off",    desc: "No automatic briefs" },
];

const RISK_OPTIONS: { value: RiskThreshold; label: string; desc: string; color: string }[] = [
  { value: "high",   label: "High only",   desc: "Critical & high-risk articles", color: "border-red-500/50 bg-red-500/8 text-red-300" },
  { value: "medium", label: "Medium+",     desc: "Medium and above",              color: "border-amber-500/50 bg-amber-500/8 text-amber-300" },
  { value: "low",    label: "All signals", desc: "Show everything",               color: "border-zinc-600 bg-zinc-800/50 text-zinc-400" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Toast = { id: string; msg: string; kind: "success" | "error" };

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={clsx(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
        on ? "bg-cyan-500" : "bg-zinc-700"
      )}
    >
      <span className="sr-only">{label}</span>
      <span
        className={clsx(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200",
          on ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-cyan-400">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PrefSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      {[180, 200, 160, 180].map((h, i) => (
        <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/60" style={{ height: h }} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreferencesPage() {
  const { userId } = useAuth();
  const [loading,    setLoading]    = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [toasts,     setToasts]     = useState<Toast[]>([]);

  // ── Form state ──
  const [topics,           setTopics]           = useState<string[]>([]);
  const [notifyCritical,   setNotifyCritical]   = useState(true);
  const [notifyNewThreats, setNotifyNewThreats] = useState(true);
  const [notifyDigest,     setNotifyDigest]     = useState(true);
  const [digestFrequency,  setDigestFrequency]  = useState<DigestFrequency>("daily");
  const [realtimeEnabled,  setRealtimeEnabled]  = useState(true);
  const [riskThreshold,    setRiskThreshold]    = useState<RiskThreshold>("low");

  const savedRef = useRef("");

  // ── Toast helper ──
  function addToast(msg: string, kind: Toast["kind"] = "success") {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  // ── Load ──
  useEffect(() => {
    if (!userId) return;
    getUserPreferences(userId).then((prefs) => {
      setTopics(prefs.topics);
      setNotifyCritical(prefs.notifyCritical);
      setNotifyNewThreats(prefs.notifyNewThreats);
      setNotifyDigest(prefs.notifyDigest);
      setDigestFrequency(prefs.digestFrequency);
      setRealtimeEnabled(prefs.realtimeEnabled);
      setRiskThreshold(prefs.riskThreshold);
      savedRef.current = JSON.stringify(prefs);
      setLoading(false);
    });
  }, [userId]);

  // ── Topic toggle ──
  function toggleTopic(id: string) {
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  // ── Current prefs snapshot ──
  function snapshot(): UserPreferences {
    return {
      topics,
      notifyCritical,
      notifyNewThreats,
      notifyDigest,
      digestFrequency,
      realtimeEnabled,
      riskThreshold,
    };
  }

  const isDirty = JSON.stringify(snapshot()) !== savedRef.current;

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    const prefs = snapshot();
    if (!userId) return;
    const result = await saveUserPreferences(userId, prefs);
    if (result.ok) {
      savedRef.current = JSON.stringify(prefs);
      setSaveStatus("saved");
      addToast("Preferences saved", "success");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("error");
      addToast("Failed to save — try again", "error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, notifyCritical, notifyNewThreats, notifyDigest, digestFrequency, realtimeEnabled, riskThreshold, saveStatus]);

  return (
    <SettingsShell>
      {/* ── Page header ── */}
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Preferences</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Control topics, notifications, and feed behaviour.</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saveStatus === "saving" || !isDirty}
          className={clsx(
            "flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all",
            saveStatus === "saved"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : saveStatus === "error"
              ? "border-red-500/50 bg-red-500/10 text-red-400"
              : isDirty
              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/15"
              : "cursor-not-allowed border-zinc-700 bg-zinc-800/50 text-zinc-600"
          )}
        >
          {saveStatus === "saving" ? <Loader2 size={12} className="animate-spin" />
            : saveStatus === "saved" ? <CheckCircle2 size={12} />
            : <Save size={12} />}
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save"}
        </button>
      </div>

      {loading ? <PrefSkeleton /> : (
        <div className="space-y-5">

          {/* ── Topics ── */}
          <SectionCard
            icon={<Shield size={15} />}
            title="Topics"
            subtitle={`Security areas to follow — ${topics.length} selected`}
          >
            <div className="flex flex-wrap gap-2">
              {TOPIC_OPTIONS.map(({ id, color }) => {
                const on = topics.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleTopic(id)}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      on
                        ? TOPIC_ACTIVE[color]
                        : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500 hover:text-slate-200"
                    )}
                  >
                    {on && <Check size={10} strokeWidth={3} />}
                    {id}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* ── Notifications ── */}
          <SectionCard
            icon={<Bell size={15} />}
            title="Notifications"
            subtitle="Control in-app alerts and feed toasts"
          >
            <div className="space-y-4">
              {[
                {
                  label: "Hot signal alerts",
                  desc:  "Banner when a tracked article scores ≥ 90",
                  value: notifyCritical,
                  set:   setNotifyCritical,
                },
                {
                  label: "New signal toasts",
                  desc:  "Toast notification when a new article arrives via realtime",
                  value: notifyNewThreats,
                  set:   setNotifyNewThreats,
                },
                {
                  label: "Digest reminder",
                  desc:  "Prompt to open your daily brief",
                  value: notifyDigest,
                  set:   setNotifyDigest,
                },
              ].map(({ label, desc, value, set }) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-300">{label}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">{desc}</p>
                  </div>
                  <Toggle on={value} onChange={set} label={label} />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Digest frequency ── */}
          <SectionCard
            icon={<Zap size={15} />}
            title="Digest Frequency"
            subtitle="How often you want your security brief"
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {DIGEST_OPTIONS.map(({ value, label, desc }) => {
                const active = digestFrequency === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDigestFrequency(value)}
                    className={clsx(
                      "rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-cyan-500/50 bg-cyan-500/8 text-slate-100"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{label}</span>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-600">{desc}</p>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* ── Realtime ── */}
          <SectionCard
            icon={<ShieldAlert size={15} />}
            title="Realtime Feed"
            subtitle="Live updates as new articles are ingested"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-300">Enable realtime updates</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">
                  New articles appear instantly without refreshing the feed.
                  {!realtimeEnabled && (
                    <span className="ml-1 text-amber-500"> Manual refresh only.</span>
                  )}
                </p>
              </div>
              <Toggle on={realtimeEnabled} onChange={setRealtimeEnabled} label="Realtime" />
            </div>

            {/* Live indicator preview */}
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <span className={clsx(
                "h-2 w-2 rounded-full",
                realtimeEnabled ? "animate-pulse bg-emerald-400" : "bg-zinc-600"
              )} />
              <span className="text-[11px] text-zinc-500">
                {realtimeEnabled ? "● Live — connected to article stream" : "○ Offline — realtime disabled"}
              </span>
            </div>
          </SectionCard>

          {/* ── Risk threshold ── */}
          <SectionCard
            icon={<Shield size={15} />}
            title="Risk Threshold"
            subtitle="Minimum risk level to surface in your feed"
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {RISK_OPTIONS.map(({ value, label, desc, color }) => {
                const active = riskThreshold === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRiskThreshold(value)}
                    className={clsx(
                      "rounded-xl border p-3 text-left transition-colors",
                      active
                        ? color
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{label}</span>
                      {active && (
                        <Check size={11} strokeWidth={3} />
                      )}
                    </div>
                    <p className="mt-1 text-[10px] opacity-70">{desc}</p>
                  </button>
                );
              })}
            </div>
          </SectionCard>

        </div>
      )}

      {/* ── Toasts ── */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "animate-toast-in flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium shadow-xl",
              t.kind === "success"
                ? "border-emerald-500/40 bg-zinc-900 text-emerald-300"
                : "border-red-500/40 bg-zinc-900 text-red-300"
            )}
          >
            {t.kind === "success" ? <CheckCircle2 size={13} /> : <X size={13} />}
            {t.msg}
          </div>
        ))}
      </div>
    </SettingsShell>
  );
}
