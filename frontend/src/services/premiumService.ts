import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { aiService, AiServiceError } from "@/services/aiService";

export interface CreatePremiumInput {
  city: string;
  worker_id: string;
  platform: string;
}

export const premiumService = {
  /**
   * Process a premium generation request.
   * Calls the AI service, then creates the worker and policy records.
   */
  async processPremium(input: CreatePremiumInput) {
    // 1. Call AI Service
    let aiData;
    try {
      aiData = await aiService.getPremium(input.city);
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw error;
      }
      throw new AiServiceError("An unexpected error occurred contacting AI", 500);
    }

    // 2. Persist to MongoDB
    try {
      await connectDB();

      // Upsert Worker
      const worker = await Worker.findOneAndUpdate(
        { worker_id: input.worker_id },
        {
          worker_id: input.worker_id,
          platform: input.platform,
          city: input.city,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Deactivate any existing active policies
      await Policy.updateMany(
        { worker_id: worker.worker_id, status: "active" },
        { status: "expired" }
      );

      // Create new active policy
      const policyId = `POL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const policy = await Policy.create({
        policy_id: policyId,
        worker_id: worker.worker_id,
        weekly_income_prediction: aiData.forecasted_income,
        premium_paid: aiData.premium_to_collect,
        risk_index: aiData.risk_index,
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
      });

      return {
        ...aiData,
        worker_id: worker.worker_id,
        policy_id: policy.policy_id,
      };
    } catch (dbError) {
      console.error("[premiumService] DB error:", dbError);
      // Graceful degradation: return AI data even if DB write fails
      return {
        ...aiData,
        db_error: "Failed to save policy. Data is still valid.",
      };
    }
  },
};
