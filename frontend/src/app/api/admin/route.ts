import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { Payout } from "@/models/Payout";

/**
 * GET /api/admin
 *
 * ALIGNED WITH ai_service.py collection names and field names:
 *   - Worker collection: delivery_partners, key field: partner_id, city field: city_name
 *   - Policy collection: active_policies,   key field: rider_id,  status: "ACTIVE" (uppercase)
 *   - Payout collection: payouts (Next.js only — ai_service only reads/writes via motor)
 */
export async function GET() {
  try {
    await connectDB();

    // 1. Total delivery partners connected
    const totalWorkers = await Worker.countDocuments();

    // 2. Active policies — uppercase "ACTIVE" matches ai_service.py
    const activePolicies = await Policy.countDocuments({ status: "ACTIVE" });

    // 3. Total premiums collected
    const policies = await Policy.find({}).lean();
    let totalPremiums = 0;
    policies.forEach((p) => {
      totalPremiums += p.premium_paid || 0;
    });

    // 4. Total payouts initiated
    const payoutsList = await Payout.find({}).lean() as Array<{ amount: number }>;
    const totalPayouts = payoutsList.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 5. Loss Ratio = Payouts / Premiums (real data only — no fake baseline)
    const lossRatio = totalPremiums > 0 ? (totalPayouts / totalPremiums) * 100 : 0;

    // 6. Recent claims feed (last 10 globally)
    const recentClaims = await Payout.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // 7. Average risk index per city
    //    Worker uses city_name (aligned with ai_service.py), Policy uses rider_id
    const allWorkers = await Worker.find({}).lean() as any[];
    const workerCityMap: Record<string, string> = {};
    allWorkers.forEach((w) => {
      // partner_id is the key (was worker_id)
      workerCityMap[w.partner_id] = w.city_name;  // was city
    });

    const cityRiskAgg: Record<string, { totalIndex: number; count: number }> = {};
    policies.forEach((p) => {
      if (p.status === "ACTIVE" && p.risk_index) {  // uppercase ACTIVE
        const city = workerCityMap[p.rider_id];     // rider_id (was worker_id)
        if (city) {
          if (!cityRiskAgg[city]) cityRiskAgg[city] = { totalIndex: 0, count: 0 };
          cityRiskAgg[city].totalIndex += p.risk_index;
          cityRiskAgg[city].count += 1;
        }
      }
    });

    const city_risk_indexes = Object.keys(cityRiskAgg)
      .map((city) => ({
        city,
        avg_risk: roundTo(cityRiskAgg[city].totalIndex / cityRiskAgg[city].count, 2),
      }))
      .sort((a, b) => b.avg_risk - a.avg_risk);

    return NextResponse.json({
      success: true,
      data: {
        total_workers: totalWorkers,
        active_policies: activePolicies,
        total_premiums: totalPremiums,
        total_payouts: totalPayouts,
        loss_ratio: roundTo(lossRatio, 2),
        recent_claims: recentClaims,
        city_risk_indexes,
      },
    });
  } catch (error) {
    console.error("[Admin API] Error aggregating data:", error);
    return NextResponse.json({ error: "Failed to load admin stats" }, { status: 500 });
  }
}

function roundTo(num: number, dec: number) {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}
