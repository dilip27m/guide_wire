import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDisruption extends Document {
  disruption_id: string;
  type: string;
  zone: string;
  city: string;
  trigger_source: string;
  timestamp: Date;
}

const DisruptionSchema = new Schema<IDisruption>({
  disruption_id: { type: String, required: true, unique: true, index: true },
  type: { type: String, required: true },
  zone: { type: String, default: "default" },
  city: { type: String, required: true },
  trigger_source: { type: String, default: "simulation" },
  timestamp: { type: Date, default: Date.now },
});

export const Disruption: Model<IDisruption> =
  mongoose.models.Disruption || mongoose.model<IDisruption>("Disruption", DisruptionSchema);
