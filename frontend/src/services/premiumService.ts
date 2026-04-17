import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { aiService, AiServiceError } from "@/services/aiService";

// City → default lat/lon (matches ai_service.py CITY_COORDS)
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Bangalore:  { lat: 12.9716, lon: 77.5946 },
  Mumbai:     { lat: 19.0760, lon: 72.8777 },
  Delhi:      { lat: 28.6139, lon: 77.2090 },
  Hyderabad:  { lat: 17.3850, lon: 78.4867 },
  Chennai:    { lat: 13.0827, lon: 80.2707 },
  Pune:       { lat: 18.5204, lon: 73.8567 },
  Kolkata:    { lat: 22.5726, lon: 88.3639 },
  Ahmedabad:  { lat: 23.0225, lon: 72.5714 },
  Jaipur:     { lat: 26.9124, lon: 75.7873 },
  Lucknow:    { lat: 26.8467, lon: 80.9462 },
};

export interface CreatePremiumInput {
  worker_id: string;
  name: string;
  phone: string;
  city: string;
  delivery_platform: string;
  coverage_tier?: 1 | 2 | 3;
}

export const premiumService = {
  /**
   * Process a premium generation request (Quote stage).
   * Calls the AI service and upserts the worker into delivery_partners collection.
   *
   * ALIGNED WITH ai_service.py:
   *   - Worker stored with partner_id (not worker_id)
   *   - Worker stored with city_name (not city)
   *   - Policy queried by rider_id and status "ACTIVE" (uppercase)
   */
  async processPremium(input: CreatePremiumInput) {
    // 0. Check for Active Policy limit
    let recentPolicy = null;
    try {
      await connectDB();
      // Use rider_id (was worker_id) and uppercase "ACTIVE" to match ai_service.py
      recentPolicy = await Policy.findOne({
        rider_id: input.worker_id,
        end_date: { $gte: new Date() },   // policy still alive (more accurate than 7-day lookback)
        status: "ACTIVE",
      });
    } catch (e) {
      console.error("[premiumService] DB check error:", e);
    }

    // 1. Call AI Service (pass city for location-aware risk)
    let aiData;
    try {
      aiData = await aiService.getPremium(input.worker_id, input.city);
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw error;
      }
      throw new AiServiceError("An unexpected error occurred contacting AI", 500);
    }

    // 2. Persist Worker to MongoDB in delivery_partners collection
    try {
      await connectDB();

      const coords = CITY_COORDS[input.city] || CITY_COORDS["Bangalore"];

      // Upsert Worker — use partner_id and city_name to match ai_service.py
      await Worker.findOneAndUpdate(
        { partner_id: input.worker_id },         // was: worker_id
        {
          partner_id:           input.worker_id, // was: worker_id
          name:                 input.name,
          phone:                input.phone,
          platform:             input.delivery_platform,
          delivery_platform:    input.delivery_platform,
          city_name:            input.city,       // was: city — ai_service.py uses city_name
          lat:                  coords.lat,       // ai_service.py reads lat for GPS distance calc
          lon:                  coords.lon,       // ai_service.py reads lon for GPS distance calc
          coverage_tier:        input.coverage_tier ?? 2,  // FIX: persist selected tier (was always default 2)
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return {
        ...aiData,
        worker_id:     input.worker_id,
        city:          input.city,
        platform:      input.delivery_platform,
        already_active: !!recentPolicy,
        policy_id:     recentPolicy ? recentPolicy.policy_id : undefined,
      };
    } catch (dbError) {
      console.error("[premiumService] DB error:", dbError);
      return {
        ...aiData,
        db_error: "Failed to update worker info. Data is still valid.",
        already_active: !!recentPolicy,
        policy_id: recentPolicy ? recentPolicy.policy_id : undefined,
      };
    }
  },

  /**
   * Activate a policy after successful payment.
   *
   * ALIGNED WITH ai_service.py:
   *   - Policy stored with rider_id (not worker_id)
   *   - Status stored as "ACTIVE" (uppercase) — ai_service.py: find_one({"status": "ACTIVE"})
   *   - coverage_amount stored — ai_service.py: policy.get("coverage_amount", 50000)
   */
  async activatePolicy(input: {
    worker_id: string;
    payment_id: string;
    premium_to_collect: number;
    risk_index: number;
    forecasted_income: number;
  }) {
    try {
      await connectDB();

      // Enforce Weekly Payment Limit — use rider_id and uppercase status
      const recentPolicy = await Policy.findOne({
        rider_id: input.worker_id,
        end_date: { $gte: new Date() },
        status: "ACTIVE",
      });
      if (recentPolicy) {
        throw new Error(
          "You have already paid your premium for this week. A new policy can only be activated after 7 days."
        );
      }

      // Expire any lingering active policies for this rider
      await Policy.updateMany(
        { rider_id: input.worker_id, status: "ACTIVE" },
        { status: "EXPIRED" }                           // uppercase EXPIRED
      );

      // Create new active policy using rider_id + uppercase status + coverage_amount
      const policyId = `POL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const policy = await Policy.create({
        policy_id:                policyId,
        rider_id:                 input.worker_id,       // was: worker_id
        weekly_income_prediction: input.forecasted_income,
        premium_paid:             input.premium_to_collect,
        risk_index:               input.risk_index,
        coverage_amount:          50000,                 // NEW: ai_service.py uses this for fraud detection
        payment_id:               input.payment_id,
        start_date:               new Date(),
        end_date:                 new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status:                   "ACTIVE",              // uppercase — ai_service.py: status == "ACTIVE"
      });

      return {
        status:     "SUCCESS",
        policy_id:  policy.policy_id,
        payment_id: policy.payment_id,
      };
    } catch (error) {
      console.error("[premiumService] Activation error:", error);
      // Re-throw original — preserves "Already activated this week" etc. for the UI
      throw error instanceof Error ? error : new Error("Failed to activate policy");
    }
  },
};
