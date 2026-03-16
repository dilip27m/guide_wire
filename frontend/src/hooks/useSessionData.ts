"use client";

import { useEffect, useState } from "react";
import { PremiumResponse, WorkerData } from "@/lib/types";

interface SessionData {
  premiumData: PremiumResponse | null;
  workerData: WorkerData | null;
  isLoaded: boolean;
}

/**
 * Reads premiumData and workerData from sessionStorage on mount.
 * Returns { premiumData, workerData, isLoaded }.
 */
export function useSessionData(): SessionData {
  const [premiumData, setPremiumData] = useState<PremiumResponse | null>(null);
  const [workerData, setWorkerData] = useState<WorkerData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const pd = sessionStorage.getItem("premiumData");
      const wd = sessionStorage.getItem("workerData");
      if (pd && wd) {
        setPremiumData(JSON.parse(pd));
        setWorkerData(JSON.parse(wd));
      }
    } catch (err) {
      console.error("Failed to parse session data:", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  return { premiumData, workerData, isLoaded };
}

/**
 * Saves premium and worker data to sessionStorage.
 */
export function saveSessionData(
  premiumData: PremiumResponse,
  workerData: WorkerData
): void {
  sessionStorage.setItem("premiumData", JSON.stringify(premiumData));
  sessionStorage.setItem("workerData", JSON.stringify(workerData));
}
