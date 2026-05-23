"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  AlertTriangle,
  Cpu,
  Target,
  ShieldCheck,
  Eye,
  Network,
  Activity,
  Cloud,
  Box,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import InterestCard from "@/components/InterestCard";
import Header from "@/components/Header";

interface Topic {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TOPICS: Topic[] = [
  { id: "threat-intelligence", label: "Threat Intelligence", icon: Shield },
  { id: "cves", label: "CVEs", icon: AlertTriangle },
  { id: "ai-security", label: "AI Security", icon: Cpu },
  { id: "red-team", label: "Red Team", icon: Target },
  { id: "blue-team", label: "Blue Team", icon: ShieldCheck },
  { id: "deception-technology", label: "Deception Technology", icon: Eye },
  { id: "honeypots", label: "Honeypots", icon: Network },
  { id: "soc", label: "SOC", icon: Activity },
  { id: "cloud-security", label: "Cloud Security", icon: Cloud },
  { id: "kubernetes-security", label: "Kubernetes Security", icon: Box },
];

const STORAGE_KEY = "anr_interests";

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelected(new Set(JSON.parse(stored) as string[]));
      }
    } catch {
      // ignore
    }
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleContinue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
    } catch {
      // ignore
    }
    router.push("/feed");
  }

  const count = selected.size;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="mx-auto flex w-full max-w-3xl flex-col flex-1 px-4 py-10 sm:px-6">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
            What do you work on?
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Select the topics most relevant to your role. We&apos;ll tune your
            feed accordingly.
          </p>
        </div>

        {/* Topic grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {TOPICS.map((topic) => (
            <InterestCard
              key={topic.id}
              id={topic.id}
              label={topic.label}
              icon={topic.icon}
              selected={selected.has(topic.id)}
              onToggle={toggle}
            />
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-10 flex items-center justify-between border-t border-zinc-800 pt-6">
          <p className="text-sm text-zinc-500">
            {count === 0
              ? "No topics selected"
              : `${count} topic${count === 1 ? "" : "s"} selected`}
          </p>

          <button
            onClick={handleContinue}
            disabled={count === 0}
            className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md shadow-cyan-500/20 transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {count === 0 ? "Select at least one" : "Go to feed →"}
          </button>
        </div>
      </main>
    </div>
  );
}
