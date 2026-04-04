"use client";

import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import SimulationControls from "@/components/SimulationControls";

export default function SimulatePage() {
  const router = useRouter();

  return (
    <PageShell activePage="simulate">
      <div className="mb-6 sm:mb-8 pt-2">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase text-slate-900">Simulator</h1>
          <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-none bg-orange-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            Global Demo
          </span>
        </div>
        <p className="text-slate-600 text-sm font-bold uppercase tracking-wide">
          Trigger system-wide climate disruptions
        </p>

        {/* Cross Verification Helpers */}
        <div className="mt-4 p-4 bg-blue-50 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] sm:max-w-md">
          <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-slate-900 pb-1 flex items-center gap-2">
             <span>🧪</span> Verification Tool
          </p>
          <p className="text-xs font-bold text-slate-700">To test location-based payouts, login via these IDs in another tab:</p>
          <ul className="mt-3 text-xs font-mono font-bold text-slate-900 space-y-1.5">
             <li>• <span className="bg-white px-2 py-0.5 border border-slate-900 rounded-sm mr-1 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">USR_BLR_1</span> & <span className="bg-white px-2 py-0.5 border border-slate-900 rounded-sm mr-2 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">USR_BLR_2</span> (Bangalore)</li>
             <li>• <span className="bg-white px-2 py-0.5 border border-slate-900 rounded-sm mr-2 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">USR_BOM_1</span> (Mumbai)</li>
          </ul>
          <p className="text-[10px] font-bold text-slate-500 mt-3 uppercase tracking-wide">Only riders inside the chosen city will receive payouts.</p>
        </div>
      </div>

      <SimulationControls />

      {/* Back to Dashboard */}
      <div className="mt-8 mb-12 pb-8 sm:pb-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-900 bg-white border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-1 active:shadow-none transition-all"
        >
          <span>←</span> Back to Dashboard
        </button>
      </div>
    </PageShell>
  );
}
