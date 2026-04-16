import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * ALIGNED WITH ai_service.py — collection: "active_policies"
 *
 * ai_service.py uses:
 *   policies_collection = database["active_policies"]
 *   find_one({"rider_id": req.worker_id, "status": "ACTIVE"})
 *   policy.get("coverage_amount", 50000) → overinsurance_ratio fraud feature
 */
export interface IPolicy extends Document {
  policy_id: string;
  rider_id: string;             // ai_service.py: find_one({"rider_id": req.worker_id, ...})
  weekly_income_prediction: number;
  premium_paid: number;
  risk_index: number;
  coverage_amount: number;      // ai_service.py: policy.get("coverage_amount", 50000)
  start_date: Date;
  end_date: Date;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED"; // ai_service.py: status == "ACTIVE" (uppercase)
  payment_id: string;
}

const PolicySchema = new Schema<IPolicy>(
  {
    policy_id: { type: String, required: true, unique: true, index: true },
    rider_id: { type: String, required: true, index: true },      // was "worker_id"
    weekly_income_prediction: { type: Number, required: true },
    premium_paid: { type: Number, required: true },
    risk_index: { type: Number, required: true },
    coverage_amount: { type: Number, default: 50000 },            // ai_service.py default
    start_date: { type: Date, default: Date.now },
    end_date: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    },
    // CRITICAL: uppercase to match ai_service.py's find_one({"status": "ACTIVE"})
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "CANCELLED"],
      default: "ACTIVE",
    },
    payment_id: { type: String, required: true },
  },
  {
    // CRITICAL: map to the exact collection name ai_service.py uses
    collection: "active_policies",
  }
);

export const Policy: Model<IPolicy> =
  mongoose.models.Policy || mongoose.model<IPolicy>("Policy", PolicySchema);
