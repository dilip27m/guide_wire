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
      color: "from-emerald-500/20 to-green-500/20",
      border: "border-emerald-500/30",
    },
    {
      label: "Risk Index",
      value: `${(data.risk_index * 100).toFixed(1)}%`,
      sub: data.risk_index > 0.5 ? "High Risk" : data.risk_index > 0.3 ? "Medium Risk" : "Low Risk",
      icon: "📊",
      color: data.risk_index > 0.5 ? "from-red-500/20 to-orange-500/20" : "from-amber-500/20 to-yellow-500/20",
      border: data.risk_index > 0.5 ? "border-red-500/30" : "border-amber-500/30",
    },
    {
      label: "Weekly Premium",
      value: `₹${data.premium_to_collect.toFixed(2)}`,
      sub: "Auto-deducted",
      icon: "🛡️",
      color: "from-blue-500/20 to-indigo-500/20",
      border: "border-blue-500/30",
    },
    {
      label: "Hourly Earning Rate",
      value: `₹${data.hourly_rate.toFixed(2)}/hr`,
      sub: "Based on forecast",
      icon: "⏱️",
      color: "from-purple-500/20 to-fuchsia-500/20",
      border: "border-purple-500/30",
    },
  ];

  return (
    <div>
      {/* Worker Info Bar */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
          {workerId.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-white">{workerId}</p>
          <p className="text-sm text-slate-400">{platform} • Active Policy</p>
        </div>
        <div className="ml-auto">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            ● Covered
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} border ${stat.border} rounded-2xl p-5 backdrop-blur-sm transition-transform hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
