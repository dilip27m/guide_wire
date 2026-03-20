"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export type ActivePage = "home" | "dashboard" | "simulate";

interface NavbarProps {
  activePage: ActivePage;
}

const NAV_LINKS: { href: string; label: string; page: ActivePage }[] = [
  { href: "/",          label: "Home",      page: "home"      },
  { href: "/dashboard", label: "Dashboard", page: "dashboard" },
  { href: "/simulate",  label: "Simulator", page: "simulate"  },
];

export default function Navbar({ activePage }: NavbarProps) {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setBellOpen((o) => !o);
    if (!bellOpen && unreadCount > 0) markAllRead();
  };

  return (
    <div className="w-full px-4 pt-6 sticky top-0 z-50">
      <nav className="mx-auto max-w-5xl bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] rounded-xl px-4 sm:px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group hover:-translate-y-0.5 active:translate-y-0.5 transition-transform">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-red-600 border-2 border-slate-900 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] group-active:shadow-none transition-all">
            DS
          </div>
          <span className="font-black text-xl sm:text-2xl text-slate-900 tracking-tighter uppercase whitespace-nowrap">DashSure</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Links */}
          <div className="hidden sm:flex items-center gap-2">
            {NAV_LINKS.map((link) => {
              const isActive = activePage === link.page;
              return (
                <Link
                  key={link.page}
                  href={link.href}
                  className={`relative px-5 py-2 text-sm font-black uppercase tracking-wider border-2 border-slate-900 rounded-lg transition-all ${
                    isActive
                      ? "text-white bg-slate-900"
                      : "text-slate-900 bg-white hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-none"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile Links (icons only) */}
          <div className="flex sm:hidden items-center gap-2">
            {NAV_LINKS.map((link) => {
              const isActive = activePage === link.page;
              return (
                <Link
                  key={link.page}
                  href={link.href}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 border-slate-900 font-black text-lg transition-all ${
                    isActive
                      ? "text-white bg-slate-900"
                      : "text-slate-900 bg-white hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-none"
                  }`}
                >
                  {link.label.charAt(0)}
                </Link>
              );
            })}
          </div>

          {/* 🔔 Notification Bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={handleBellClick}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg border-2 border-slate-900 bg-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-none transition-all"
              aria-label="Notifications"
            >
              {/* Bell SVG */}
              <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-red-600 border-2 border-slate-900 rounded-full text-[10px] font-black text-white animate-bounce">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {bellOpen && (
              <div className="absolute right-0 top-14 w-80 sm:w-96 bg-white border-4 border-slate-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                {/* Dropdown Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
                  <p className="font-black text-white uppercase tracking-widest text-sm">🔔 Notifications</p>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto divide-y-2 divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <span className="text-4xl mb-3">🔕</span>
                      <p className="font-black text-slate-900 uppercase tracking-tight">No notifications</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">Payout settlements will appear here</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-4 transition-colors ${n.read ? "bg-white" : "bg-green-50"}`}
                      >
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-green-400 border-2 border-slate-900 flex items-center justify-center text-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                          💸
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{n.title}</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5 leading-relaxed">{n.message}</p>
                          {n.week_label && (
                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                              Week: {n.week_label}
                            </p>
                          )}
                          <p className="text-[10px] font-bold text-slate-400 mt-1">
                            {new Date(n.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-green-600 shrink-0 mt-1" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
