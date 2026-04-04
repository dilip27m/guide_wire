import { NextRequest, NextResponse } from "next/server";
import { premiumService } from "@/services/premiumService";
import { AiServiceError } from "@/services/aiService";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.worker_id || typeof body.worker_id !== "string") {
    return NextResponse.json({ error: "Worker ID is required" }, { status: 400 });
  }

  try {
    const responseData = await premiumService.processPremium({
      worker_id: body.worker_id,
      name: body.name || "",
      phone: body.phone || "",
      city: body.city || "Bangalore",
      delivery_platform: body.delivery_platform || "Swiggy",
    });
    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof AiServiceError) {
      return NextResponse.json(error.details || { error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
