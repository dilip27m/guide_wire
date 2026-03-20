"use client";
import { useState } from "react";
import { IPolicyData, IPayoutData } from "@/lib/types";

interface PaymentHistoryCardProps {
  policies: IPolicyData[];
  payouts: IPayoutData[];
}

// --- Disruption type → human-readable label + icon ---
const DISRUPTION_META: Record<string, { label: string; icon: string; color: string }> = {
  heavy_rain: { label: "Heavy Rain",      icon: "🌧️", color: "bg-blue-100" },
  heatwave:   { label: "Heatwave",        icon: "🔥", color: "bg-orange-100" },
  strike:     { label: "Strike / Bandh",  icon: "✊", color: "bg-red-100" },
  pollution:  { label: "Pollution Spike", icon: "🏭", color: "bg-purple-100" },
};

function getDisruptionMeta(disruption_id: string) {
  const type = disruption_id.split("_")[0];
  return DISRUPTION_META[type] || { label: disruption_id, icon: "⚠️", color: "bg-slate-100" };
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  // Start of ISO week (Monday)
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function groupByWeek(payouts: IPayoutData[]): { weekLabel: string; items: IPayoutData[] }[] {
  const map = new Map<string, IPayoutData[]>();
  for (const p of payouts) {
    const label = getWeekLabel(p.timestamp);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(p);
  }
  // Most recent week first
  return Array.from(map.entries())
    .map(([weekLabel, items]) => ({ weekLabel, items }))
    .reverse();
}

// --- Weekly Bill Card ---
function WeeklyBill({ weekLabel, items }: { weekLabel: string; items: IPayoutData[] }) {
  const total = items.reduce((sum, p) => sum + p.amount, 0);
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white border-4 border-slate-900 rounded-xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
      {/* Bill Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 text-white hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🗓️</span>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Week</p>
            <p className="text-sm font-black uppercase tracking-tight">{weekLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Payout</p>
            <p className="text-lg font-black text-green-400">+₹{total.toFixed(2)}</p>
          </div>
          <span className="text-slate-400 font-black text-lg">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Line Items */}
      {open && (
        <div className="divide-y-2 divide-slate-900">
          {items.map((p, idx) => {
            const meta = getDisruptionMeta(p.disruption_id);
            return (
              <div key={p.payout_id || idx} className={`flex items-center gap-4 px-5 py-4 ${meta.color}`}>
                <div className="w-10 h-10 shrink-0 border-2 border-slate-900 rounded-lg bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <span className="text-xl">{meta.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-slate-900 uppercase tracking-tight truncate">
                    {meta.label}
                  </p>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                    {new Date(p.timestamp).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="font-black text-base text-green-700 shrink-0">
                  +₹{p.amount.toFixed(2)}
                </span>
              </div>
            );
          })}

          {/* Bill Footer / Sum Line */}
          <div className="flex items-center justify-between px-5 py-4 bg-[#fde047] border-t-4 border-slate-900">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <p className="font-black text-sm text-slate-900 uppercase tracking-tight">
                Week Total — {items.length} Claim{items.length !== 1 ? "s" : ""}
              </p>
            </div>
            <p className="font-black text-xl text-slate-900">₹{total.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---
export default function PaymentHistoryCard({ policies, payouts }: PaymentHistoryCardProps) {
  const [activeTab, setActiveTab] = useState<"payments" | "payouts">("payments");
  const weeklyGroups = groupByWeek(payouts);

  return (
    <div className="bg-[#f8fafc] border-4 border-slate-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col h-full max-h-[600px]">
      {/* Header Tabs */}
      <div className="flex border-b-4 border-slate-900 bg-white shrink-0">
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex-1 py-4 text-center font-black text-lg uppercase tracking-wider transition-colors border-r-4 border-slate-900 ${
            activeTab === "payments" ? "bg-slate-900 text-white" : "bg-white text-slate-900 hover:bg-slate-100"
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`flex-1 py-4 text-center font-black text-lg uppercase tracking-wider transition-colors ${
            activeTab === "payouts" ? "bg-red-600 text-white" : "bg-white text-slate-900 hover:bg-red-50"
          }`}
        >
          Payouts
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto bg-slate-50 flex-1 space-y-4">

        {/* ── PAYMENTS TAB ── */}
        {activeTab === "payments" && (
          <>
            {policies.length === 0 ? (
              <p className="text-center font-bold text-slate-500 py-8">No payments found.</p>
            ) : (
              policies.map((policy) => (
                <div
                  key={policy.policy_id}
                  className="bg-white border-2 border-slate-900 p-4 rounded-lg shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900 truncate pr-2">{policy.policy_id}</span>
                    <span className="shrink-0 font-black text-lg text-slate-900">₹{policy.premium_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                    <span>{new Date(policy.start_date).toLocaleDateString()}</span>
                    <span className="px-2 py-0.5 border-2 border-slate-900 rounded bg-green-200 text-slate-900 text-xs uppercase tracking-wide">
                      {policy.status === "active" ? "Active" : "Completed"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── PAYOUTS TAB ── */}
        {activeTab === "payouts" && (
          <>
            {weeklyGroups.length === 0 ? (
              <p className="text-center font-bold text-slate-500 py-8">No payouts found.</p>
            ) : (
              weeklyGroups.map((g) => (
                <WeeklyBill key={g.weekLabel} weekLabel={g.weekLabel} items={g.items} />
              ))
            )}
          </>
        )}

      </div>
    </div>
  );
}
