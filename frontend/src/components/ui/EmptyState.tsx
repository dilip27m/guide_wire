"use client";

import { useRouter } from "next/navigation";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel = "Go to Onboarding →",
  actionHref = "/",
}: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className="py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-slate-400 mb-6">{description}</p>
      <button
        onClick={() => router.push(actionHref)}
        className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all"
      >
        {actionLabel}
      </button>
    </div>
  );
}
