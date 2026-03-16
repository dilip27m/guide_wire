import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { payoutService } from "@/services/payoutService";

export const workerService = {
  /**
   * Retrieves the dashboard data containing a worker, their active policy, and all payouts.
   */
  async getWorkerDashboardData(workerId: string) {
    await connectDB();

    const worker = await Worker.findOne({ worker_id: workerId }).lean();
    if (!worker) {
      return null;
    }

    const activePolicy = await Policy.findOne({
      worker_id: workerId,
      status: "active",
    }).lean();

    const payouts = await payoutService.getPayoutsByWorker(workerId);

    return {
      worker,
      policy: activePolicy,
      payouts,
    };
  },
};
