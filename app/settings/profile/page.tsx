"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Briefcase,
  Check,
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import SettingsShell from "@/components/SettingsShell";
import {
  getUserProfile,
  saveUserProfile,
  type UserProfile,
} from "@/src/lib/supabase/userProfile";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_PRESETS = [
  "AI Engineer",
  "ML Researcher",
  "Software Engineer",
  "Founder",
  "Product Manager",
  "Developer Advocate",
  "AI Safety Researcher",
  "Startup Founder",
  "Indie Hacker",
  "Tech Lead",
];

const DOMAIN_PRESETS = [
  "LLM Applications",
  "AI Agents",
  "Model Evaluation",
  "Open Source AI",
  "AI Infrastructure",
  "Multimodal AI",
  "AI Safety",
  "Developer Tools",
  "AI Startups",
  "Prompt Engineering",
];

const TOOL_OPTIONS = [
  "Claude",
  "ChatGPT",
  "Gemini",
  "Copilot",
  "Cursor",
  "Perplexity",
  "Devin",
  "Replit",
  "V0",
  "Bolt",
  "Lovable",
  "Windsurf",
  "Codeium",
  "Aider",
];

const TOPIC_OPTIONS = [
  "OpenAI",
  "Anthropic",
  "Coding Agents",
  "MCP",
  "GitHub Repos",
  "Research Papers",
  "AI Startups",
  "Benchmarks",
  "Tools",
  "Security",
  "Multimodal",
  "Fine-tuning",
  "RAG",
  "AI Agents",
  "Open Source",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Toast = { id: string; msg: string; kind: "success" | "error" };

// ─── Small shared components ───────────────────────────────────────────────────

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  list,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  list?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      list={list}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-slate-100 placeholder-zinc-600 outline-none transition-colors focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20"
    />
  );
}

function TagGrid({
  options,
  selected,
  onToggle,
  accent = "cyan",
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  accent?: "cyan" | "violet";
}) {
  const activeClass =
    accent === "cyan"
      ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300"
      : "border-violet-500/60 bg-violet-500/10 text-violet-300";

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              on
                ? activeClass
                : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500 hover:text-slate-200"
            )}
          >
            {on && <Check size={10} strokeWidth={3} />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      {[220, 260, 260].map((h, i) => (
        <div
          key={i}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const listId = useId();

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Form state ──
  const [role,    setRole]    = useState("");
  const [company, setCompany] = useState("");
  const [domain,  setDomain]  = useState("");
  const [tools,   setTools]   = useState<string[]>([]);
  const [topics,  setTopics]  = useState<string[]>([]);

  const savedRef = useRef<string>("");

  // ── Toasts ──
  function addToast(msg: string, kind: Toast["kind"] = "success") {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  // ── Load existing profile ──
  useEffect(() => {
    getUserProfile().then((profile) => {
      if (profile) {
        setRole(profile.role);
        setCompany(profile.company);
        setDomain(profile.domain);
        setTools(profile.tools);
        setTopics(profile.favorite_topics);
        savedRef.current = JSON.stringify(profile);
      }
      setLoading(false);
    });
  }, []);

  // ── Toggle helpers ──
  function toggleTool(tool: string) {
    setTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  }

  function toggleTopic(topic: string) {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");

    const profile: UserProfile = {
      role,
      company,
      domain,
      tools,
      favorite_topics: topics,
    };

    const result = await saveUserProfile(profile);

    if (result.ok) {
      savedRef.current = JSON.stringify(profile);
      setSaveStatus("saved");
      addToast("Profile saved successfully", "success");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("error");
      addToast("Failed to save profile — try again", "error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [role, company, domain, tools, topics, saveStatus]);

  const isDirty =
    JSON.stringify({ role, company, domain, tools, favorite_topics: topics }) !==
    savedRef.current;

  return (
    <SettingsShell>
      {/* ── Page header ── */}
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
           <h2 className="text-base font-semibold text-slate-100">Builder Profile</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Personalise your radar — role, tools, and focus areas.
          </p>
        </div>

            {/* Save button */}
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
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
              )}
            >
              {saveStatus === "saving" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : saveStatus === "saved" ? (
                <CheckCircle2 size={12} />
              ) : (
                <Save size={12} />
              )}
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                ? "Saved"
                : "Save profile"}
            </button>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <ProfileSkeleton />
      ) : (
        <div className="space-y-5">

            {/* ── Identity ── */}
            <SectionCard
              icon={<Briefcase size={15} />}
              title="Identity"
              subtitle="Your professional context — helps personalise your builder feed"
            >
              <div className="grid gap-4 sm:grid-cols-2">

                <Field label="Role">
                  <>
                    <TextInput
                      value={role}
                      onChange={setRole}
                      placeholder="e.g. AI Engineer, Indie Hacker, Founder"
                      list={`${listId}-roles`}
                    />
                    <datalist id={`${listId}-roles`}>
                      {ROLE_PRESETS.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </>
                </Field>

                <Field label="Company">
                  <TextInput
                    value={company}
                    onChange={setCompany}
                    placeholder="e.g. Akalvio"
                  />
                </Field>

                <Field label="Domain / Specialisation">
                  <>
                    <TextInput
                      value={domain}
                      onChange={setDomain}
                      placeholder="e.g. AI Agents"
                      list={`${listId}-domains`}
                    />
                    <datalist id={`${listId}-domains`}>
                      {DOMAIN_PRESETS.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </>
                </Field>

              </div>
            </SectionCard>

            {/* ── AI Tools ── */}
            <SectionCard
              icon={<Wrench size={15} />}
              title="AI Tools"
              subtitle={`Tools you actively use — ${tools.length} selected`}
            >
              <TagGrid
                options={TOOL_OPTIONS}
                selected={tools}
                onToggle={toggleTool}
                accent="cyan"
              />
            </SectionCard>

            {/* ── Favourite Topics ── */}
            <SectionCard
              icon={<ShieldCheck size={15} />}
              title="Favourite Topics"
              subtitle={`Security areas you care about most — ${topics.length} selected`}
            >
              <TagGrid
                options={TOPIC_OPTIONS}
                selected={topics}
                onToggle={toggleTopic}
                accent="violet"
              />
            </SectionCard>

            {/* ── Summary strip ── */}
            {(role || company || domain || tools.length > 0 || topics.length > 0) && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  Profile Preview
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-400">
                  {role    && <span><span className="text-zinc-600">Role</span>    <span className="ml-1.5 text-slate-300">{role}</span></span>}
                  {company && <span><span className="text-zinc-600">Company</span> <span className="ml-1.5 text-slate-300">{company}</span></span>}
                  {domain  && <span><span className="text-zinc-600">Domain</span>  <span className="ml-1.5 text-slate-300">{domain}</span></span>}
                </div>
                {tools.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {tools.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 text-[10px] font-medium text-cyan-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {topics.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-violet-500/20 bg-violet-500/5 px-2 py-0.5 text-[10px] font-medium text-violet-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

        </div>
      )}

      {/* ── Toasts ── */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "animate-toast-in flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium shadow-xl",
              toast.kind === "success"
                ? "border-emerald-500/40 bg-zinc-900 text-emerald-300"
                : "border-red-500/40 bg-zinc-900 text-red-300"
            )}
          >
            {toast.kind === "success" ? <CheckCircle2 size={13} /> : <X size={13} />}
            {toast.msg}
          </div>
        ))}
      </div>
    </SettingsShell>
  );
}
