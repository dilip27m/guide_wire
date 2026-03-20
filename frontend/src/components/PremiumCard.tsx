import { PremiumResponse } from "@/lib/types";

interface PremiumCardProps {
  data: PremiumResponse;
}

export default function PremiumCard({ data }: PremiumCardProps) {
  return (
    <div className="relative overflow-hidden bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] rounded-2xl p-6 sm:p-8 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]">
      
      <div className="flex items-center justify-between mb-8 border-b-4 border-slate-900 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-orange-200 border-2 border-slate-900 flex items-center justify-center text-orange-600 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">AI Protection Policy</h3>
            <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Weekly Coverage active</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Premium Amount - Highlighted */}
        <div className="col-span-2 relative overflow-hidden bg-white border-4 border-slate-900 rounded-xl p-5 mb-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              Weekly Premium
            </p>
            <span className="px-3 py-1.5 rounded-none bg-red-600 text-[10px] font-black text-white border-2 border-slate-900 uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              Auto-deducted
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-400">₹</span>
            <p className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tighter">
              {data.premium_to_collect.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Forecasted Income */}
        <div className="bg-green-100 rounded-xl p-4 border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all">
          <p className="text-[10px] font-black text-slate-900 mb-1 uppercase tracking-widest">Projected Income</p>
          <p className="text-2xl font-black text-slate-900 tracking-tighter">
            ₹{data.forecasted_income.toFixed(0)}
          </p>
        </div>

        {/* Risk Index */}
        <div className="bg-red-100 rounded-xl p-4 border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all">
          <p className="text-[10px] font-black text-slate-900 mb-1 uppercase tracking-widest">Risk Index</p>
          <p className={`text-2xl font-black tracking-tighter ${data.risk_index > 0.5 ? "text-red-600" : data.risk_index > 0.3 ? "text-orange-600" : "text-green-700"}`}>
            {(data.risk_index * 100).toFixed(1)}%
          </p>
        </div>

        {/* Hourly Rate */}
        <div className="bg-blue-100 rounded-xl p-4 border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all">
          <p className="text-[10px] font-black text-slate-900 mb-1 uppercase tracking-widest">Calculated Rate</p>
          <p className="text-2xl font-black text-slate-900 tracking-tighter">
            ₹{data.hourly_rate.toFixed(1)} <span className="text-base font-bold text-slate-600">/hr</span>
          </p>
        </div>

        {/* Temperature */}
        <div className="bg-orange-100 rounded-xl p-4 border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all">
          <p className="text-[10px] font-black text-slate-900 mb-1 uppercase tracking-widest">Avg Temp</p>
          <p className="text-2xl font-black text-slate-900 tracking-tighter">
            {data.ambient_temp.toFixed(1)}°C
          </p>
        </div>
      </div>
    </div>
  );
}
