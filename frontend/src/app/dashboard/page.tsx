"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageShell from "@/components/ui/PageShell";
import EmptyState from "@/components/ui/EmptyState";
import ErrorAlert from "@/components/ui/ErrorAlert";
import Spinner from "@/components/ui/Spinner";
import DashboardStats from "@/components/DashboardStats";
import PaymentHistoryCard from "@/components/PaymentHistoryCard";
import PayoutReceiptModal from "@/components/PayoutReceiptModal";
import { useSessionData } from "@/hooks/useSessionData";
import { useNotifications } from "@/hooks/useNotifications";
import { fetchWorkerDashboard } from "@/lib/api";
import { DashboardData } from "@/lib/types";
import { aiService } from "@/services/aiService";

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

export default function DashboardPage() {
  const { premiumData, workerData, isLoaded } = useSessionData();
  const { addNotification } = useNotifications();

  const [dbData, setDbData] = useState<DashboardData | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);



  // Payout receipt modal state
  const [receiptData, setReceiptData] = useState<{
    amount: number;
    weekLabel?: string;
    payoutCount?: number;
  } | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Oracle auto-payout banner state
  const [activeDisruption, setActiveDisruption] = useState<{
    disruption_id: string;
    trigger: string;
    payout_amount: number;
    location: string;
    settled_at: string;
  } | null>(null);
  const lastSeenPayoutId = useRef<string | null>(null);

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

  // ── GPS Batching & Polling ─────────────────────────────────────────────────
  const gpsQueue = useRef<{ lat: number; lon: number; ts: string }[]>([]);
  
  useEffect(() => {
    if (!isLoaded || !workerData) return;

    // Simulate location gathering (creates slight jitter around base coord)
    const gatherInterval = setInterval(() => {
      const baseLat = 12.9716; // Bangalore base
      const baseLon = 77.5946;
      gpsQueue.current.push({
        lat: baseLat + (Math.random() - 0.5) * 0.01,
        lon: baseLon + (Math.random() - 0.5) * 0.01,
        ts: new Date().toISOString(),
      });
    }, 2000); // gather every 2 seconds

    // Flush batch to backend every 10 seconds (5 pings per batch)
    const flushInterval = setInterval(() => {
      if (gpsQueue.current.length > 0) {
        const batch = [...gpsQueue.current];
        gpsQueue.current = [];
        
        aiService.pingLocation(workerData.worker_id, {
          location_name: workerData.city || "Bangalore",
          pings: batch
        }).catch(err => console.error("GPS Batch Error:", err));
      }
    }, 10000);

    return () => {
      clearInterval(gatherInterval);
      clearInterval(flushInterval);
    };
  }, [isLoaded, workerData]);

  // ── Oracle Auto-Payout Polling (every 30s) ─────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !workerData) return;

    const pollOraclePayout = async () => {
      try {
        const res = await fetch(`${AI_SERVICE_URL}/latest-payout?worker_id=${workerData.worker_id}`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "ok" && data.payout) {
          const p = data.payout;
          // Only show if it's a new payout for THIS rider and not already seen
          if (
            p.rider_id === workerData.worker_id &&
            p.disruption_id !== lastSeenPayoutId.current
          ) {
            lastSeenPayoutId.current = p.disruption_id;
            setActiveDisruption(p);

            const msg = `₹${p.payout_amount.toFixed(2)} credited for ${p.trigger.replaceAll("_", " ")} disruption`;
            
            addNotification({
              type: "settlement",
              title: "🚨 Oracle Auto-Payout!",
              message: msg,
              amount: p.payout_amount,
            });

            // Trigger zero-touch instant Payout Animation
            setReceiptData({
              amount: p.payout_amount,
              weekLabel: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
              payoutCount: 1,
            });
            setReceiptOpen(true);
            
            // Refresh to show in Transaction Log
            loadDashboard();

            // Auto-dismiss banner after 60s
            setTimeout(() => setActiveDisruption(null), 60_000);
          }
        }
      } catch {
        // Silently ignore poll failures (network / Render cold-start)
      }
    };

    pollOraclePayout(); // immediate first check
    const interval = setInterval(pollOraclePayout, 30_000);
    return () => clearInterval(interval);
  }, [isLoaded, workerData, addNotification]);


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
    <>
    <PageShell activePage="dashboard" maxWidth="6xl">
      <div className="flex flex-col gap-8 sm:gap-12 pt-2">

        {/* Active Disruption Banner — fires when oracle settles a payout */}
        {activeDisruption && (
          <div className="relative overflow-hidden flex items-center gap-4 p-4 sm:p-5 bg-red-500 border-4 border-slate-900 rounded-xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] animate-in slide-in-from-top-4 duration-500">
            <div className="w-12 h-12 shrink-0 rounded-lg bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <span className="text-2xl">🚨</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white uppercase tracking-widest text-sm">Active Disruption — Oracle Settled</p>
              <p className="text-red-100 font-bold text-xs mt-0.5 truncate">
                {activeDisruption.trigger.replaceAll("_", " ").toUpperCase()} • {activeDisruption.location} • {activeDisruption.settled_at}
              </p>
            </div>
            <div className="shrink-0 px-4 py-2 bg-white border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <p className="font-black text-slate-900 text-lg">₹{activeDisruption.payout_amount.toFixed(0)}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">credited</p>
            </div>
            <button
              onClick={() => setActiveDisruption(null)}
              className="shrink-0 w-8 h-8 rounded-lg bg-red-600 border-2 border-white flex items-center justify-center text-white font-black hover:bg-red-700 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

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
              const activePolicy = dbData?.policies?.find(p => p.status === "ACTIVE");  // uppercase — ai_service.py
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

    {/* UPI / IMPS Payout Receipt Modal — fires on settle-week success */}
    {receiptData && (
      <PayoutReceiptModal
        isOpen={receiptOpen}
        amount={receiptData.amount}
        workerId={workerData?.worker_id || ""}
        weekLabel={receiptData.weekLabel}
        payoutCount={receiptData.payoutCount}
        onClose={() => {
          setReceiptOpen(false);
          setTimeout(() => setReceiptData(null), 400); // allow fade-out
        }}
      />
    )}
    </>
  );
}
