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
  const [city, setCity] = useState<string>(CITIES[0]);
  const [workerId, setWorkerId] = useState("");
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId.trim()) return;
    onSubmit({ city, worker_id: workerId.trim(), delivery_platform: platform });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Worker ID */}
      <div>
        <label htmlFor="worker-id" className="block text-sm font-medium text-slate-300 mb-2">
          Worker ID
        </label>
        <input
          id="worker-id"
          type="text"
          placeholder="e.g. WRK-1042"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
        />
      </div>

      {/* City */}
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-2">
          City
        </label>
        <select
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
        >
          {CITIES.map((c) => (
            <option key={c} value={c} className="bg-slate-800 text-white">
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Delivery Platform */}
      <div>
        <label htmlFor="platform" className="block text-sm font-medium text-slate-300 mb-2">
          Delivery Platform
        </label>
        <select
          id="platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p} className="bg-slate-800 text-white">
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !workerId.trim()}
        className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            Calculating Premium...
          </span>
        ) : (
          "Calculate Premium →"
        )}
      </button>
    </form>
  );
}
