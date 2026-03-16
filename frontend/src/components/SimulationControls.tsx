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
}

export default function SimulationControls({
  forecastedIncome,
  hourlyRate,
  ambientTemp,
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
        duration_hrs: scenario.duration_hrs,
        cargo_type: scenario.cargo_type,
        forecasted_income: forecastedIncome,
        hourly_rate: hourlyRate,
        ambient_temp: scenario.ambient_temp || ambientTemp,
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
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.type}
            onClick={() => handleSimulate(scenario)}
            disabled={loading !== null}
            className={`group relative p-5 rounded-2xl border text-left transition-all duration-200 ${
              loading === scenario.type
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{scenario.icon}</span>
              <div>
                <p className="font-semibold text-white">{scenario.label}</p>
                <p className="text-xs text-slate-400 mt-1">{scenario.description}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Duration: {scenario.duration_hrs}h • Cargo: {scenario.cargo_type.replace("_", " ")}
                </p>
              </div>
            </div>
            {loading === scenario.type && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
                <Spinner size="lg" className="text-amber-400" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} />}

      {/* Result */}
      {result && activeScenario && (
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">{activeScenario.icon}</span>
            <div>
              <h4 className="font-bold text-white">{activeScenario.label} — Payout Result</h4>
              <p className="text-xs text-slate-400">Disruption ID: {result.disruption_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Payout Amount</p>
              <p className="text-2xl font-bold text-emerald-400">₹{result.payout_amount.toFixed(2)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Cargo Spoiled</p>
              <p className={`text-2xl font-bold ${result.cargo_spoiled ? "text-red-400" : "text-emerald-400"}`}>
                {result.cargo_spoiled ? "Yes" : "No"}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Decay Index</p>
              <p className="text-2xl font-bold text-amber-400">{result.decay_index.toFixed(3)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Timestamp: {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
