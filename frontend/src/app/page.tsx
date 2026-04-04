"use client";

import Link from "next/link";
import PageShell from "@/components/ui/PageShell";

export default function HomePage() {
  return (
    <PageShell activePage="home" maxWidth="6xl">
      <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 px-4 sm:px-6">
        
        <div className="text-center mb-16 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-none text-xs font-black uppercase tracking-wider bg-white text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 bg-red-600"></span>
            </span>
            DashSure Prototype
          </div>
          <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-[1.1] tracking-tighter text-slate-900 uppercase">
            Select <span className="text-red-600">Persona.</span>
          </h1>
          <p className="text-slate-600 font-bold text-lg sm:text-xl uppercase tracking-wide">
            Choose a role to explore different parts of the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full max-w-5xl">
          {/* User Card */}
          <Link href="/dashboard" className="group">
            <div className="h-full bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2 rounded-2xl p-8 transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-20 h-20 mb-6 rounded-xl border-4 border-slate-900 bg-[#fde047] flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] group-hover:scale-110 transition-transform">
                🛵
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-3">Delivery Partner</h2>
              <p className="text-slate-600 font-bold text-sm uppercase tracking-wider mb-6">
                Get covered, manage policies, and view payouts.
              </p>
              <div className="mt-auto px-6 py-3 w-full bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors">
                Enter App →
              </div>
            </div>
          </Link>

          {/* Demo/Simulator Card */}
          <Link href="/simulate" className="group">
            <div className="h-full bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2 rounded-2xl p-8 transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-20 h-20 mb-6 rounded-xl border-4 border-slate-900 bg-orange-300 flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] group-hover:scale-110 transition-transform">
                🧪
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-3">Demo Simulator</h2>
              <p className="text-slate-600 font-bold text-sm uppercase tracking-wider mb-6">
                Trigger weather and disruption events manually.
              </p>
              <div className="mt-auto px-6 py-3 w-full bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors">
                Test Engine →
              </div>
            </div>
          </Link>

          {/* Admin Card */}
          <Link href="/admin" className="group">
            <div className="h-full bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2 rounded-2xl p-8 transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-20 h-20 mb-6 rounded-xl border-4 border-slate-900 bg-slate-800 flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] group-hover:scale-110 transition-transform">
                📊
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-3">Administrator</h2>
              <p className="text-slate-600 font-bold text-sm uppercase tracking-wider mb-6">
                Monitor system metrics, active policies, and funds.
              </p>
              <div className="mt-auto px-6 py-3 w-full bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors">
                View Dashboard →
              </div>
            </div>
          </Link>
        </div>

      </div>
    </PageShell>
  );
}
