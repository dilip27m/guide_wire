"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import EmptyState from "@/components/ui/EmptyState";
import Spinner from "@/components/ui/Spinner";
import { useSessionData } from "@/hooks/useSessionData";
import { fetchWorkerDashboard } from "@/lib/api";
import { DashboardData } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { premiumData, workerData, isLoaded } = useSessionData();

  const [dbData, setDbData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(() => {
    if (!workerData) return;
    setLoading(true);
    fetchWorkerDashboard(workerData.worker_id)
      .then(setDbData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workerData]);

  useEffect(() => {
    if (!isLoaded || !workerData) return;
    loadProfile();
  }, [isLoaded, workerData, loadProfile]);

  if (!isLoaded) return null;

  if (!premiumData || !workerData) {
    return (
      <PageShell activePage="profile">
        <EmptyState
          icon="👤"
          title="Not Registered"
          description="Get your insurance quote first to create your profile."
        />
      </PageShell>
    );
  }

  const activePolicy = dbData?.policies?.find((p) => p.status === "active");
  const totalPayouts = dbData?.payouts?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalClaims = dbData?.payouts?.length || 0;

  // Calculate days remaining
  const daysLeft = activePolicy
    ? Math.max(0, Math.ceil((new Date(activePolicy.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <PageShell activePage="profile" maxWidth="6xl">
      <div className="flex flex-col gap-8 pt-2">
        
        {/* Header */}
        <div className="pb-6 border-b-4 border-slate-900 border-dashed">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase text-slate-900 mb-2">
            My Profile
          </h1>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">
            Your insurance identity & coverage details
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Spinner size="lg" />
            <p className="font-black text-slate-900 uppercase tracking-widest">Loading Profile...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column: Worker Info (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Worker Identity Card */}
              <div className="bg-white border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                {/* Card Header */}
                <div className="bg-slate-900 px-6 py-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-red-600 border-2 border-white flex items-center justify-center text-2xl font-black text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]">
                    {workerData.name?.charAt(0)?.toUpperCase() || "W"}
                  </div>
                  <div>
                    <p className="font-black text-xl text-white uppercase tracking-tight">
                      {workerData.name || "Worker"}
                    </p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {workerData.delivery_platform} Partner
                    </p>
                  </div>
                </div>
                
                {/* Info Grid */}
                <div className="p-6 grid grid-cols-2 gap-4">
                  <InfoItem label="Worker ID" value={workerData.worker_id} icon="🆔" />
                  <InfoItem label="Phone" value={workerData.phone || "Not set"} icon="📱" />
                  <InfoItem label="City" value={workerData.city} icon="🏙️" />
                  <InfoItem label="Platform" value={workerData.delivery_platform} icon="🛵" />
                  <InfoItem 
                    label="Member Since" 
                    value={dbData?.worker?.created_at 
                      ? new Date(dbData.worker.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) 
                      : "Today"
                    } 
                    icon="📅" 
                  />
                  <InfoItem 
                    label="Risk Index" 
                    value={`${(premiumData.risk_index * 100).toFixed(1)}%`}
                    icon="⚡"
                    highlight={premiumData.risk_index > 0.5 ? "red" : premiumData.risk_index > 0.3 ? "orange" : "green"} 
                  />
                </div>
              </div>

              {/* Coverage Summary */}
              <div className="bg-[#fde047] border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter mb-4 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">🛡️</span>
                  Coverage Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Earnings Protected</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{totalPayouts.toFixed(0)}</p>
                  </div>
                  <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Total Claims</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">{totalClaims}</p>
                  </div>
                  <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Days Left</p>
                    <p className={`text-2xl font-black tracking-tighter ${daysLeft <= 1 ? "text-red-600" : "text-green-700"}`}>
                      {daysLeft}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Active Policy (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Active Policy Card */}
              <div className="bg-white border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                <div className="bg-green-400 px-6 py-3 flex items-center justify-between border-b-4 border-slate-900">
                  <p className="font-black text-slate-900 uppercase tracking-widest text-sm">Active Policy</p>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-green-800 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 bg-green-800 rounded-full"></span>
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  {activePolicy ? (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Policy ID</p>
                          <p className="font-bold text-slate-900 text-sm font-mono">{activePolicy.policy_id}</p>
                        </div>
                        <span className="px-3 py-1.5 bg-green-200 border-2 border-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                          Active
                        </span>
                      </div>
                      
                      <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Premium Paid</p>
                            <p className="font-black text-slate-900">₹{activePolicy.premium_paid.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Coverage</p>
                            <p className="font-black text-slate-900">7 Days</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Start Date</p>
                            <p className="font-bold text-slate-900">{new Date(activePolicy.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">End Date</p>
                            <p className="font-bold text-slate-900">{new Date(activePolicy.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-100 border-2 border-slate-900 rounded-xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Weekly Income Forecast</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{activePolicy.weekly_income_prediction.toFixed(0)}</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-4xl mb-3">📋</p>
                      <p className="font-black text-slate-900 uppercase tracking-tight">No Active Policy</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">Go to Home to activate one</p>
                    </div>
                  )}
                </div>
              </div>


            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

// --- Helper Component ---
function InfoItem({ label, value, icon, highlight }: { label: string; value: string; icon: string; highlight?: string }) {
  const colorClass = highlight === "red" ? "text-red-600" : highlight === "orange" ? "text-orange-600" : highlight === "green" ? "text-green-700" : "text-slate-900";
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl">
      <span className="text-lg mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className={`text-sm font-black truncate ${colorClass}`}>{value}</p>
      </div>
    </div>
  );
}
