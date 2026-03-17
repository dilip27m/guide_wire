// --- Request Types ---

export interface PremiumRequest {
  worker_id: string;
}

export interface PayoutRequest {
  disruption_id: string;
  disruption_type: string;
  duration_hrs: number;
  cargo_type: string;
  forecasted_income: number;
  hourly_rate: number;
  ambient_temp: number;
  worker_id: string;
  city: string;
}

// --- Response Types ---
export interface PolicyActivationRequest {
  worker_id: string;
  payment_id: string;
  premium_to_collect: number;
  risk_index: number;
  forecasted_income: number;
}

export interface PremiumResponse {
  status: string;
  forecasted_income: number;
  risk_index: number;
  premium_to_collect: number;
  hourly_rate: number;
  ambient_temp: number;
  worker_id?: string;
  policy_id?: string;
}

export interface PayoutResponse {
  disruption_id: string;
  payout_amount: number;
  cargo_spoiled: boolean;
  decay_index: number;
  timestamp: string;
  payout_id?: string;
}

// --- UI Types ---

export interface WorkerData {
  worker_id: string;
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

// --- Database Types (for API responses) ---

export interface IWorkerData {
  worker_id: string;
  platform: string;
  city: string;
  assigned_zone: string;
  created_at: string;
}

export interface IPolicyData {
  policy_id: string;
  worker_id: string;
  weekly_income_prediction: number;
  premium_paid: number;
  risk_index: number;
  start_date: string;
  end_date: string;
  status: "active" | "expired" | "cancelled";
}

export interface IPayoutData {
  payout_id: string;
  worker_id: string;
  disruption_id: string;
  amount: number;
  status: "simulated" | "completed";
  cargo_spoiled: boolean;
  decay_index: number;
  timestamp: string;
}

export interface DashboardData {
  worker: IWorkerData;
  policy: IPolicyData | null;
  payouts: IPayoutData[];
}
