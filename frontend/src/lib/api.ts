import {
  PremiumRequest,
  PremiumResponse,
  PayoutRequest,
  PayoutResponse,
  DashboardData,
  PolicyActivationRequest,
  MassPayoutRequest,
  MassPayoutResponse,
} from "./types";

// --- Custom Error Class ---

export class ApiError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

// --- Generic Request Helper ---

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";
const CLIENT_TIMEOUT_MS = 10000;

async function apiRequest<T>(
  url: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  const { method = "POST", body } = options;

  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(
        err.error || `Request failed with status ${res.status}`,
        res.status
      );
    }

    return res.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }

    throw new ApiError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  } finally {
    clearTimeout(timeout);
  }
}

// --- Typed API Functions ---

export async function fetchPremium(data: PremiumRequest): Promise<PremiumResponse> {
  return apiRequest<PremiumResponse>("/api/premium", {
    body: {
      worker_id: data.worker_id,
      name: data.name,
      phone: data.phone,
      city: data.city,
      delivery_platform: data.delivery_platform,
    },
  });
}

export async function fetchPayout(data: PayoutRequest): Promise<PayoutResponse> {
  return apiRequest<PayoutResponse>("/api/payout", { body: data });
}

export async function fetchMassPayout(data: MassPayoutRequest): Promise<MassPayoutResponse> {
  return apiRequest<MassPayoutResponse>("/api/simulate-mass", { body: data });
}

export async function fetchWorkerDashboard(workerId: string): Promise<DashboardData> {
  return apiRequest<DashboardData>(
    `/api/workers?worker_id=${encodeURIComponent(workerId)}`,
    { method: "GET" }
  );
}

export async function activatePolicy(data: PolicyActivationRequest): Promise<{ status: string; policy_id: string; payment_id: string }> {
  return apiRequest<{ status: string; policy_id: string; payment_id: string }>("/api/activate", { body: data });
}
