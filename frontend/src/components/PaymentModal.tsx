"use client";

import { useState } from "react";
import Spinner from "@/components/ui/Spinner";
import { PremiumResponse } from "@/lib/types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  premiumData: PremiumResponse;
}

export default function PaymentModal({ isOpen, onClose, onSuccess, premiumData }: PaymentModalProps) {
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");

  if (!isOpen) return null;

  const handlePay = () => {
    setStatus("processing");
    setTimeout(() => {
      const mockPaymentId = `PAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      setStatus("success");
      setTimeout(() => {
        onSuccess(mockPaymentId);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80">
      <div className="bg-white border-4 border-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Secure Payment</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-slate-900 text-slate-900 font-black text-lg hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-none transition-all"
            >
              ✕
            </button>
          </div>

          {/* Amount Block */}
          <div className="bg-[#fde047] border-4 border-slate-900 rounded-xl p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-1">Total Premium</p>
            <p className="text-5xl font-black text-slate-900 tracking-tighter">₹{premiumData.premium_to_collect.toFixed(2)}</p>
            <div className="mt-4 pt-4 border-t-2 border-slate-900 flex justify-between text-sm">
              <span className="font-bold text-slate-700 uppercase tracking-wide">Coverage Duration</span>
              <span className="font-black text-slate-900">7 Days</span>
            </div>
          </div>

          {status === "idle" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-100 border-2 border-slate-900 flex gap-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <span className="text-xl">💳</span>
                <p className="text-sm font-bold text-slate-800">
                  Mock payment gateway — demo only. No real money will be charged.
                </p>
              </div>
              <button
                onClick={handlePay}
                className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-xl text-white bg-green-600 border-4 border-slate-900 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-1 active:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              >
                Pay Now
              </button>
            </div>
          )}

          {status === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Spinner size="lg" />
              <p className="mt-6 text-xl font-black uppercase tracking-tighter text-slate-900">Processing...</p>
              <p className="mt-2 text-slate-600 text-sm font-bold uppercase tracking-widest">Verifying with platform bank</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-xl border-4 border-slate-900 bg-green-300 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <span className="text-4xl font-black text-slate-900">✓</span>
              </div>
              <p className="text-2xl font-black uppercase tracking-tighter text-slate-900">Payment Done!</p>
              <p className="mt-2 text-green-700 font-black uppercase tracking-widest text-sm">Policy Activating...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
