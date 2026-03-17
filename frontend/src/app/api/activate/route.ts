import { NextRequest, NextResponse } from "next/server";
import { premiumService } from "@/services/premiumService";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.worker_id || !body?.payment_id) {
    return NextResponse.json({ error: "Worker ID and Payment ID are required" }, { status: 400 });
  }

  try {
    const responseData = await premiumService.activatePolicy({
      worker_id: body.worker_id,
      payment_id: body.payment_id,
      premium_to_collect: body.premium_to_collect,
      risk_index: body.risk_index,
      forecasted_income: body.forecasted_income,
    });
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[activate-route] Error:", error);
    return NextResponse.json({ error: "Failed to activate policy" }, { status: 500 });
  }
}
