import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { Disruption } from "@/models/Disruption";
import { Payout } from "@/models/Payout";

const DEMO_WORKERS = [
  {
    worker_id: "WRK-1042",
    name: "Ravi Kumar",
    phone: "9876543210",
    platform: "Swiggy",
    delivery_platform: "Swiggy",
    city: "Bangalore",
    assigned_zone: "Indiranagar",
  },
  {
    worker_id: "WRK-2099",
    name: "Vikram Singh",
    phone: "8765432109",
    platform: "Zomato",
    delivery_platform: "Zomato",
    city: "Mumbai",
    assigned_zone: "Bandra",
  },
  {
    worker_id: "WRK-3055",
    name: "Arun Sharma",
    phone: "7654321098",
    platform: "Zepto",
    delivery_platform: "Zepto",
    city: "Delhi",
    assigned_zone: "Connaught Place",
  },
];

export async function GET() {
  try {
    await connectDB();

    console.log("[seed] Clearing existing demo data...");
    
    // Clear existing
    await Worker.deleteMany({ worker_id: { $in: DEMO_WORKERS.map(w => w.worker_id) } });
    await Policy.deleteMany({ worker_id: { $in: DEMO_WORKERS.map(w => w.worker_id) } });
    await Payout.deleteMany({ worker_id: { $in: DEMO_WORKERS.map(w => w.worker_id) } });

    console.log("[seed] Inserting workers...");
    await Worker.insertMany(DEMO_WORKERS);

    console.log("[seed] Generating historical data...");
    
    const now = new Date();
    
    // Create policies and payouts
    for (const worker of DEMO_WORKERS) {
      // 1. Expired Policy (from last week)
      const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const lastWeekEnd = new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const expiredPolicy = await Policy.create({
        policy_id: `POL-${worker.worker_id}-1`,
        worker_id: worker.worker_id,
        weekly_income_prediction: 4500,
        premium_paid: 35.5,
        risk_index: 0.45,
        start_date: lastWeekStart,
        end_date: lastWeekEnd,
        status: "expired",
        payment_id: `PAY-SEED-${worker.worker_id}-1`,
      });

      // 2. Active Policy (current week)
      const thisWeekStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // started 2 days ago
      const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      await Policy.create({
        policy_id: `POL-${worker.worker_id}-2`,
        worker_id: worker.worker_id,
        weekly_income_prediction: 4800,
        premium_paid: 42.0,
        risk_index: 0.52,
        start_date: thisWeekStart,
        end_date: thisWeekEnd,
        status: "active",
        payment_id: `PAY-SEED-${worker.worker_id}-2`,
      });

      // 3. Historical Payout for the expired policy
      const disruptionId1 = `DIS-${worker.worker_id}-1`;
      await Disruption.findOneAndUpdate(
        { disruption_id: disruptionId1 },
        {
          disruption_id: disruptionId1,
          type: "heavy_rain",
          zone: worker.assigned_zone,
          city: worker.city,
          trigger_source: "weather_api",
        },
        { upsert: true }
      );

      await Payout.create({
        payout_id: `PAYOUT-${worker.worker_id}-1`,
        worker_id: worker.worker_id,
        disruption_id: disruptionId1,
        amount: 850,
        status: "completed",
        cargo_spoiled: true,
        decay_index: 0.8,
        timestamp: new Date(lastWeekStart.getTime() + 3 * 24 * 60 * 60 * 1000), // Middle of last policy
      });

      // 4. Current simulated payout for the active policy (pending settlement)
      const disruptionId2 = `DIS-${worker.worker_id}-2`;
      await Disruption.findOneAndUpdate(
        { disruption_id: disruptionId2 },
        {
          disruption_id: disruptionId2,
          type: "strike",
          zone: worker.assigned_zone,
          city: worker.city,
          trigger_source: "strike_news",
        },
        { upsert: true }
      );

      await Payout.create({
        payout_id: `PAYOUT-${worker.worker_id}-2`,
        worker_id: worker.worker_id,
        disruption_id: disruptionId2,
        amount: 1200,
        status: "simulated", // Wait for settle-week
        cargo_spoiled: false,
        decay_index: 0.0,
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      });
    }

    console.log("[seed] Seeding completed.");

    return NextResponse.json({ 
      success: true, 
      message: "Database seeded correctly",
      workers: DEMO_WORKERS.map(w => w.worker_id)
    });
  } catch (error) {
    console.error("[seed] error:", error);
    return NextResponse.json({ error: "Failed to seed DB", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
