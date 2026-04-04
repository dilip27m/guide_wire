"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/ui/PageShell";
import Spinner from "@/components/ui/Spinner";
import ErrorAlert from "@/components/ui/ErrorAlert";

interface AdminStats {
  total_workers: number;
  active_policies: number;
  total_premiums: number;
  total_payouts: number;
  loss_ratio: number;
  recent_claims: any[];
}

interface ForecastRisk {
  city: string;
  risk_level: string;
  reason: string;
  rain_mm: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [forecasts, setForecasts] = useState<ForecastRisk[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Fetch MongoDB Stats
        const statsRes = await fetch("/api/admin");
        const statsJson = await statsRes.json();
        if (!statsJson.success) throw new Error(statsJson.error || "Failed to load stats");
        setStats(statsJson.data);

        // Fetch AI Forecasts (Python Backend)
        const pyUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
        try {
          const forecastRes = await fetch(`${pyUrl}/admin/forecast-risk`);
          const forecastJson = await forecastRes.json();
          if (forecastJson.forecasts) setForecasts(forecastJson.forecasts);
        } catch (fErr) {
          console.warn("Could not fetch ai forecast", fErr);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <PageShell activePage="admin" maxWidth="6xl">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Spinner size="lg" className="text-slate-900" />
          <p className="font-black uppercase tracking-widest text-slate-900">Loading System Command...</p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell activePage="admin" maxWidth="6xl">
        <ErrorAlert message={error} />
      </PageShell>
    );
  }

  return (
    <PageShell activePage="admin" maxWidth="6xl">
      <div className="pt-4 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b-4 border-slate-900">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border-2 border-slate-900 flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
                <span className="text-2xl">🌐</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase text-slate-900">
                Insurer Command
              </h1>
            </div>
            <p className="text-slate-600 font-bold uppercase tracking-widest text-sm mt-2 ml-15">
              Portfolio Global Analytics & Risk Assessment
            </p>
          </div>
          
          <div className="hidden sm:flex px-4 py-2 bg-red-100 border-2 border-slate-900 rounded-xl items-center gap-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 bg-red-600 rounded-full"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-slate-900">System Live</span>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <StatCard title="Loss Ratio" value={`${stats?.loss_ratio}%`} icon="📉" bg="bg-blue-100" />
          <StatCard title="Active Policies" value={stats?.active_policies.toString() || "0"} icon="🛡️" bg="bg-green-100" />
          <StatCard title="Premiums Collected" value={`₹${(stats?.total_premiums || 0).toLocaleString('en-IN')}`} icon="💰" bg="bg-[#fde047]" />
          <StatCard title="Claims Settled" value={`₹${(stats?.total_payouts || 0).toLocaleString('en-IN')}`} icon="💸" bg="bg-red-100" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Claims Feed (8 cols) */}
          <div className="lg:col-span-8 bg-white border-4 border-slate-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col h-[500px]">
             <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b-4 border-slate-900">
              <h3 className="font-black text-xl text-white uppercase tracking-tighter flex items-center gap-2">
                <span className="text-xl">📋</span> Global Claims Feed
              </h3>
            </div>
            <div className="overflow-y-auto w-full p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f8fafc] border-b-4 border-slate-900 sticky top-0">
                  <tr>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Worker</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Event Type</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Amount</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Algorithm</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200">
                  {stats?.recent_claims.map((claim, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900 font-mono text-sm">{claim.worker_id}</td>
                      <td className="p-4">
                        <span className="inline-block px-2 py-1 bg-slate-200 border-2 border-slate-900 rounded text-xs font-black uppercase tracking-wider text-slate-700">
                          {claim.disruption_id.split('_')[0]}
                        </span>
                      </td>
                      <td className="p-4 font-black text-red-600">₹{claim.amount.toFixed(0)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                           <span className="w-2 h-2 rounded-full bg-green-500 border border-slate-900"></span>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Auto-Settled</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stats?.recent_claims.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-sm font-bold text-slate-500 uppercase tracking-widest">
                        No recent claims found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Predictive Risk Panel (4 cols) */}
          <div className="lg:col-span-4 bg-slate-100 border-4 border-slate-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col h-[500px]">
            <div className="bg-[#fde047] px-6 py-4 flex items-center justify-between border-b-4 border-slate-900">
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                <span className="text-xl">🔮</span> Predictive Risk (7 Days)
              </h3>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto">
              {!forecasts ? (
                 <div className="py-8 flex justify-center"><Spinner size="md"/></div>
              ) : forecasts.length === 0 ? (
                 <p className="text-center font-bold text-slate-500 text-sm mt-8">No forecast available.</p>
              ) : (
                forecasts.map(f => (
                  <div key={f.city} className="bg-white border-2 border-slate-900 p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-black text-slate-900 uppercase tracking-tight">{f.city}</p>
                      <span className={`px-2 py-0.5 border-2 border-slate-900 rounded-md text-[10px] font-black uppercase tracking-widest
                        ${f.risk_level === 'HIGH' ? 'bg-red-200 text-red-900' : 
                          f.risk_level === 'MEDIUM' ? 'bg-orange-200 text-orange-900' : 
                          'bg-green-200 text-green-900'}`}>
                        {f.risk_level}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{f.reason}</p>
                    <div className="flex items-center gap-2 mt-3">
                       <span className="text-sm">🌧️</span>
                       <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden border border-slate-900">
                          <div className={`h-full ${f.risk_level === 'HIGH' ? 'bg-red-500' : 'bg-blue-400'}`} style={{ width: `${Math.min(100, (f.rain_mm / 100) * 100)}%` }}></div>
                       </div>
                       <span className="text-[10px] font-black w-8 text-right">{f.rain_mm}mm</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </PageShell>
  );
}

// Helper Card
function StatCard({ title, value, icon, bg }: { title: string; value: string; icon: string; bg: string }) {
  return (
    <div className={`relative overflow-hidden ${bg} border-4 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] transition-all`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-800">{title}</p>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
      <p className="font-black text-3xl sm:text-4xl text-slate-900 tracking-tighter truncate">{value}</p>
    </div>
  )
}
