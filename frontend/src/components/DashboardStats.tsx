import { PremiumResponse } from "@/lib/types";

interface DashboardStatsProps {
  data: PremiumResponse;
  workerId: string;
  platform: string;
}

export default function DashboardStats({ data, workerId, platform }: DashboardStatsProps) {
  const stats = [
    {
      label: "Weekly Income Forecast",
      value: `₹${data.forecasted_income.toFixed(0)}`,
      sub: "AI-predicted",
      icon: "💰",
      color: "bg-[#fde047]",
    },
    {
      label: "Weekly Premium",
      value: `₹${data.premium_to_collect.toFixed(2)}`,
      sub: "Auto-deducted",
      icon: "🛡️",
      color: "bg-blue-200",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Worker Info Bar */}
      <div className="flex items-center gap-4 p-4 bg-white border-4 border-slate-900 rounded-xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
        <div className="w-14 h-14 rounded-lg bg-slate-900 border-2 border-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]">
          {workerId.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-lg text-slate-900 tracking-tighter uppercase truncate">{workerId}</p>
          <p className="text-xs text-slate-600 font-bold uppercase tracking-widest truncate">{platform} • Active Policy</p>
        </div>
        <div className="flex items-center justify-center px-4 py-2 bg-green-300 border-2 border-slate-900 rounded-lg gap-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full bg-green-600 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 bg-green-700"></span>
          </span>
          <span className="text-xs font-black text-slate-900 tracking-widest uppercase hidden sm:block">Active</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden ${stat.color} border-4 border-slate-900 rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-black mb-1 uppercase tracking-widest text-slate-900">{stat.label}</p>
                <p className="font-black text-slate-900 tracking-tighter text-3xl sm:text-4xl">
                  {stat.value}
                </p>
                <p className="text-[10px] mt-1 uppercase tracking-widest font-bold text-slate-700">{stat.sub}</p>
              </div>
              <div className="w-12 h-12 rounded-lg border-2 border-slate-900 bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
