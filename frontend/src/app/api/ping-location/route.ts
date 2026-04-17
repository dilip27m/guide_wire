import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LiveLocation } from "@/models/LiveLocation";

/**
 * POST /api/ping-location
 *
 * Upserts GPS location for a rider into the live_locations collection.
 * This is the Next.js counterpart to ai_service.py's POST /ping-location endpoint.
 *
 * ai_service.py uses live_locations_collection to:
 *   1. Find active riders for the oracle monitoring loop
 *   2. Calculate gps_dist_from_event_km fraud feature in /get-payout
 *   3. Check was_delivering_at_event fraud feature in /get-payout
 *
 * Body: { worker_id, lat, lon, location_name? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { worker_id, lat, lon, location_name, pings } = body;

  if (!worker_id) {
    return NextResponse.json(
      { error: "worker_id is required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    let finalLat = lat;
    let finalLon = lon;
    
    if (pings && pings.length > 0) {
      const lastPing = pings[pings.length - 1];
      finalLat = lastPing.lat;
      finalLon = lastPing.lon;
    }

    if (finalLat !== undefined && finalLon !== undefined) {
      await LiveLocation.findOneAndUpdate(
        { rider_id: worker_id },
        {
          rider_id:      worker_id,
          lat:           finalLat,
          lon:           finalLon,
          location_name: location_name || "Unknown",
          status:        "ACTIVE",
          last_ping:     new Date(),
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({
      status:  "success",
      message: `GPS location logged for ${worker_id}`,
    });
  } catch (error) {
    console.error("[ping-location] Error:", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}
