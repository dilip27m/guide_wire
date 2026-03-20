"use client";

import { useState } from "react";
import { WorkerData } from "@/lib/types";
import Spinner from "@/components/ui/Spinner";

interface WorkerFormProps {
  onSubmit: (data: WorkerData) => void;
  loading: boolean;
}

export default function WorkerForm({ onSubmit, loading }: WorkerFormProps) {
  const [workerId, setWorkerId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId.trim()) return;
    onSubmit({ worker_id: workerId.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Worker ID */}
      <div className="relative group">
        <label htmlFor="worker-id" className="absolute -top-3 left-4 px-2 bg-white text-xs font-black uppercase tracking-widest text-slate-900 z-10 transition-colors group-focus-within:text-red-600">
          Worker ID
        </label>
        <input
          id="worker-id"
          type="text"
          placeholder="e.g. WRK-1042"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          required
          className="relative w-full px-5 py-4 sm:py-5 rounded-xl bg-white border-4 border-slate-900 text-slate-900 text-lg font-black uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:bg-yellow-50 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all"
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

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !workerId.trim()}
        className="relative w-full py-4 sm:py-5 px-6 rounded-xl font-black uppercase tracking-widest text-xl text-white bg-slate-900 border-4 border-slate-900 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none active:translate-y-1 active:shadow-none transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]"
      >
        <span className="relative flex items-center justify-center gap-2">
          {loading ? (
            <>
              <Spinner size="sm" />
              Calculating Quote...
            </>
          ) : (
            "Calculate Quote →"
          )}
        </span>
      </button>
    </form>
  );
}
