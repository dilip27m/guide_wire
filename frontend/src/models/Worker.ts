import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWorker extends Document {
  worker_id: string;
  platform: string;
  city: string;
  assigned_zone: string;
  created_at: Date;
}

const WorkerSchema = new Schema<IWorker>({
  worker_id: { type: String, required: true, unique: true, index: true },
  platform: { type: String, required: true },
  city: { type: String, required: true },
  assigned_zone: { type: String, default: "default" },
  created_at: { type: Date, default: Date.now },
});

export const Worker: Model<IWorker> =
  mongoose.models.Worker || mongoose.model<IWorker>("Worker", WorkerSchema);
