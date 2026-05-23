"use client";

import { type LucideIcon, Check } from "lucide-react";
import { clsx } from "clsx";

interface InterestCardProps {
  id: string;
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onToggle: (id: string) => void;
}

export default function InterestCard({
  id,
  label,
  icon: Icon,
  selected,
  onToggle,
}: InterestCardProps) {
  return (
    <button
      onClick={() => onToggle(id)}
      aria-pressed={selected}
      className={clsx(
        "relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
        selected
          ? "border-cyan-500/60 bg-cyan-950/30 text-slate-100"
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/80 hover:text-slate-100"
      )}
    >
      <div
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          selected ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-800 text-zinc-500"
        )}
      >
        <Icon size={16} />
      </div>

      <span className="text-sm font-medium leading-tight">{label}</span>

      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500">
          <Check size={11} strokeWidth={3} className="text-zinc-950" />
        </span>
      )}
    </button>
  );
}
