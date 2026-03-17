import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPolicy extends Document {
  policy_id: string;
  worker_id: string;
  weekly_income_prediction: number;
  premium_paid: number;
  risk_index: number;
  start_date: Date;
  end_date: Date;
  status: "active" | "expired" | "cancelled";
  payment_id: string;
}

const PolicySchema = new Schema<IPolicy>({
  policy_id: { type: String, required: true, unique: true, index: true },
  worker_id: { type: String, required: true, index: true },
  weekly_income_prediction: { type: Number, required: true },
  premium_paid: { type: Number, required: true },
  risk_index: { type: Number, required: true },
  start_date: { type: Date, default: Date.now },
  end_date: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
  },
  status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
  payment_id: { type: String, required: true },
});

export const Policy: Model<IPolicy> =
  mongoose.models.Policy || mongoose.model<IPolicy>("Policy", PolicySchema);
