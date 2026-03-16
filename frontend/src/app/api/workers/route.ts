import { NextRequest, NextResponse } from "next/server";
import { workerService } from "@/services/workerService";

/**
 * GET /api/workers?worker_id=WRK-1042
 * Returns worker info, active policy, and payout history.
 */
export async function GET(req: NextRequest) {
  const workerId = req.nextUrl.searchParams.get("worker_id");

  if (!workerId) {
    return NextResponse.json({ error: "worker_id is required" }, { status: 400 });
  }

  try {
    const dashboardData = await workerService.getWorkerDashboardData(workerId);
    
    if (!dashboardData) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("[workers] Controller error:", error);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }
}
