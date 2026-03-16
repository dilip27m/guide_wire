"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import EmptyState from "@/components/ui/EmptyState";
import ErrorAlert from "@/components/ui/ErrorAlert";
import Spinner from "@/components/ui/Spinner";
import DashboardStats from "@/components/DashboardStats";
import { useSessionData } from "@/hooks/useSessionData";
import { fetchWorkerDashboard } from "@/lib/api";
import { DashboardData, IPayoutData } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { premiumData, workerData, isLoaded } = useSessionData();
  const [dbData, setDbData] = useState<DashboardData | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Fetch DB data when session is loaded
  useEffect(() => {
    if (!isLoaded || !workerData) return;

    setDbLoading(true);
    fetchWorkerDashboard(workerData.worker_id)
      .then(setDbData)
      .catch((err) => setDbError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setDbLoading(false));
  }, [isLoaded, workerData]);

  if (!isLoaded) return null;

  if (!premiumData || !workerData) {
    return (
      <PageShell activePage="dashboard">
        <EmptyState
          icon="📋"
          title="No Active Policy"
          description="You need to calculate and activate your premium first."
        />
      </PageShell>
    );
  }

  return (
    <PageShell activePage="dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Policy Dashboard</h1>
        <p className="text-slate-400">
          Your AI-powered coverage overview for {workerData.city}
        </p>
      </div>

      <DashboardStats
        data={premiumData}
        workerId={workerData.worker_id}
        platform={workerData.delivery_platform}
      />

      {/* Payout History from DB */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Payout History</h2>

        {dbLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Spinner size="sm" />
            Loading history...
          </div>
        )}

        {dbError && <ErrorAlert message={dbError} className="mb-4" />}

        {dbData && dbData.payouts.length > 0 ? (
          <div className="space-y-3">
            {dbData.payouts.map((payout: IPayoutData) => (
              <div
                key={payout.payout_id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {payout.cargo_spoiled ? "🔴" : "🟢"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {payout.disruption_id.split("_").slice(0, -1).join(" ").replace(/^\w/, (c) => c.toUpperCase())}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(payout.timestamp).toLocaleDateString()} • {payout.status}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-emerald-400">
                  ₹{payout.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          !dbLoading && (
            <div className="p-6 bg-white/5 rounded-xl border border-white/10 text-center">
              <p className="text-slate-400 text-sm">
                No payouts yet. Run a simulation to see payout history.
              </p>
            </div>
          )
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push("/simulate")}
          className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left"
        >
          <span className="text-2xl mb-2 block">🧪</span>
          <p className="font-semibold text-white">Run Simulation</p>
          <p className="text-xs text-slate-400 mt-1">Test disruption scenarios and see payouts</p>
        </button>
        <button
          onClick={() => router.push("/")}
          className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left"
        >
          <span className="text-2xl mb-2 block">🔄</span>
          <p className="font-semibold text-white">Recalculate Premium</p>
          <p className="text-xs text-slate-400 mt-1">Update your coverage with new data</p>
        </button>
      </div>
    </PageShell>
  );
}
