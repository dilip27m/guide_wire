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

export default function HomePage() {
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
      setPremiumData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      };
      
      saveSessionData(sessionPremium, workerData);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate policy");
      setActivating(false);
    }
  };

  return (
    <PageShell activePage="home" maxWidth="6xl">
      {/* Hero */}
      <div className="text-center mb-12 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          AI-Powered Parametric Insurance
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Protection for Every Delivery
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Automatic compensation when rain, heatwaves, strikes, or pollution disrupt your work.
          No claims. No paperwork. Just instant payouts.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Form */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-1">Get Started</h2>
          <p className="text-sm text-slate-400 mb-6">
            Enter your details to calculate your personalized premium
          </p>
          <WorkerForm onSubmit={handleSubmit} loading={loading} />
        </div>

        {/* Result */}
        <div>
          {error && <ErrorAlert message={error} className="mb-4" />}

          {premiumData ? (
            <div className="space-y-4">
              <PremiumCard data={premiumData} />
              <button
                onClick={handleActivate}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                Activate Insurance →
              </button>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4">🛡️</div>
              <p className="text-slate-400">
                Fill in the form to see your AI-calculated premium and coverage details.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-2xl mb-1">🌧️</p>
                  <p className="text-xs text-slate-500">Rain Cover</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-2xl mb-1">🔥</p>
                  <p className="text-xs text-slate-500">Heatwave</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-2xl mb-1">✊</p>
                  <p className="text-xs text-slate-500">Strike</p>
                </div>
              </div>
            </div>
          )}
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
          <div className="bg-slate-900 p-8 rounded-2xl border border-white/10 flex flex-col items-center">
            <Spinner size="lg" />
            <p className="mt-4 text-white font-medium">Finalizing Policy...</p>
          </div>
        </div>
      )}
    </PageShell>
  );
}
