import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * ALIGNED WITH ai_service.py — collection: "delivery_partners"
 *
 * ai_service.py uses:
 *   partners_collection = database["delivery_partners"]
 *   find_one({"partner_id": worker_id})
 *   partner.get("city_name", "Bangalore")
 *   partner.get("lat", 12.9716)
 *   partner.get("lon", 77.5946)
 *   partner.get("asset_value", 85000)
 *   partner.get("coverage_tier", 2)
 *   partner.get("onboarding_date", ...)
 *   partner.get("vehicle_registration_date", ...)
 *   partner.get("phone", "")
 */
export interface IWorker extends Document {
  partner_id: string;         // ai_service.py: find_one({"partner_id": worker_id})
  name: string;
  phone: string;              // ai_service.py: used for num_policies_same_phone fraud feature
  platform: string;
  delivery_platform: string;
  city_name: string;          // ai_service.py: partner.get("city_name", "Bangalore")
  assigned_zone: string;
  lat: number;                // ai_service.py: partner.get("lat", 12.9716)
  lon: number;                // ai_service.py: partner.get("lon", 77.5946)
  asset_value: number;        // ai_service.py: partner.get("asset_value", 85000) → overinsurance_ratio
  coverage_tier: number;      // ai_service.py: partner.get("coverage_tier", 2) → premium multiplier
  onboarding_date: Date;      // ai_service.py: days_since_purchase fraud feature
  vehicle_registration_date: Date; // ai_service.py: vehicle_age_yrs fraud feature
  created_at: Date;
}

const WorkerSchema = new Schema<IWorker>(
  {
    partner_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    platform: { type: String, required: true },
    delivery_platform: { type: String, default: "" },
    city_name: { type: String, required: true },          // was "city" — now matches ai_service.py
    assigned_zone: { type: String, default: "default" },
    lat: { type: Number, default: 12.9716 },              // Bangalore default
    lon: { type: Number, default: 77.5946 },              // Bangalore default
    asset_value: { type: Number, default: 85000 },        // Vehicle + equipment value
    coverage_tier: { type: Number, default: 2 },          // 1=basic, 2=standard, 3=premium
    onboarding_date: { type: Date, default: Date.now },
    vehicle_registration_date: {
      type: Date,
      default: () => new Date(Date.now() - 2.5 * 365 * 24 * 60 * 60 * 1000), // 2.5 years ago
    },
    created_at: { type: Date, default: Date.now },
  },
  {
    // CRITICAL: map to the exact collection name ai_service.py uses
    collection: "delivery_partners",
  }
);

export const Worker: Model<IWorker> =
  mongoose.models.Worker || mongoose.model<IWorker>("Worker", WorkerSchema);
