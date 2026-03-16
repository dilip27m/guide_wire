const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 8000;

export class AiServiceError extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = "AiServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Common fetcher for the FastAPI AI Service.
 */
async function fetchFromAI(endpoint: string, body: unknown) {
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
      throw new AiServiceError(
        errData.detail || `AI service returned ${response.status}`,
        response.status,
        errData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AiServiceError) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      console.error(`[aiService] Timeout on ${endpoint} after ${REQUEST_TIMEOUT_MS}ms`);
      throw new AiServiceError("AI service timed out. Please try again.", 504);
    }

    console.error(`[aiService] Error on ${endpoint}:`, error);
    throw new AiServiceError("Failed to connect to AI service", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export const aiService = {
  getPremium: (city: string) => fetchFromAI("/get-premium", { city }),
  getPayout: (body: any) => fetchFromAI("/get-payout", body),
};
