"use client";

import Link from "next/link";

export type ActivePage = "home" | "dashboard" | "simulate";

interface NavbarProps {
  activePage: ActivePage;
}

const NAV_LINKS: { href: string; label: string; page: ActivePage }[] = [
  { href: "/", label: "Home", page: "home" },
  { href: "/dashboard", label: "Dashboard", page: "dashboard" },
  { href: "/simulate", label: "Simulate", page: "simulate" },
];

export default function Navbar({ activePage }: NavbarProps) {
  return (
    <nav className="border-b border-white/5 backdrop-blur-md bg-slate-950/80 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-sm text-white">
            GW
          </div>
          <span className="font-bold text-lg text-white">GuideWire</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-4 text-sm text-slate-400">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.page}
              href={link.href}
              className={
                activePage === link.page
                  ? "text-white"
                  : "hover:text-white transition-colors"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
