import { connectDB } from "@/lib/db";
import { Disruption } from "@/models/Disruption";
import { Payout } from "@/models/Payout";
import { aiService, AiServiceError } from "@/services/aiService";

export const payoutService = {
  /**
   * Process a payout generation request.
   * Calls the AI service, then records the disruption and payout in the database.
   */
  async processPayout(body: any) {
    // 1. Call AI Service
    let aiData;
    try {
      aiData = await aiService.getPayout(body);
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw error;
      }
      throw new AiServiceError("An unexpected error occurred contacting AI", 500);
    }

    // 2. Persist to MongoDB
    try {
      await connectDB();

      // Duplicate claim prevention
      const existingPayout = await Payout.findOne({ disruption_id: body.disruption_id });
      if (existingPayout) {
        return {
          ...aiData,
          duplicate: true,
          message: "A payout for this disruption has already been processed.",
          existing_payout_id: existingPayout.payout_id,
        };
      }

      // Create disruption record
      await Disruption.create({
        disruption_id: body.disruption_id,
        type: body.disruption_type || "unknown",
        zone: "default",
        city: body.city || "Unknown",
        trigger_source: "simulation",
      });

      // Create payout record
      const payoutId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await Payout.create({
        payout_id: payoutId,
        worker_id: body.worker_id || "unknown",
        disruption_id: body.disruption_id,
        amount: aiData.payout_amount,
        status: "completed", // Instant payout
      });

      return {
        ...aiData,
        payout_id: payoutId,
        db_status: "saved",
      };
    } catch (dbError) {
      console.error("[payoutService] DB error:", dbError);
      // Graceful degradation
      return {
        ...aiData,
        db_error: "Failed to save payout record. Data is still valid.",
      };
    }
  },

  /**
   * Fetches all payouts for a given worker, sorted by most recent first.
   */
  async getPayoutsByWorker(workerId: string) {
    await connectDB();
    return Payout.find({ worker_id: workerId }).sort({ timestamp: -1 }).lean();
  },
};
