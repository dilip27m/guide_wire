import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Disruption } from "@/models/Disruption";
import { Payout } from "@/models/Payout";
import { Policy } from "@/models/Policy";
import { aiService, AiServiceError } from "@/services/aiService";

/**
 * POST /api/simulate-mass
 *
 * ALIGNED WITH ai_service.py:
 *   - Worker queried by city_name field (was "city")
 *   - Worker unique key is partner_id (was worker_id)
 *   - Policy queried by rider_id (was worker_id) and status "ACTIVE" (uppercase)
 *   - Payout created with status "simulated" (was "completed") for settle-week compatibility
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { city, disruption_type, duration_hrs, cargo_type } = body;

  if (!city || !disruption_type) {
    return NextResponse.json(
      { error: "City and disruption type are required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // 1. Find all workers in the selected city — use city_name (was "city")
    const workers = await Worker.find({ city_name: city });  // was: { city }

    const disruptionId = `${disruption_type}_${Date.now()}`;

    // 2. Register the disruption event
    await Disruption.create({
      disruption_id:  disruptionId,
      type:           disruption_type,
      zone:           "regional",
      city:           city,
      trigger_source: "admin_simulation",
    });

    let totalPayoutAmount = 0;
    const payoutDocs: any[] = [];

    // 3. Request dynamic payout amounts for each worker concurrently
    await Promise.all(
      workers.map(async (worker) => {
        // Use rider_id and uppercase "ACTIVE" to match ai_service.py active_policies
        const policy = await Policy.findOne({
          rider_id: worker.partner_id,  // was: worker.worker_id
          status: "ACTIVE",             // was: "active"
        });

        let f_income = 4200;
        if (policy) {
          f_income = policy.weekly_income_prediction;
        } else {
          const hash = worker.partner_id.charCodeAt(worker.partner_id.length - 1) || 50;
          f_income = 3000 + (hash % 35) * 100;
        }
        const h_rate = Math.round(f_income / 70);

        const payload = {
          disruption_id:    disruptionId,
          disruption_type,
          duration_hrs:     duration_hrs || 2,
          cargo_type:       cargo_type || "standard",
          forecasted_income: f_income,
          hourly_rate:      h_rate,
          ambient_temp:     35,
          worker_id:        worker.partner_id,  // was: worker.worker_id
          city:             city,
        };

        try {
          const aiData = await aiService.getPayout(payload);
          const amount = aiData.payout_amount || 150;
          totalPayoutAmount += amount;

          payoutDocs.push({
            payout_id:     `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            worker_id:     worker.partner_id,  // was: worker.worker_id
            disruption_id: disruptionId,
            amount:        amount,
            status:        "simulated",        // was "completed" — broken settle-week
          });
        } catch (error) {
          console.error(`AI calculation failed for ${worker.partner_id}`);
        }
      })
    );

    if (payoutDocs.length > 0) {
      await Payout.insertMany(payoutDocs);
    }

    const averagePayout =
      payoutDocs.length > 0 ? totalPayoutAmount / payoutDocs.length : 0;

    return NextResponse.json({
      disruption_id:          disruptionId,
      affected_riders:        payoutDocs.length,
      payout_amount_per_rider: averagePayout,
      total_payout_amount:    totalPayoutAmount,
    });
  } catch (error) {
    console.error("[simulateMass API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
