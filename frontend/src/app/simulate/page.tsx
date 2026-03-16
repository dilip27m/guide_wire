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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Disruption Simulator</h1>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Demo Mode
          </span>
        </div>
        <p className="text-slate-400">
          Simulate real-world disruptions to see how the AI calculates payouts for {workerData.worker_id} in {workerData.city}.
        </p>
      </div>

      <SimulationControls
        forecastedIncome={premiumData.forecasted_income}
        hourlyRate={premiumData.hourly_rate}
        ambientTemp={premiumData.ambient_temp}
        workerId={workerData.worker_id}
        city={workerData.city}
      />

      {/* Back to Dashboard */}
      <div className="mt-8 text-center">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>
    </PageShell>
  );
}
