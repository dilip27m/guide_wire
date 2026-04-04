"use client";
import { IPolicyData, IPayoutData } from "@/lib/types";

interface PaymentHistoryCardProps {
  policies: IPolicyData[];
  payouts: IPayoutData[];
}

type Transaction = {
  id: string;
  timestamp: string | Date;
  type: "premium" | "payout";
  amount: number;
  description: string;
  icon: string;
  status: string;
};

// --- Disruption type → human-readable label + icon ---
const DISRUPTION_META: Record<string, { label: string; icon: string }> = {
  heavy_rain: { label: "Heavy Rain Disruption", icon: "🌧️" },
  heatwave:   { label: "Heatwave Alert", icon: "🔥" },
  strike:     { label: "Strike / Bandh", icon: "✊" },
  pollution:  { label: "Pollution Spike", icon: "🏭" },
};

function getDisruptionMeta(disruption_id: string) {
  const type = disruption_id.split("_")[0];
  return DISRUPTION_META[type] || { label: "Parametric Payout", icon: "⚡" };
}

export default function PaymentHistoryCard({ policies, payouts }: PaymentHistoryCardProps) {
  // Merge and sort transactions (Google Pay style)
  const transactions: Transaction[] = [];

  policies.forEach((policy) => {
    transactions.push({
      id: policy.policy_id,
      timestamp: policy.start_date,
      type: "premium",
      amount: policy.premium_paid,
      description: "Weekly Coverage Premium",
      icon: "🛡️",
      status: policy.status === "active" ? "Active" : "Paid",
    });
  });

  payouts.forEach((payout) => {
    const meta = getDisruptionMeta(payout.disruption_id);
    transactions.push({
      id: payout.payout_id,
      timestamp: payout.timestamp,
      type: "payout",
      amount: payout.amount,
      description: meta.label,
      icon: meta.icon,
      status: "Completed",
    });
  });

  // Sort descending (newest first)
  transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="bg-[#f8fafc] border-4 border-slate-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col h-full max-h-[600px]">
      
      {/* Header */}
      <div className="bg-slate-900 px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-green-400 text-slate-900 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
          <span className="text-xl font-bold">₹</span>
        </div>
        <div>
          <h2 className="font-black text-xl text-white uppercase tracking-tighter">Transaction Log</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instant Credits & Auto-Debits</p>
        </div>
      </div>

      {/* Content Feed */}
      <div className="p-4 overflow-y-auto bg-slate-50 flex-1 space-y-3">
        {transactions.length === 0 ? (
          <p className="text-center font-bold text-slate-500 py-8">No transactions found.</p>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className={`flex items-center justify-between p-4 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all`}
            >
              {/* Left Side */}
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 shrink-0 border-2 border-slate-900 rounded-xl flex items-center justify-center text-2xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${tx.type === "premium" ? "bg-red-100" : "bg-green-100"}`}>
                  {tx.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-base text-slate-900 tracking-tight truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      {new Date(tx.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                    <span className={`text-[9px] px-1.5 py-[1px] border border-slate-900 rounded-sm font-black uppercase tracking-wider ${tx.type === "premium" ? "bg-slate-200 text-slate-600" : "bg-green-200 text-green-800"}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side (Amount) */}
              <div className="text-right shrink-0 ml-4">
                <p className={`font-black text-lg lg:text-xl tracking-tighter ${tx.type === "premium" ? "text-slate-900" : "text-green-600"}`}>
                  {tx.type === "premium" ? "- " : "+ "}₹{tx.amount.toFixed(0)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
