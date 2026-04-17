"use client";

import { useState } from "react";
import { WorkerData } from "@/lib/types";
import { CITIES, PLATFORMS } from "@/lib/constants";
import Spinner from "@/components/ui/Spinner";

interface WorkerFormProps {
  onSubmit: (data: WorkerData) => void;
  onExistingUser?: (dashboardData: any) => void;
  loading: boolean;
}

export default function WorkerForm({ onSubmit, onExistingUser, loading }: WorkerFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [checking, setChecking] = useState(false);

  const [workerId, setWorkerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState<string>(CITIES[0]);
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);
  const [coverageTier, setCoverageTier] = useState<1 | 2 | 3>(2);

  const isValidStep1 = workerId.trim().length > 2;
  const isValidStep2 = name.trim().length > 1 && phone.trim().length >= 10;

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidStep1) return;

    setChecking(true);
    try {
      const res = await fetch(`/api/workers?worker_id=${encodeURIComponent(workerId.trim())}`);
      if (res.ok) {
        const data = await res.json();
        // Worker successfully found, send back the massive payload!
        if (onExistingUser) onExistingUser(data);
      } else {
        // Not found, move to step 2 to register them
        setStep(2);
      }
    } catch (err) {
      console.error("Checking error:", err);
      setStep(2);
    } finally {
      setChecking(false);
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidStep2) return;
    onSubmit({
      worker_id: workerId.trim(),
      name: name.trim(),
      phone: phone.trim(),
      city,
      delivery_platform: platform,
      coverage_tier: coverageTier,
    });
  };

  return (
    <form onSubmit={step === 1 ? handleNextStep : handleFinalSubmit} className="space-y-5">
      
      {/* Worker ID (Always visible) */}
      <div className="relative group focus-within:z-20">
        <label htmlFor="worker-id" className="absolute -top-3 left-4 px-2 bg-white text-xs font-black uppercase tracking-widest text-slate-900 z-10 transition-colors group-focus-within:text-red-600">
          Platform Worker ID
        </label>
        <input
          id="worker-id"
          type="text"
          placeholder="e.g. USR_BLR_1"
          value={workerId}
          disabled={step === 2 || checking || loading}
          onChange={(e) => setWorkerId(e.target.value)}
          required
          className="relative w-full px-5 py-4 rounded-xl bg-white border-4 border-slate-900 text-slate-900 text-base font-bold uppercase tracking-wider placeholder-slate-400 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:bg-yellow-50 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] disabled:bg-slate-50 disabled:text-slate-500 transition-all"
        />
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          {workerId.length > 3 && step === 1 && !checking && (
            <span className="text-green-600 flex items-center justify-center w-6 h-6 rounded-full bg-green-100 animate-in fade-in zoom-in duration-300 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Expanded Fields for Registration (Step 2 Only) */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300 pt-2 border-t-2 border-dashed border-slate-200">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">New user detected. Please register details.</p>
          
          {/* Name */}
          <div className="relative group">
            <label htmlFor="worker-name" className="absolute -top-3 left-4 px-2 bg-white text-xs font-black uppercase tracking-widest text-slate-900 z-10 transition-colors group-focus-within:text-red-600">
              Full Name
            </label>
            <input
              id="worker-name"
              type="text"
              placeholder="e.g. Ravi Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="relative w-full px-5 py-4 rounded-xl bg-white border-4 border-slate-900 text-slate-900 text-base font-bold placeholder-slate-400 focus:outline-none focus:bg-yellow-50 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all"
            />
          </div>

          {/* Phone */}
          <div className="relative group">
            <label htmlFor="worker-phone" className="absolute -top-3 left-4 px-2 bg-white text-xs font-black uppercase tracking-widest text-slate-900 z-10 transition-colors group-focus-within:text-red-600">
              Phone Number
            </label>
            <input
              id="worker-phone"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              required
              pattern="[0-9]{10}"
              className="relative w-full px-5 py-4 rounded-xl bg-white border-4 border-slate-900 text-slate-900 text-base font-bold placeholder-slate-400 focus:outline-none focus:bg-yellow-50 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all"
            />
          </div>

          {/* City & Platform Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative group">
              <label htmlFor="worker-city" className="absolute -top-3 left-4 px-2 bg-white text-xs font-black uppercase tracking-widest text-slate-900 z-10 transition-colors group-focus-within:text-red-600">
                City
              </label>
              <select
                id="worker-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="relative w-full px-4 py-4 rounded-xl bg-white border-4 border-slate-900 text-slate-900 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:bg-yellow-50 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <div className="relative group">
              <label htmlFor="worker-platform" className="absolute -top-3 left-4 px-2 bg-white text-xs font-black uppercase tracking-widest text-slate-900 z-10 transition-colors group-focus-within:text-red-600">
                Platform
              </label>
              <select
                id="worker-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="relative w-full px-4 py-4 rounded-xl bg-white border-4 border-slate-900 text-slate-900 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:bg-yellow-50 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Coverage Tier */}
          <div className="relative group">
            <label className="absolute -top-3 left-4 px-2 bg-white text-xs font-black uppercase tracking-widest text-slate-900 z-10">
              Coverage Tier
            </label>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {([
                { tier: 1 as const, label: "Basic",    desc: "0.8× premium",  color: "bg-blue-100   border-blue-400"  },
                { tier: 2 as const, label: "Standard", desc: "1.0× premium",  color: "bg-yellow-100 border-yellow-400" },
                { tier: 3 as const, label: "Premium",  desc: "1.3× premium",  color: "bg-green-100  border-green-500"  },
              ]).map(({ tier, label, desc, color }) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setCoverageTier(tier)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-4 transition-all font-black text-slate-900 ${
                    coverageTier === tier
                      ? `${color} shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] -translate-y-0.5`
                      : "bg-white border-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs uppercase tracking-widest">{label}</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-0.5">{desc}</span>
                  {coverageTier === tier && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Submit Button */}
      {step === 1 ? (
        <button
          type="submit"
          disabled={checking || loading || !isValidStep1}
          className="relative w-full py-4 sm:py-5 px-6 rounded-xl font-black uppercase tracking-widest text-xl text-white bg-slate-900 border-4 border-slate-900 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(20,83,45,1)] hover:bg-green-700 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none active:translate-y-1 active:shadow-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]"
        >
          <span className="relative flex items-center justify-center gap-2">
            {checking || loading ? (
              <>
                <Spinner size="sm" />
                Validating ID...
              </>
            ) : (
              "Next →"
            )}
          </span>
        </button>
      ) : (
        <button
          type="submit"
          disabled={loading || !isValidStep2}
          className="relative w-full py-4 sm:py-5 px-6 rounded-xl font-black uppercase tracking-widest text-xl text-white bg-slate-900 border-4 border-slate-900 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none active:translate-y-1 active:shadow-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]"
        >
          <span className="relative flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Spinner size="sm" />
                Calculating Quote...
              </>
            ) : (
              "Get Insurance Quote →"
            )}
          </span>
        </button>
      )}
    </form>
  );
}
