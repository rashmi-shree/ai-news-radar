"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Menu, Radar, UserCircle2, X, Zap } from "lucide-react";
import { clsx } from "clsx";

const NAV_LINKS = [
  { href: "/feed",               label: "Feed",        icon: null },
  { href: "/workspace",          label: "Workspace",   icon: null },
  { href: "/collections",        label: "Collections", icon: Layers,      iconClass: "text-violet-500" },
  { href: "/digest",             label: "Digest",      icon: Zap,         iconClass: "text-cyan-500"   },
  { href: "/onboarding",         label: "Interests",   icon: null },
  { href: "/settings/profile",   label: "Profile",     icon: UserCircle2, iconClass: "text-zinc-500"   },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
            <Radar size={20} className="text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-sm font-semibold tracking-wide text-slate-100">
              AI News <span className="text-cyan-400">Radar</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-4 lg:flex">
            {NAV_LINKS.map(({ href, label, icon: Icon, iconClass }) => {
              const isProfile = href === "/settings/profile";
              const isInterests = href === "/onboarding";
              const isActive = pathname === href || pathname.startsWith(href + "/");
              if (isProfile || isInterests) {
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "border-cyan-500/50 text-cyan-300"
                        : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-slate-100"
                    )}
                  >
                    {Icon && <Icon size={13} />}
                    {label}
                  </Link>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-1 text-xs transition-colors",
                    isActive ? "text-slate-100" : "text-zinc-400 hover:text-slate-100"
                  )}
                >
                  {Icon && <Icon size={11} className={iconClass} />}
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-slate-100 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />

          {/* Slide-in panel */}
          <nav
            className="absolute right-0 top-0 flex h-full w-64 flex-col border-l border-zinc-800 bg-zinc-950 pt-16 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1 px-3 py-4">
              {NAV_LINKS.map(({ href, label, icon: Icon, iconClass }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-zinc-800 text-slate-100"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-slate-100"
                    )}
                  >
                    {Icon
                      ? <Icon size={15} className={isActive ? "text-cyan-400" : iconClass ?? "text-zinc-600"} />
                      : <span className="h-3.5 w-3.5" />
                    }
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
