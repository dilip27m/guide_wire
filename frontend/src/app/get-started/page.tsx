"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import ErrorAlert from "@/components/ui/ErrorAlert";
import Spinner from "@/components/ui/Spinner";
import WorkerForm from "@/components/WorkerForm";
import PremiumCard from "@/components/PremiumCard";
import PaymentModal from "@/components/PaymentModal";
import { WorkerData, PremiumResponse } from "@/lib/types";
import { fetchPremium, activatePolicy } from "@/lib/api";
import { saveSessionData } from "@/hooks/useSessionData";

export default function GetStartedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [premiumData, setPremiumData] = useState<PremiumResponse | null>(null);
  const [workerData, setWorkerData] = useState<WorkerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  const handleSubmit = async (data: WorkerData) => {
    setLoading(true);
    setError(null);
    setWorkerData(data);

    try {
      const result = await fetchPremium(data);
      if (result.already_active) {
        saveSessionData(result, data);
        router.push("/dashboard");
        return;
      }
      setPremiumData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleExistingUser = async (dashboardData: any) => {
    setLoading(true);
    setError(null);
    
    const wData: WorkerData = {
      worker_id: dashboardData.worker.worker_id,
      name: dashboardData.worker.name,
      city: dashboardData.worker.city,
      delivery_platform: dashboardData.worker.platform,
      phone: "1234567890", // placeholder as phone isn't tracked explicitly
    };
    
    setWorkerData(wData);

    // If they already have an active policy, bypass everything
    if (dashboardData.policy && dashboardData.policy.status === "active") {
      const pData: PremiumResponse = {
        status: "active",
        hourly_rate: 60, // Standard baseline
        ambient_temp: 32, // standard baseline
        forecasted_income: dashboardData.policy.weekly_income_prediction,
        risk_index: dashboardData.policy.risk_index,
        premium_to_collect: dashboardData.policy.premium_paid,
        policy_id: dashboardData.policy.policy_id,
        already_active: true,
      };
      saveSessionData(pData, wData);
      router.push("/dashboard");
      return;
    }

    // They exist but no active policy, get a Quote automatically!
    try {
      const result = await fetchPremium(wData);
      setPremiumData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong fetching quote.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = () => {
    if (!premiumData || !workerData) return;
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!premiumData || !workerData) return;
    
    setActivating(true);
    setIsPaymentOpen(false);
    
    try {
      const response = await activatePolicy({
        worker_id: workerData.worker_id,
        payment_id: paymentId,
        premium_to_collect: premiumData.premium_to_collect,
        risk_index: premiumData.risk_index,
        forecasted_income: premiumData.forecasted_income,
      });
      
      const sessionPremium = {
        ...premiumData,
        policy_id: response.policy_id,
        city: workerData.city,
        platform: workerData.delivery_platform,
      };
      
      saveSessionData(sessionPremium, workerData);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate policy");
      setActivating(false);
    }
  };

  return (
    <PageShell activePage="get-started" maxWidth="6xl">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start pt-4 sm:pt-8">
        
        {/* Hero Section (Spans 7 cols on Desktop) */}
        <div className="lg:col-span-7 flex flex-col justify-center bg-[#fde047] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 rounded-2xl p-8 sm:p-12 h-full transition-all duration-300">
          <div className="inline-flex items-center self-start gap-2 px-3 py-1.5 mb-8 rounded-none text-xs font-black uppercase tracking-wider bg-white text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 bg-red-600"></span>
            </span>
            Parametric Insurance
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-6 leading-[1.1] tracking-tighter text-slate-900 uppercase">
            Protection for <br />
            <span className="text-red-600">Every Delivery.</span>
          </h1>
          <p className="text-slate-800 font-medium text-lg lg:text-xl max-w-xl leading-relaxed mb-10">
            Automatic compensation when severe weather, strikes, or pollution disrupt your work. No tedious claims processes — just instant payouts when you need them most.
          </p>

          <div className="mt-auto grid grid-cols-3 gap-4 border-t-4 border-slate-900 pt-8">
            <div>
               <p className="text-3xl font-black text-slate-900 mb-1">0</p>
               <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Paperwork</p>
            </div>
            <div>
               <p className="text-3xl font-black text-slate-900 mb-1">Instant</p>
               <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Payouts</p>
            </div>
            <div>
               <p className="text-3xl font-black text-slate-900 mb-1">AI</p>
               <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Calculated</p>
            </div>
          </div>
        </div>

        {/* Interactive Right Column (Spans 5 cols on Desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-8 w-full">
          
          {/* Form Card */}
          <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg border-2 border-slate-900 bg-red-100 flex items-center justify-center text-red-600 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Get Covered</h2>
            </div>
            <p className="text-sm font-bold text-slate-500 mb-8 ml-13 uppercase tracking-wide">
              Verify your ID to activate auto-protection.
            </p>
            <WorkerForm onSubmit={handleSubmit} onExistingUser={handleExistingUser} loading={loading} />
          </div>

          {/* Result Card */}
          <div className="w-full transition-all duration-500">
            {error && <ErrorAlert message={error} className="mb-4" />}

            {premiumData ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <PremiumCard data={premiumData} />
                <button
                  onClick={handleActivate}
                  className="w-full py-4 px-6 rounded-xl font-black uppercase tracking-wider text-xl text-white bg-red-600 border-4 border-slate-900 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-1 active:shadow-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                >
                  Activate Insurance →
                </button>
              </div>
            ) : (
              <div className="bg-[#fdfbf7] border-4 border-slate-900 border-dashed rounded-2xl p-8 text-center flex flex-col justify-center items-center h-full min-h-[280px] opacity-80">
                <div className="w-16 h-16 mb-4 rounded-xl border-2 border-slate-900 bg-white flex items-center justify-center text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-1">Awaiting Details</h3>
                <p className="text-sm font-bold text-slate-600 max-w-xs uppercase">
                  Your personalized coverage and premium will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {premiumData && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={handlePaymentSuccess}
          premiumData={premiumData}
        />
      )}
      
      {activating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-slate-900/90 p-8 rounded-3xl border border-white/10 flex flex-col items-center shadow-2xl">
            <Spinner size="lg" />
            <p className="mt-6 text-white text-lg font-bold tracking-tight">Finalizing Policy...</p>
            <p className="mt-1 text-slate-400 text-sm">Please do not close this window</p>
          </div>
        </div>
      )}
    </PageShell>
  );
}
