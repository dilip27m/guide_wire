import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWorker extends Document {
  worker_id: string;
  name: string;
  phone: string;
  platform: string;
  delivery_platform: string;
  city: string;
  assigned_zone: string;
  created_at: Date;
}

const WorkerSchema = new Schema<IWorker>({
  worker_id: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: "" },
  phone: { type: String, default: "" },
  platform: { type: String, required: true },
  delivery_platform: { type: String, default: "" },
  city: { type: String, required: true },
  assigned_zone: { type: String, default: "default" },
  created_at: { type: Date, default: Date.now },
});

export const Worker: Model<IWorker> =
  mongoose.models.Worker || mongoose.model<IWorker>("Worker", WorkerSchema);
