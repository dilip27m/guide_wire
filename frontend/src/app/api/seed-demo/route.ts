import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Worker } from "@/models/Worker";
import { Policy } from "@/models/Policy";
import { Payout } from "@/models/Payout";
import { Disruption } from "@/models/Disruption";

export async function GET() {
  try {
    await connectDB();

    // 1. Wipe the entire DB clean
    await Worker.deleteMany({});
    await Policy.deleteMany({});
    await Payout.deleteMany({});
    await Disruption.deleteMany({});

    const CITIES = ["Bangalore", "Mumbai", "Delhi", "Chennai", "Pune"];
    const PLATFORMS = ["Swiggy", "Zomato"];
    const FIRST_NAMES = ["Rahul", "Ramesh", "Suresh", "Vikram", "Ajay", "Karthik", "Manish", "Amit", "Deepak", "Rohan", "Sachin", "Vijay"];
    const LAST_NAMES = ["Kumar", "Singh", "Patil", "Deshmukh", "Sharma", "Raj", "Menon", "Das", "Yadav", "Gupta"];

    const workers = [];
    const policies = [];

    // 2. Inject the 3 Deterministic Judge Test Profiles first
    const judgeProfiles = [
      { worker_id: "USR_BLR_1", name: "Ramesh Kumar", city: "Bangalore", platform: "Swiggy", weekly_income: 4500, risk: 0.45 },
      { worker_id: "USR_BLR_2", name: "Suresh Menon", city: "Bangalore", platform: "Zomato", weekly_income: 6000, risk: 0.38 },
      { worker_id: "USR_BOM_1", name: "Ajay Patil", city: "Mumbai", platform: "Zomato", weekly_income: 5200, risk: 0.41 },
    ];

    for (const u of judgeProfiles) {
      workers.push({ worker_id: u.worker_id, name: u.name, city: u.city, platform: u.platform });
      policies.push({
        policy_id: `POL_${u.worker_id}_ACTIVE`,
        worker_id: u.worker_id,
        weekly_income_prediction: u.weekly_income,
        premium_paid: Math.round((u.weekly_income * u.risk) / 10),
        risk_index: u.risk,
        status: "active",
        payment_id: `PAY_PROMO_${u.worker_id}`
      });
    }

    // 3. Generate 350 random realistic profiles
    for (let i = 0; i < 350; i++) {
      const id = `USR_RND_${i + 100}`;
      const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const inc = 3500 + Math.floor(Math.random() * 3000); // 3500 to 6500
      const rsk = 0.35 + (Math.random() * 0.25); // 0.35 to 0.60
      const c = CITIES[Math.floor(Math.random() * CITIES.length)];
      const p = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];

      workers.push({ worker_id: id, name: `${fName} ${lName}`, city: c, platform: p });
      policies.push({
        policy_id: `POL_${id}_ACTIVE`,
        worker_id: id,
        weekly_income_prediction: inc,
        premium_paid: Math.round((inc * rsk) / 10),
        risk_index: Number(rsk.toFixed(2)),
        status: "active",
        payment_id: `PAY_AUTO_${id}`
      });
    }

    // 4. Batch Insert
    await Worker.insertMany(workers);
    await Policy.insertMany(policies);

    return NextResponse.json({ success: true, message: `DB Wiped & Repopulated with ${workers.length} Riders` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
