import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayout extends Document {
  payout_id: string;
  worker_id: string;
  disruption_id: string;
  amount: number;
  status: "simulated" | "completed";
  cargo_spoiled: boolean;
  decay_index: number;
  timestamp: Date;
}

const PayoutSchema = new Schema<IPayout>({
  payout_id: { type: String, required: true, unique: true, index: true },
  worker_id: { type: String, required: true, index: true },
  disruption_id: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["simulated", "completed"], default: "simulated" },
  cargo_spoiled: { type: Boolean, default: false },
  decay_index: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

export const Payout: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>("Payout", PayoutSchema);
