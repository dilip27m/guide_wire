import { NextResponse } from "next/server";

/**
 * Validates that all required fields exist on the request body.
 * Returns null if valid, or a NextResponse with the error if invalid.
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  fields: string[]
): NextResponse | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }
  return null;
}
