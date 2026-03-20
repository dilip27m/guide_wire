"use client";

import { useState } from "react";
import { DisruptionScenario, PayoutResponse } from "@/lib/types";
import { SCENARIOS } from "@/lib/constants";
import { fetchPayout } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import ErrorAlert from "@/components/ui/ErrorAlert";

interface SimulationControlsProps {
  forecastedIncome: number;
  hourlyRate: number;
  ambientTemp: number;
  workerId: string;
  city: string;
}

const SCENARIO_COLORS = [
  "bg-blue-200",
  "bg-orange-200",
  "bg-red-200",
  "bg-purple-200",
  "bg-yellow-200",
  "bg-green-200",
];

export default function SimulationControls({
  forecastedIncome,
  hourlyRate,
  ambientTemp,
  workerId,
  city,
}: SimulationControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<PayoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<DisruptionScenario | null>(null);

  const handleSimulate = async (scenario: DisruptionScenario) => {
    setLoading(scenario.type);
    setError(null);
    setResult(null);
    setActiveScenario(scenario);

    try {
      const res = await fetchPayout({
        disruption_id: `${scenario.type}_${Date.now()}`,
        disruption_type: scenario.type,
        duration_hrs: scenario.duration_hrs,
        cargo_type: scenario.cargo_type,
        forecasted_income: forecastedIncome,
        hourly_rate: hourlyRate,
        ambient_temp: scenario.ambient_temp || ambientTemp,
        worker_id: workerId,
        city: city,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scenario Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SCENARIOS.map((scenario, idx) => {
          const bgColor = SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
          const isActive = loading === scenario.type;
          return (
            <button
              key={scenario.type}
              onClick={() => handleSimulate(scenario)}
              disabled={loading !== null}
              className={`group relative overflow-hidden p-5 sm:p-6 rounded-xl border-4 border-slate-900 text-left transition-all ${bgColor} ${
                isActive
                  ? "shadow-none translate-y-1"
                  : "shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 active:shadow-none active:translate-y-1"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-14 h-14 shrink-0 rounded-lg bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <span className="text-3xl">{scenario.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-lg text-slate-900 tracking-tighter uppercase mb-1">{scenario.label}</p>
                  <p className="text-xs text-slate-700 font-bold leading-relaxed mb-3">{scenario.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-1 rounded-none text-[10px] font-black bg-white text-slate-900 border-2 border-slate-900 uppercase tracking-widest shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                      {scenario.duration_hrs}h
                    </span>
                    <span className="px-2 py-1 rounded-none text-[10px] font-black bg-white text-slate-900 border-2 border-slate-900 uppercase tracking-widest shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                      {scenario.cargo_type.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
                  <div className="flex flex-col items-center gap-2">
                    <Spinner size="lg" className="text-slate-900" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Simulating...</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} />}

      {/* Result */}
      {result && activeScenario && (
        <div
          className="relative overflow-hidden bg-[#fde047] border-4 border-slate-900 rounded-xl p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] animate-in fade-in slide-in-from-bottom-8 duration-700 mt-8"
          id="result-card"
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8 border-b-4 border-slate-900 pb-6">
            <div className="w-16 h-16 shrink-0 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
               <span className="text-3xl">{activeScenario.icon}</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-2 rounded-none text-[10px] font-black uppercase tracking-widest bg-green-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <span className="w-2 h-2 bg-green-700 animate-pulse" />
                Claim Approved
              </div>
              <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{activeScenario.label} Triggered</h4>
              <p className="text-xs text-slate-600 font-bold font-mono mt-1">ID: {result.disruption_id}</p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="col-span-2 relative overflow-hidden bg-white border-4 border-slate-900 rounded-xl p-5 sm:p-6 mb-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <p className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">Instant Payout</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-400">₹</span>
                <p className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tighter">
                  {result.payout_amount.toFixed(2)}
                </p>
              </div>
            </div>
            

          </div>

          {result.payout_id && (
            <div className="relative z-10 flex items-center gap-2 p-3 bg-white border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <span className="text-slate-900 font-black">✓</span>
              <p className="text-xs text-slate-700 font-bold uppercase tracking-wide">Saved to Records • ID: <span className="font-mono text-slate-900">{result.payout_id}</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
