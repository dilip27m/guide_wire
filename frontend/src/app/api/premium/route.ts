import { NextRequest, NextResponse } from "next/server";
import { premiumService } from "@/services/premiumService";
import { AiServiceError } from "@/services/aiService";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.city || typeof body.city !== "string") {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  const worker_id = body.worker_id || `WRK-${Date.now()}`;
  const platform = body.platform || "Unknown";

  try {
    const responseData = await premiumService.processPremium({
      city: body.city,
      worker_id,
      platform,
    });
    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof AiServiceError) {
      return NextResponse.json(error.details || { error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
