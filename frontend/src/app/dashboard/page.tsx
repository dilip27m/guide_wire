"use client";

import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import EmptyState from "@/components/ui/EmptyState";
import DashboardStats from "@/components/DashboardStats";
import { useSessionData } from "@/hooks/useSessionData";

export default function DashboardPage() {
  const router = useRouter();
  const { premiumData, workerData, isLoaded } = useSessionData();

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
