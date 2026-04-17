import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { Payout } from "@/models/Payout";
import { Disruption } from "@/models/Disruption";
import { LiveLocation } from "@/models/LiveLocation";
import { RiderHistory } from "@/models/RiderHistory";

/**
 * GET /api/seed
 *
 * Seeds deterministic demo data for 3 specific worker IDs.
 *
 * ALIGNED WITH ai_service.py:
 *   - delivery_partners: partner_id, city_name, lat, lon, asset_value, coverage_tier, onboarding_date, vehicle_registration_date
 *   - active_policies:   rider_id, status "ACTIVE" (uppercase), coverage_amount
 *   - live_locations:    rider_id, lat, lon, status "ACTIVE"
 *   - rider_history:     rider_id, week_end_date, earnings, status "PAID"
 */

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Bangalore: { lat: 12.9716, lon: 77.5946 },
  Mumbai:    { lat: 19.0760, lon: 72.8777 },
  Delhi:     { lat: 28.6139, lon: 77.2090 },
};

const DEMO_WORKERS = [
  { partner_id: "WRK-1042", name: "Ravi Kumar",   phone: "9876543210", platform: "Swiggy",  city: "Bangalore", zone: "Indiranagar" },
  { partner_id: "WRK-2099", name: "Vikram Singh", phone: "8765432109", platform: "Zomato",  city: "Mumbai",    zone: "Bandra" },
  { partner_id: "WRK-3055", name: "Arun Sharma",  phone: "7654321098", platform: "Zepto",   city: "Delhi",     zone: "Connaught Place" },
];

export async function GET() {
  try {
    await connectDB();

    console.log("[seed] Clearing existing demo data...");
    const ids = DEMO_WORKERS.map((w) => w.partner_id);
    await Worker.deleteMany({ partner_id: { $in: ids } });
    await Policy.deleteMany({ rider_id: { $in: ids } });
    await Payout.deleteMany({ worker_id: { $in: ids } });
    await LiveLocation.deleteMany({ rider_id: { $in: ids } });
    await RiderHistory.deleteMany({ rider_id: { $in: ids } });

    const now = new Date();

    for (const worker of DEMO_WORKERS) {
      const coords = CITY_COORDS[worker.city] || CITY_COORDS["Bangalore"];

      // ── delivery_partners ────────────────────────────────────────────────
      await Worker.create({
        partner_id:                worker.partner_id,
        name:                      worker.name,
        phone:                     worker.phone,
        platform:                  worker.platform,
        delivery_platform:         worker.platform,
        city_name:                 worker.city,        // ai_service.py: city_name
        assigned_zone:             worker.zone,
        lat:                       coords.lat,         // ai_service.py: GPS distance calc
        lon:                       coords.lon,
        asset_value:               85000,              // ai_service.py: overinsurance_ratio
        coverage_tier:             2,                  // ai_service.py: premium tier multiplier
        onboarding_date:           new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
        vehicle_registration_date: new Date(now.getTime() - 900 * 24 * 60 * 60 * 1000),
      });

      // ── live_locations ───────────────────────────────────────────────────
      await LiveLocation.create({
        rider_id:      worker.partner_id,
        lat:           coords.lat,
        lon:           coords.lon,
        location_name: `${worker.zone}, ${worker.city}`,
        status:        "ACTIVE",
        last_ping:     now,
      });

      // ── rider_history — 14 weeks for get_weekly_forecast ────────────────
      const baseEarnings = worker.city === "Mumbai" ? 5000 : worker.city === "Bangalore" ? 4500 : 4200;
      for (let w = 13; w >= 0; w--) {
        const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
        await RiderHistory.create({
          rider_id:      worker.partner_id,
          week_end_date: weekEnd,
          earnings:      baseEarnings + (Math.random() - 0.5) * 600,
          status:        "PAID",
          timestamp:     weekEnd,
        });
      }

      // ── active_policies ──────────────────────────────────────────────────
      // EXPIRED last week's policy
      const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const lastWeekEnd   = new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      await Policy.create({
        policy_id:                `POL-${worker.partner_id}-1`,
        rider_id:                 worker.partner_id,
        weekly_income_prediction: 4500,
        premium_paid:             35.5,
        risk_index:               0.45,
        coverage_amount:          50000,
        start_date:               lastWeekStart,
        end_date:                 lastWeekEnd,
        status:                   "EXPIRED",       // uppercase
        payment_id:               `PAY-SEED-${worker.partner_id}-1`,
      });

      // ACTIVE this week's policy
      const thisWeekStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const thisWeekEnd   = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      await Policy.create({
        policy_id:                `POL-${worker.partner_id}-2`,
        rider_id:                 worker.partner_id,
        weekly_income_prediction: 4800,
        premium_paid:             42.0,
        risk_index:               0.52,
        coverage_amount:          50000,
        start_date:               thisWeekStart,
        end_date:                 thisWeekEnd,
        status:                   "ACTIVE",        // uppercase
        payment_id:               `PAY-SEED-${worker.partner_id}-2`,
      });

      // ── Historical disruptions and payouts ───────────────────────────────
      const disruptionId1 = `DIS-${worker.partner_id}-1`;
      await Disruption.findOneAndUpdate(
        { disruption_id: disruptionId1 },
        { disruption_id: disruptionId1, type: "heavy_rain", zone: worker.zone, city: worker.city, trigger_source: "weather_api" },
        { upsert: true }
      );
      await Payout.create({
        payout_id:     `PAYOUT-${worker.partner_id}-1`,
        worker_id:     worker.partner_id,
        disruption_id: disruptionId1,
        amount:        850,
        status:        "completed",
        cargo_spoiled: true,
        decay_index:   0.8,
        timestamp:     new Date(lastWeekStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      });

      // Pending payout (simulated = awaiting settle-week)
      const disruptionId2 = `DIS-${worker.partner_id}-2`;
      await Disruption.findOneAndUpdate(
        { disruption_id: disruptionId2 },
        { disruption_id: disruptionId2, type: "strike", zone: worker.zone, city: worker.city, trigger_source: "strike_news" },
        { upsert: true }
      );
      await Payout.create({
        payout_id:     `PAYOUT-${worker.partner_id}-2`,
        worker_id:     worker.partner_id,
        disruption_id: disruptionId2,
        amount:        1200,
        status:        "simulated",   // awaiting settle-week
        cargo_spoiled: false,
        decay_index:   0.0,
        timestamp:     new Date(now.getTime() - 4 * 60 * 60 * 1000),
      });
    }

    console.log("[seed] Seeding completed.");
    return NextResponse.json({
      success: true,
      message: "Database seeded correctly (aligned with ai_service.py)",
      workers: DEMO_WORKERS.map((w) => w.partner_id),
    });
  } catch (error) {
    console.error("[seed] error:", error);
    return NextResponse.json(
      { error: "Failed to seed DB", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
