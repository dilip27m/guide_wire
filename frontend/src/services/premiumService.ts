import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { aiService, AiServiceError } from "@/services/aiService";

export interface CreatePremiumInput {
  worker_id: string;
}

export const premiumService = {
  /**
   * Process a premium generation request (Quote stage).
   * Calls the AI service and updates/creates the worker.
   */
  async processPremium(input: CreatePremiumInput) {
    // 1. Call AI Service
    let aiData;
    try {
      aiData = await aiService.getPremium(input.worker_id);
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw error;
      }
      throw new AiServiceError("An unexpected error occurred contacting AI", 500);
    }

    // 2. Persist Worker to MongoDB
    try {
      await connectDB();

      // Upsert Worker
      await Worker.findOneAndUpdate(
        { worker_id: input.worker_id },
        {
          worker_id: input.worker_id,
          platform: aiData.platform,
          city: aiData.city,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return {
        ...aiData,
        worker_id: input.worker_id,
      };
    } catch (dbError) {
      console.error("[premiumService] DB error:", dbError);
      return {
        ...aiData,
        db_error: "Failed to update worker info. Data is still valid.",
      };
    }
  },

  /**
   * Activate a policy after successful payment.
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

      // Deactivate any existing active policies
      await Policy.updateMany(
        { worker_id: input.worker_id, status: "active" },
        { status: "expired" }
      );

      // Create new active policy
      const policyId = `POL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const policy = await Policy.create({
        policy_id: policyId,
        worker_id: input.worker_id,
        weekly_income_prediction: input.forecasted_income,
        premium_paid: input.premium_to_collect,
        risk_index: input.risk_index,
        payment_id: input.payment_id,
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
      });

      return {
        status: "SUCCESS",
        policy_id: policy.policy_id,
        payment_id: policy.payment_id,
      };
    } catch (error) {
      console.error("[premiumService] Activation error:", error);
      throw new Error("Failed to activate policy");
    }
  },
};
