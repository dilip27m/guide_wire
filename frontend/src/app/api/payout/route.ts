import { NextRequest } from "next/server";
import { proxyToFastAPI, validateRequiredFields } from "@/lib/api-helpers";

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

  return proxyToFastAPI("/get-payout", body);
}
