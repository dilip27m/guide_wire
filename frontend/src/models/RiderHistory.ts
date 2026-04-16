import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * NEW MODEL — ALIGNED WITH ai_service.py — collection: "rider_history"
 *
 * ai_service.py uses:
 *   history_collection = database["rider_history"]
 *
 *   READ in get_weekly_forecast(worker_id):
 *     find({"rider_id": worker_id}).sort("week_end_date", 1).limit(52)
 *     → df['earnings']  (required column)
 *     → df['earnings'].tail(14).mean()  (recent 14 weeks trend)
 *
 *   READ in /get-payout (claims_task):
 *     count_documents({
 *       "rider_id": req.worker_id,
 *       "status": "PAID",
 *       "timestamp": {"$gte": datetime.now() - timedelta(days=365)}
 *     })
 *     → claims_last_12m fraud feature
 */
export interface IRiderHistory extends Document {
  rider_id: string;         // ai_service.py: find({"rider_id": worker_id})
  week_end_date: Date;      // ai_service.py: sort("week_end_date", 1)
  earnings: number;         // ai_service.py: df['earnings'] — weekly earnings in ₹
  status: "PAID" | "PENDING" | "SKIPPED"; // ai_service.py: count_documents({"status": "PAID"})
  timestamp: Date;          // ai_service.py: timestamp >= now - 365 days filter
}

const RiderHistorySchema = new Schema<IRiderHistory>(
  {
    rider_id: { type: String, required: true, index: true },
    week_end_date: { type: Date, required: true, index: true },
    earnings: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PAID", "PENDING", "SKIPPED"],
      default: "PAID",
    },
    timestamp: { type: Date, default: Date.now },
  },
  {
    // CRITICAL: exact collection name from ai_service.py
    collection: "rider_history",
  }
);

// Compound index for efficient weekly forecast queries
RiderHistorySchema.index({ rider_id: 1, week_end_date: 1 });

export const RiderHistory: Model<IRiderHistory> =
  mongoose.models.RiderHistory ||
  mongoose.model<IRiderHistory>("RiderHistory", RiderHistorySchema);
