"use client";

import { useState } from "react";
import { WorkerData } from "@/lib/types";
import { CITIES, PLATFORMS } from "@/lib/constants";
import Spinner from "@/components/ui/Spinner";

interface WorkerFormProps {
  onSubmit: (data: WorkerData) => void;
  loading: boolean;
}

export default function WorkerForm({ onSubmit, loading }: WorkerFormProps) {
  const [workerId, setWorkerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState<string>(CITIES[0]);
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);

  const isValid = workerId.trim().length > 2 && name.trim().length > 1 && phone.trim().length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      worker_id: workerId.trim(),
      name: name.trim(),
      phone: phone.trim(),
      city,
      delivery_platform: platform,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      {/* Worker ID */}
      <div className="relative group">
        <label htmlFor="worker-id" className="absolute -top-3 left-4 px-2 bg-white text-xs font-black uppercase tracking-widest text-slate-900 z-10 transition-colors group-focus-within:text-red-600">
          Platform Worker ID
        </label>
        <input
          id="worker-id"
          type="text"
          placeholder="Your Swiggy / Zomato ID"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          required
          className="relative w-full px-5 py-4 rounded-xl bg-white border-4 border-slate-900 text-slate-900 text-base font-bold uppercase tracking-wider placeholder-slate-400 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:bg-yellow-50 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all"
        />
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          {workerId.length > 3 && (
            <span className="text-green-600 flex items-center justify-center w-6 h-6 rounded-full bg-green-100 animate-in fade-in zoom-in duration-300 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* City & Platform Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* City */}
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

        {/* Platform */}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !isValid}
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
    </form>
  );
}
