// --- Request Types ---

export interface PremiumRequest {
  city: string;
  worker_id: string;
  delivery_platform: string;
}

export interface PayoutRequest {
  disruption_id: string;
  duration_hrs: number;
  cargo_type: string;
  forecasted_income: number;
  hourly_rate: number;
  ambient_temp: number;
}

// --- Response Types ---

export interface PremiumResponse {
  status: string;
  forecasted_income: number;
  risk_index: number;
  premium_to_collect: number;
  hourly_rate: number;
  ambient_temp: number;
}

export interface PayoutResponse {
  disruption_id: string;
  payout_amount: number;
  cargo_spoiled: boolean;
  decay_index: number;
  timestamp: string;
}

// --- UI Types ---

export interface WorkerData {
  city: string;
  worker_id: string;
  delivery_platform: string;
}

export type DisruptionType = "heavy_rain" | "heatwave" | "strike" | "pollution";

export interface DisruptionScenario {
  type: DisruptionType;
  label: string;
  icon: string;
  duration_hrs: number;
  cargo_type: string;
  ambient_temp: number;
  description: string;
}
