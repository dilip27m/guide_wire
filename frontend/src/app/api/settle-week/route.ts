import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payout } from "@/models/Payout";

const FASTAPI_URL = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

/**
 * POST /api/settle-week
 * Body: { worker_id: string }
 *
 * 1. Aggregates all "simulated" payout records for this worker from MongoDB.
 * 2. Calls the Python /settle-week endpoint to confirm the settlement.
 * 3. Marks those payout records as "completed" in the DB.
 * 4. Returns the settlement receipt for the notification.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { worker_id } = body;

  if (!worker_id) {
    return NextResponse.json({ error: "worker_id is required" }, { status: 400 });
  }

  try {
    await connectDB();

    // 1. Fetch all unsettled (simulated) payouts for this worker
    const payouts = await Payout.find({
      worker_id,
      status: "simulated",
    }).lean();

    if (payouts.length === 0) {
      return NextResponse.json(
        { status: "NOTHING_TO_SETTLE", message: "No pending payouts this week." },
        { status: 200 }
      );
    }

    const totalAmount = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
    const payoutCount = payouts.length;

    // 2. Confirm settlement with Python AI service
    const aiRes = await fetch(`${FASTAPI_URL}/settle-week`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_id, total_amount: totalAmount, payout_count: payoutCount }),
    });

    if (!aiRes.ok) {
      throw new Error("AI service failed to confirm settlement");
    }

    const receipt = await aiRes.json();

    // 3. Mark all those payouts as completed in MongoDB
    const payoutIds = payouts.map((p) => p._id);
    await Payout.updateMany(
      { _id: { $in: payoutIds } },
      { $set: { status: "completed" } }
    );

    return NextResponse.json(receipt);
  } catch (error) {
    console.error("[settle-week] Error:", error);
    return NextResponse.json({ error: "Settlement failed" }, { status: 500 });
  }
}
