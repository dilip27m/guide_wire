"use client";

import { useState, useEffect } from "react";
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
    // Simulate payment processing delay
    setTimeout(() => {
      const mockPaymentId = `PAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      setStatus("success");
      setTimeout(() => {
        onSuccess(mockPaymentId);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Secure Payment</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/5">
            <p className="text-slate-400 text-sm mb-1">Total Premium</p>
            <p className="text-4xl font-bold text-white">₹{premiumData.premium_to_collect.toFixed(2)}</p>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-sm">
              <span className="text-slate-500">Coverage Duration</span>
              <span className="text-slate-300 font-medium">7 Days</span>
            </div>
          </div>

          {status === "idle" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                <span className="text-xl">💳</span>
                <p className="text-sm text-blue-300">
                  This is a mock payment gateway for demo purposes. No real money will be charged.
                </p>
              </div>
              <button
                onClick={handlePay}
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                Pay Now
              </button>
            </div>
          )}

          {status === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Spinner size="lg" />
              <p className="mt-6 text-lg font-medium text-white">Processing Transaction...</p>
              <p className="mt-2 text-slate-400 text-sm">Verifying with delivery platform bank</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                <span className="text-4xl text-emerald-400">✓</span>
              </div>
              <p className="text-2xl font-bold text-white">Payment Successful!</p>
              <p className="mt-2 text-emerald-400/80 font-medium">Policy Activating...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
