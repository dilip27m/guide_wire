import { NextRequest, NextResponse } from "next/server";
import { proxyToFastAPI } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.city || typeof body.city !== "string") {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  return proxyToFastAPI("/get-premium", { city: body.city });
}
