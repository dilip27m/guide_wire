import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * NEW MODEL — ALIGNED WITH ai_service.py — collection: "live_locations"
 *
 * ai_service.py uses:
 *   live_locations_collection = database["live_locations"]
 *
 *   READ in get_active_riders_from_db():
 *     find({"status": "ACTIVE"})
 *     → rider['lat'], rider['lon'], rider.get('location_name'), rider['rider_id']
 *
 *   READ in /get-payout:
 *     find_one({"rider_id": req.worker_id})
 *     → loc_data["lat"], loc_data["lon"], loc_data.get("status") == "ACTIVE"
 *
 *   WRITTEN in /ping-location:
 *     update_one({"rider_id": req.worker_id}, {$set: {lat, lon, location_name, status:"ACTIVE", last_ping}}, upsert=True)
 */
export interface ILiveLocation extends Document {
  rider_id: string;          // ai_service.py: find({"rider_id": ...})
  lat: number;               // ai_service.py: rider['lat']
  lon: number;               // ai_service.py: rider['lon']
  location_name: string;     // ai_service.py: rider.get('location_name', 'Bangalore')
  status: "ACTIVE" | "INACTIVE"; // ai_service.py: find({"status": "ACTIVE"})
  last_ping: Date;           // ai_service.py: "last_ping": datetime.now()
}

const LiveLocationSchema = new Schema<ILiveLocation>(
  {
    rider_id: { type: String, required: true, unique: true, index: true },
    lat: { type: Number, required: true, default: 12.9716 },
    lon: { type: Number, required: true, default: 77.5946 },
    location_name: { type: String, default: "Unknown" },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    last_ping: { type: Date, default: Date.now },
  },
  {
    // CRITICAL: exact collection name from ai_service.py
    collection: "live_locations",
  }
);

export const LiveLocation: Model<ILiveLocation> =
  mongoose.models.LiveLocation ||
  mongoose.model<ILiveLocation>("LiveLocation", LiveLocationSchema);
