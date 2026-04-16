"use client";

import { useEffect, useState } from "react";

interface PayoutReceiptModalProps {
  isOpen: boolean;
  amount: number;
  workerId: string;
  weekLabel?: string;
  payoutCount?: number;
  onClose: () => void;
}

type Stage = "initiating" | "processing" | "credited";

/**
 * PayoutReceiptModal — Mock UPI/IMPS payout credit animation.
 *
 * Fulfills the hackathon Phase 3 requirement:
 * "Integrate mock payment gateways (Razorpay, Stripe, or UPI simulators)
 *  to demonstrate how the worker receives their lost wages instantly."
 *
 * Simulates a 3-step bank transfer animation:
 *   1. Initiating Transfer
 *   2. Processing via IMPS/UPI
 *   3. ₹XXX Credited to Account ✓
 */
export default function PayoutReceiptModal({
  isOpen,
  amount,
  workerId,
  weekLabel,
  payoutCount = 1,
  onClose,
}: PayoutReceiptModalProps) {
  const [stage, setStage]       = useState<Stage>("initiating");
  const [visible, setVisible]   = useState(false);

  // Masked account number derived from workerId for realism
  const maskedAccount = `XXXX${workerId.replace(/[^0-9]/g, "").slice(-4).padStart(4, "9")}`;
  const upiId = `${workerId.toLowerCase().replace(/[^a-z0-9]/g, "")}@dashsure`;
  const txnRef = `TXN${Date.now().toString().slice(-8)}`;

  useEffect(() => {
    if (!isOpen) {
      setStage("initiating");
      setVisible(false);
      return;
    }
    setVisible(true);

    // Stage progression: initiating → processing → credited
    const t1 = setTimeout(() => setStage("processing"), 1500);
    const t2 = setTimeout(() => setStage("credited"),   3200);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center
        transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      onClick={stage === "credited" ? onClose : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        className={`relative w-full sm:max-w-sm bg-white border-4 border-slate-900
          rounded-t-3xl sm:rounded-3xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]
          overflow-hidden transition-all duration-500
          ${isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
      >
        {/* Header Band */}
        <div className="bg-slate-900 px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-400 border-2 border-white flex items-center justify-center shadow">
              <span className="text-xl">💸</span>
            </div>
            <div>
              <p className="text-white font-black uppercase tracking-widest text-xs">DashSure Pay</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Instant Wage Protection</p>
            </div>
          </div>
          <div className="px-2 py-1 bg-green-400 border-2 border-white rounded-md">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">UPI / IMPS</p>
          </div>
        </div>

        {/* Amount Display */}
        <div className="px-6 pt-6 pb-4 text-center border-b-4 border-slate-900 bg-slate-50">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Amount Transferred</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-4xl font-black text-slate-900">₹</span>
            <span
              className={`text-5xl font-black tracking-tighter transition-all duration-700
                ${stage === "credited" ? "text-green-600 scale-110" : "text-slate-900"}`}
            >
              {amount.toFixed(2)}
            </span>
          </div>
          {payoutCount > 1 && (
            <p className="text-xs font-bold text-slate-500 mt-1">
              ({payoutCount} claims settled this week)
            </p>
          )}
          {weekLabel && (
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              {weekLabel}
            </p>
          )}
        </div>

        {/* Transfer Progress */}
        <div className="px-6 py-5">

          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-6">
            {(["initiating", "processing", "credited"] as Stage[]).map((s, idx) => {
              const labels = ["Initiating", "Processing", "Credited"];
              const icons  = ["📤", "⚡", "✅"];
              const isDone    = stage === "credited" || (stage === "processing" && idx === 0);
              const isCurrent = stage === s;
              return (
                <div key={s} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-lg
                      transition-all duration-500
                      ${isDone ? "bg-green-400 border-green-600 scale-110 shadow-[0_0_12px_rgba(74,222,128,0.7)]"
                        : isCurrent ? "bg-[#fde047] border-slate-900 animate-pulse"
                        : "bg-slate-100 border-slate-300"}`}
                  >
                    {icons[idx]}
                  </div>
                  <p className={`text-[9px] font-black uppercase tracking-widest
                    ${isCurrent ? "text-slate-900" : isDone ? "text-green-600" : "text-slate-400"}`}>
                    {labels[idx]}
                  </p>
                  {idx < 2 && (
                    <div className={`absolute hidden`} /> // connector handled by flex gap
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-slate-100 border-2 border-slate-900 rounded-full overflow-hidden mb-5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-in-out
                ${stage === "credited"
                  ? "bg-green-500 w-full shadow-[0_0_10px_rgba(74,222,128,0.8)]"
                  : stage === "processing"
                  ? "bg-[#fde047] w-[55%]"
                  : "bg-slate-400 w-[15%]"}`}
            />
          </div>

          {/* Status Message */}
          <div
            key={stage}
            className={`rounded-xl border-2 border-slate-900 p-3 mb-4 transition-all
              ${stage === "credited"
                ? "bg-green-50 shadow-[2px_2px_0px_0px_rgba(74,222,128,1)]"
                : "bg-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.3)]"}`}
          >
            {stage === "initiating" && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-yellow-500" />
                </span>
                <p className="text-xs font-black uppercase tracking-widest text-slate-700">
                  Initiating transfer to your account…
                </p>
              </div>
            )}
            {stage === "processing" && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                </span>
                <p className="text-xs font-black uppercase tracking-widest text-slate-700">
                  Processing via IMPS / UPI Rail…
                </p>
              </div>
            )}
            {stage === "credited" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-600 text-base">✅</span>
                  <p className="text-sm font-black uppercase tracking-widest text-green-700">
                    ₹{amount.toFixed(2)} Credited!
                  </p>
                </div>
                <p className="text-[10px] font-bold text-slate-500">
                  To: {maskedAccount} · UPI: {upiId}
                </p>
                <p className="text-[10px] font-bold text-slate-400">Ref: {txnRef}</p>
              </div>
            )}
          </div>

          {/* Bank Info Row */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">From</p>
              <p className="text-xs font-black text-slate-900">DashSure Pool A/C</p>
              <p className="text-[9px] text-slate-500">HDFC Bank · NEFT</p>
            </div>
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">To</p>
              <p className="text-xs font-black text-slate-900">A/C {maskedAccount}</p>
              <p className="text-[9px] text-slate-500">Linked Bank · IMPS</p>
            </div>
          </div>

          {/* Close Button — only shows when credited */}
          {stage === "credited" && (
            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-xl font-black uppercase tracking-wider text-sm
                text-white bg-green-600 border-4 border-slate-900
                hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]
                active:translate-y-1 active:shadow-none transition-all duration-200
                shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            >
              Done ✓
            </button>
          )}

          {/* Disclaimer */}
          <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest mt-3">
            This is a hackathon simulation · Not a real bank transfer
          </p>
        </div>
      </div>
    </div>
  );
}
