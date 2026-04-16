// --- Request Types ---

export interface PremiumRequest {
  worker_id: string;
  name: string;
  phone: string;
  city: string;
  delivery_platform: string;
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

export interface MassPayoutRequest {
  city: string;
  disruption_type: string;
  duration_hrs: number;
  cargo_type: string;
}

export interface PolicyActivationRequest {
  worker_id: string;
  payment_id: string;
  premium_to_collect: number;
  risk_index: number;
  forecasted_income: number;
}

/** Sent to POST /api/ping-location (and forwarded to ai_service.py /ping-location) */
export interface LocationPingRequest {
  worker_id: string;
  lat: number;
  lon: number;
  location_name?: string;
}

// --- Response Types ---

export interface PremiumResponse {
  status: string;
  forecasted_income: number;
  risk_index: number;
  premium_to_collect: number;
  hourly_rate: number;
  ambient_temp: number;
  platform?: string;
  city?: string;
  worker_id?: string;
  policy_id?: string;
  already_active?: boolean;
}

export interface PayoutResponse {
  disruption_id: string;
  payout_amount: number;
  cargo_spoiled: boolean;
  decay_index: number;
  timestamp: string;
  payout_id?: string;
}

export interface MassPayoutResponse {
  disruption_id: string;
  affected_riders: number;
  payout_amount_per_rider: number;
  total_payout_amount: number;
}

// --- UI Types ---

export interface WorkerData {
  worker_id: string;
  name: string;
  phone: string;
  city: string;
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

// --- Database Types (for API responses from Next.js API routes) ---
// NOTE: field names here reflect what the Mongoose models return,
//       which are now aligned with ai_service.py collection schemas.

export interface IWorkerData {
  partner_id: string;          // was worker_id — aligned with delivery_partners
  name: string;
  phone: string;
  platform: string;
  city_name: string;           // was city — aligned with ai_service.py
  assigned_zone: string;
  lat: number;                 // NEW — ai_service.py GPS features
  lon: number;                 // NEW — ai_service.py GPS features
  asset_value: number;         // NEW — ai_service.py overinsurance_ratio
  coverage_tier: number;       // NEW — ai_service.py premium multiplier
  onboarding_date: string;     // NEW — ai_service.py days_since_purchase
  vehicle_registration_date: string; // NEW — ai_service.py vehicle_age_yrs
  created_at: string;
}

export interface IPolicyData {
  policy_id: string;
  rider_id: string;            // was worker_id — aligned with active_policies
  weekly_income_prediction: number;
  premium_paid: number;
  risk_index: number;
  coverage_amount: number;     // NEW — ai_service.py overinsurance_ratio
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED"; // uppercase — aligned with ai_service.py
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

export interface ILiveLocationData {
  rider_id: string;
  lat: number;
  lon: number;
  location_name: string;
  status: "ACTIVE" | "INACTIVE";
  last_ping: string;
}

export interface IRiderHistoryData {
  rider_id: string;
  week_end_date: string;
  earnings: number;
  status: "PAID" | "PENDING" | "SKIPPED";
  timestamp: string;
}

export interface DashboardData {
  worker: IWorkerData;
  policy: IPolicyData | null;
  policies: IPolicyData[];
  payouts: IPayoutData[];
}
