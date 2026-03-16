import { NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 8000;

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

/**
 * Proxies a POST request to the FastAPI backend.
 * Handles timeouts, error parsing, and structured error responses.
 */
export async function proxyToFastAPI(
  endpoint: string,
  body: unknown
): Promise<NextResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${FASTAPI_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.detail || `AI service returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error(`[proxy] Timeout on ${endpoint} after ${REQUEST_TIMEOUT_MS}ms`);
      return NextResponse.json(
        { error: "AI service timed out. Please try again." },
        { status: 504 }
      );
    }

    console.error(`[proxy] Error on ${endpoint}:`, error);
    return NextResponse.json(
      { error: "Failed to connect to AI service" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
