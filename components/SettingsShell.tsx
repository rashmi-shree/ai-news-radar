"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, SlidersHorizontal } from "lucide-react";
import { clsx } from "clsx";
import Header from "@/components/Header";

const NAV_ITEMS = [
  { href: "/settings/profile",     label: "Profile",      icon: Briefcase },
  { href: "/settings/preferences", label: "Preferences",  icon: SlidersHorizontal },
];

export default function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-8 sm:px-6">

        {/* ── Settings header ── */}
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Settings</h1>
           <p className="mt-1 text-sm text-zinc-500">Manage your builder profile and feed preferences.</p>
        </div>

        <div className="flex gap-8">
          {/* ── Sidebar nav ── */}
          <nav className="hidden w-44 shrink-0 flex-col gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    active
                      ? "bg-zinc-800 text-slate-100"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                  )}
                >
                  <Icon size={13} className={active ? "text-cyan-400" : "text-zinc-600"} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* ── Mobile top nav (shows below h1 on small screens) ── */}
          <div className="mb-6 flex gap-2 sm:hidden w-full">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "rounded-lg border px-4 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-zinc-700 bg-zinc-800 text-slate-100"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* ── Page content ── */}
          <div className="min-w-0 flex-1 animate-page-enter">{children}</div>
        </div>

      </div>
    </div>
  );
}
