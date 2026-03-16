import { PremiumResponse } from "@/lib/types";

interface PremiumCardProps {
  data: PremiumResponse;
}

export default function PremiumCard({ data }: PremiumCardProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <span className="text-xl">🛡️</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Insurance Premium</h3>
          <p className="text-sm text-emerald-400">AI-calculated weekly coverage</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Premium Amount */}
        <div className="bg-white/5 rounded-xl p-4 col-span-2">
          <p className="text-sm text-slate-400 mb-1">Weekly Premium</p>
          <p className="text-3xl font-bold text-emerald-400">
            ₹{data.premium_to_collect.toFixed(2)}
          </p>
        </div>

        {/* Forecasted Income */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-sm text-slate-400 mb-1">Predicted Income</p>
          <p className="text-xl font-semibold text-white">
            ₹{data.forecasted_income.toFixed(0)}
          </p>
          <p className="text-xs text-slate-500">per week</p>
        </div>

        {/* Risk Index */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-sm text-slate-400 mb-1">Risk Index</p>
          <p className={`text-xl font-semibold ${data.risk_index > 0.5 ? "text-red-400" : data.risk_index > 0.3 ? "text-amber-400" : "text-emerald-400"}`}>
            {(data.risk_index * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500">AI confidence</p>
        </div>

        {/* Hourly Rate */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-sm text-slate-400 mb-1">Hourly Rate</p>
          <p className="text-xl font-semibold text-white">
            ₹{data.hourly_rate.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500">per hour</p>
        </div>

        {/* Temperature */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-sm text-slate-400 mb-1">Ambient Temp</p>
          <p className="text-xl font-semibold text-white">
            {data.ambient_temp.toFixed(1)}°C
          </p>
          <p className="text-xs text-slate-500">current</p>
        </div>
      </div>
    </div>
  );
}
