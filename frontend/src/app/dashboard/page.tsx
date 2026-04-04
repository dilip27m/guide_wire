"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import EmptyState from "@/components/ui/EmptyState";
import ErrorAlert from "@/components/ui/ErrorAlert";
import Spinner from "@/components/ui/Spinner";
import DashboardStats from "@/components/DashboardStats";
import PaymentHistoryCard from "@/components/PaymentHistoryCard";
import { useSessionData } from "@/hooks/useSessionData";
import { useNotifications } from "@/hooks/useNotifications";
import { fetchWorkerDashboard } from "@/lib/api";
import { DashboardData } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { premiumData, workerData, isLoaded } = useSessionData();
  const { addNotification } = useNotifications();

  const [dbData, setDbData] = useState<DashboardData | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Settlement state
  const [settling, setSettling] = useState(false);
  const [settlementMsg, setSettlementMsg] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);

  const loadDashboard = useCallback(() => {
    if (!workerData) return;
    setDbLoading(true);
    fetchWorkerDashboard(workerData.worker_id)
      .then(setDbData)
      .catch((err) => setDbError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setDbLoading(false));
  }, [workerData]);

  useEffect(() => {
    if (!isLoaded || !workerData) return;
    loadDashboard();
  }, [isLoaded, workerData, loadDashboard]);

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

  // ── Simulate Week End ──────────────────────────────────────────────────────
  const handleSettleWeek = async () => {
    setSettling(true);
    setSettlementMsg(null);
    try {
      const res = await fetch("/api/settle-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: workerData.worker_id }),
      });
      const data = await res.json();

      if (data.status === "NOTHING_TO_SETTLE") {
        setSettlementMsg({ type: "info", text: "No pending payouts this week to settle." });
      } else if (data.status === "SETTLED") {
        const msg = `₹${data.total_payout.toFixed(2)} transferred for ${data.payout_count} claim${data.payout_count !== 1 ? "s" : ""}.`;
        setSettlementMsg({ type: "success", text: `Week settled! ${msg}` });

        // Push persistent notification to the bell
        addNotification({
          type: "settlement",
          title: "💸 Payout Received!",
          message: msg,
          amount: data.total_payout,
          week_label: data.week_label,
        });

        // Refresh payout list to show new "completed" status
        loadDashboard();
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      setSettlementMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Settlement failed",
      });
    } finally {
      setSettling(false);
      // Auto-dismiss after 6 seconds
      setTimeout(() => setSettlementMsg(null), 6000);
    }
  };

  return (
    <PageShell activePage="dashboard" maxWidth="6xl">
      <div className="flex flex-col gap-8 sm:gap-12 pt-2">

        {/* 1. Header Section — Full Width */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b-4 border-slate-900 border-dashed">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black mb-2 tracking-tighter text-slate-900 uppercase">Dashboard</h1>
            <p className="text-slate-600 font-bold uppercase tracking-widest text-sm sm:text-base">
              Active coverage for <span className="text-red-600 font-black">{workerData.city}</span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            {/* Current week paid badge */}
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-green-50 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <span className="font-black text-slate-900 uppercase tracking-tight">This Week:</span>
              <span className="flex items-center gap-1 font-black text-green-700 uppercase tracking-widest text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Paid
              </span>
            </div>

            {/* Next payment date */}
            {(() => {
              const activePolicy = dbData?.policies?.find(p => p.status === "active");
              if (!activePolicy) return null;
              const nextDate = new Date(activePolicy.end_date);
              const isOverdue = nextDate < new Date();
              return (
                <div className={`inline-flex items-center gap-2 px-5 py-3 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${isOverdue ? "bg-red-100" : "bg-[#fde047]"}`}>
                  <span className="text-xl">📅</span>
                  <span className="font-black text-slate-900 uppercase tracking-tight text-sm">Next Payment:</span>
                  <span className={`font-black text-sm uppercase tracking-widest ${isOverdue ? "text-red-700" : "text-slate-900"}`}>
                    {nextDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {isOverdue && " (Overdue)"}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 2. Stats Section — Full Width */}
        <DashboardStats
          data={premiumData}
          workerId={workerData.worker_id}
          platform={workerData.delivery_platform || "Swiggy/Zomato"}
          payouts={dbData?.payouts || []}
        />

        {/* 3. History & Demo Controls (Split Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Full Width Column: Payment & Payout History */}
          <div className="lg:col-span-12 h-[600px] flex flex-col">
            {dbLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-white border-4 border-slate-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] gap-4">
                <Spinner size="lg" />
                <p className="font-black text-slate-900 uppercase tracking-widest">Loading Records...</p>
              </div>
            ) : dbError ? (
              <ErrorAlert message={dbError} />
            ) : (
              <PaymentHistoryCard
                policies={dbData?.policies || []}
                payouts={dbData?.payouts || []}
              />
            )}
          </div>
        </div>

      </div>
    </PageShell>
  );
}
