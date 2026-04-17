import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { Payout } from "@/models/Payout";
import { Disruption } from "@/models/Disruption";
import { LiveLocation } from "@/models/LiveLocation";
import { RiderHistory } from "@/models/RiderHistory";

/**
 * GET /api/seed-demo
 *
 * Wipes and repopulates the entire DB with demo data.
 *
 * ALIGNED WITH ai_service.py:
 *   - Worker uses partner_id (not worker_id), city_name (not city)
 *   - Worker includes lat, lon, asset_value, coverage_tier, onboarding_date, vehicle_registration_date
 *   - Policy uses rider_id (not worker_id), status "ACTIVE" (uppercase)
 *   - Policy includes coverage_amount
 *   - Populates live_locations collection for oracle GPS tracking
 *   - Populates rider_history collection for weekly_forecast and claims_last_12m
 */

// ai_service.py: CITY_COORDS — must match exactly
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Bangalore: { lat: 12.9716, lon: 77.5946 },
  Mumbai: { lat: 19.0760, lon: 72.8777 },
  Delhi: { lat: 28.6139, lon: 77.2090 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Pune: { lat: 18.5204, lon: 73.8567 },
};

export async function GET() {
  try {
    await connectDB();

    // 1. Wipe all collections
    await Worker.deleteMany({});
    await Policy.deleteMany({});
    await Payout.deleteMany({});
    await Disruption.deleteMany({});
    await LiveLocation.deleteMany({});
    await RiderHistory.deleteMany({});

    const CITIES = ["Bangalore", "Mumbai", "Delhi", "Chennai", "Pune"];
    const PLATFORMS = ["Swiggy", "Zomato"];
    const FIRST_NAMES = ["Rahul", "Ramesh", "Suresh", "Vikram", "Ajay", "Karthik", "Manish", "Amit", "Deepak", "Rohan", "Sachin", "Vijay"];
    const LAST_NAMES = ["Kumar", "Singh", "Patil", "Deshmukh", "Sharma", "Raj", "Menon", "Das", "Yadav", "Gupta"];

    const workers: any[] = [];
    const policies: any[] = [];
    const liveLocations: any[] = [];
    const riderHistories: any[] = [];

    // 2. Deterministic Judge Test Profiles
    const judgeProfiles = [
      { partner_id: "USR_BLR_1", name: "Ramesh Kumar", city: "Bangalore", platform: "Swiggy", weekly_income: 4500, risk: 0.45 },
      { partner_id: "USR_BLR_2", name: "Suresh Menon", city: "Bangalore", platform: "Zomato", weekly_income: 6000, risk: 0.38 },
      { partner_id: "USR_BOM_1", name: "Ajay Patil", city: "Mumbai", platform: "Zomato", weekly_income: 5200, risk: 0.41 },
    ];

    for (const u of judgeProfiles) {
      const coords = CITY_COORDS[u.city] || CITY_COORDS["Bangalore"];
      const now = new Date();

      // Worker — aligned with delivery_partners collection
      workers.push({
        partner_id: u.partner_id,           // was worker_id
        name: u.name,
        phone: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
        platform: u.platform,
        delivery_platform: u.platform,
        city_name: u.city,                 // was city
        lat: coords.lat,             // NEW: ai_service.py GPS features
        lon: coords.lon,             // NEW: ai_service.py GPS features
        asset_value: 85000,                  // NEW: ai_service.py overinsurance_ratio
        coverage_tier: 2,                      // NEW: ai_service.py premium multiplier
        onboarding_date: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
        vehicle_registration_date: new Date(now.getTime() - 900 * 24 * 60 * 60 * 1000),
        assigned_zone: "default",
      });

      // Policy — aligned with active_policies collection
      policies.push({
        policy_id: `POL_${u.partner_id}_ACTIVE`,
        rider_id: u.partner_id,            // was worker_id
        weekly_income_prediction: u.weekly_income,
        premium_paid: Math.round((u.weekly_income * u.risk) / 10),
        risk_index: u.risk,
        coverage_amount: 50000,                   // NEW: ai_service.py fraud feature
        status: "ACTIVE",                // uppercase — was "active"
        payment_id: `PAY_PROMO_${u.partner_id}`,
      });

      // LiveLocation — aligned with live_locations collection
      liveLocations.push({
        rider_id: u.partner_id,                       // NEW collection
        lat: coords.lat,
        lon: coords.lon,
        location_name: `${u.city} Central`,
        status: "ACTIVE",                           // uppercase
        last_ping: now,
      });

      // RiderHistory — 12 weeks of earnings for get_weekly_forecast
      for (let w = 11; w >= 0; w--) {
        const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
        riderHistories.push({
          rider_id: u.partner_id,
          week_end_date: weekEnd,
          earnings: u.weekly_income + (Math.random() - 0.5) * 800,
          status: "PAID",
          timestamp: weekEnd,
        });
      }
    }

    // 3. Generate 350 random realistic profiles
    for (let i = 0; i < 350; i++) {
      const id = `USR_RND_${i + 100}`;
      const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const inc = 3500 + Math.floor(Math.random() * 3000);
      const rsk = 0.35 + Math.random() * 0.25;
      const c = CITIES[Math.floor(Math.random() * CITIES.length)];
      const p = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
      const now = new Date();
      const coords = CITY_COORDS[c] || CITY_COORDS["Bangalore"];

      workers.push({
        partner_id: id,
        name: `${fName} ${lName}`,
        phone: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
        platform: p,
        delivery_platform: p,
        city_name: c,
        lat: coords.lat + (Math.random() - 0.5) * 0.1,
        lon: coords.lon + (Math.random() - 0.5) * 0.1,
        asset_value: 60000 + Math.floor(Math.random() * 50000),
        coverage_tier: [1, 2, 2, 3][Math.floor(Math.random() * 4)],
        onboarding_date: new Date(now.getTime() - (90 + Math.random() * 730) * 24 * 60 * 60 * 1000),
        vehicle_registration_date: new Date(now.getTime() - (365 + Math.random() * 1460) * 24 * 60 * 60 * 1000),
        assigned_zone: "default",
      });

      policies.push({
        policy_id: `POL_${id}_ACTIVE`,
        rider_id: id,
        weekly_income_prediction: inc,
        premium_paid: Math.round((inc * rsk) / 10),
        risk_index: Number(rsk.toFixed(2)),
        coverage_amount: 50000,
        status: "ACTIVE",
        payment_id: `PAY_AUTO_${id}`,
      });

      liveLocations.push({
        rider_id: id,
        lat: coords.lat + (Math.random() - 0.5) * 0.1,
        lon: coords.lon + (Math.random() - 0.5) * 0.1,
        location_name: c,
        status: "ACTIVE",
        last_ping: now,
      });

      // 4 weeks of history per random rider
      for (let w = 3; w >= 0; w--) {
        const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
        riderHistories.push({
          rider_id: id,
          week_end_date: weekEnd,
          earnings: inc + (Math.random() - 0.5) * 600,
          status: "PAID",
          timestamp: weekEnd,
        });
      }
    }

    // 4. Batch Insert all collections
    await Worker.insertMany(workers);
    await Policy.insertMany(policies);
    await LiveLocation.insertMany(liveLocations);
    await RiderHistory.insertMany(riderHistories);

    return NextResponse.json({
      success: true,
      message: `DB Wiped & Repopulated with ${workers.length} Riders`,
      collections_seeded: [
        `delivery_partners: ${workers.length}`,
        `active_policies: ${policies.length}`,
        `live_locations: ${liveLocations.length}`,
        `rider_history: ${riderHistories.length}`,
      ],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
