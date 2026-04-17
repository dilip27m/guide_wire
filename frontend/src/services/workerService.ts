import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { payoutService } from "@/services/payoutService";

export const workerService = {
  /**
   * Retrieves the dashboard data containing a worker, their active policy, and all payouts.
   *
   * NOTE: Worker model now uses partner_id (aligned with ai_service.py delivery_partners).
   *       Policy model now uses rider_id and status "ACTIVE" (aligned with ai_service.py active_policies).
   */
  async getWorkerDashboardData(workerId: string) {
    await connectDB();

    // Query by partner_id (was worker_id) — matches ai_service.py delivery_partners collection
    const worker = await Worker.findOne({ partner_id: workerId }).lean();
    if (!worker) {
      return null;
    }

    // Query by rider_id (was worker_id) and uppercase "ACTIVE" — matches ai_service.py active_policies
    const activePolicy = await Policy.findOne({
      rider_id: workerId,
      status: "ACTIVE",
    }).lean();

    const allPolicies = await Policy.find({
      rider_id: workerId,
    })
      .sort({ start_date: -1 })
      .lean();

    const payouts = await payoutService.getPayoutsByWorker(workerId);

    return {
      worker,
      policy: activePolicy,
      policies: allPolicies,
      payouts,
    };
  },
};
