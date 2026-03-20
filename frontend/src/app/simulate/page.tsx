"use client";

import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import EmptyState from "@/components/ui/EmptyState";
import SimulationControls from "@/components/SimulationControls";
import { useSessionData } from "@/hooks/useSessionData";

export default function SimulatePage() {
  const router = useRouter();
  const { premiumData, workerData, isLoaded } = useSessionData();

  if (!isLoaded) return null;

  if (!premiumData || !workerData) {
    return (
      <PageShell activePage="simulate">
        <EmptyState
          icon="🧪"
          title="No Active Policy"
          description="Activate insurance first to run disruption simulations."
        />
      </PageShell>
    );
  }

  return (
    <PageShell activePage="simulate">
      <div className="mb-6 sm:mb-8 pt-2">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase text-slate-900">Simulator</h1>
          <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-none bg-orange-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            Demo
          </span>
        </div>
        <p className="text-slate-600 text-sm font-bold uppercase tracking-wide">
          Test payout engine for <span className="text-red-600 font-black">{workerData.worker_id}</span>
        </p>
      </div>

      <SimulationControls
        forecastedIncome={premiumData.forecasted_income}
        hourlyRate={premiumData.hourly_rate}
        ambientTemp={premiumData.ambient_temp}
        workerId={workerData.worker_id}
        city={workerData.city || 'Bangalore'}
      />

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
