import { NextRequest, NextResponse } from "next/server";
import { validateRequiredFields } from "@/lib/api-helpers";
import { payoutService } from "@/services/payoutService";
import { AiServiceError } from "@/services/aiService";

const REQUIRED_FIELDS = [
  "disruption_id",
  "duration_hrs",
  "cargo_type",
  "forecasted_income",
  "hourly_rate",
  "ambient_temp",
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const validationError = validateRequiredFields(body, REQUIRED_FIELDS);
  if (validationError) return validationError;

  try {
    const responseData = await payoutService.processPayout(body);
    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof AiServiceError) {
      return NextResponse.json(error.details || { error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
