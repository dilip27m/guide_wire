# DEVTrails 2026 — Gap Analysis

> Comparing the **use case document requirements** against the **current DashSure implementation**.

---

## Overall Status Summary

| Category | Implemented | Partially | Missing | Total |
|---|:---:|:---:|:---:|:---:|
| Must-Have Features | 6 | 2 | 2 | 10 |
| Phase 2 Deliverables | 3 | 1 | 0 | 4 |
| Phase 3 Deliverables | 1 | 2 | 2 | 5 |
| **Totals** | **10** | **5** | **4** | **19** |

---

## Must-Have Features (from Use Case Document)

### ✅ AI-Powered Risk Assessment

| Requirement | Status | Evidence |
|---|---|---|
| Dynamic premium calculation | ✅ **Done** | `ai_service.py` `/get-premium` — actuarial formula using ST-GNN risk score |
| Weekly pricing model | ✅ **Done** | Premium capped ₹20–₹50/week, policy lasts 7 days (`Policy.ts` `end_date`) |
| Predictive risk modeling | ✅ **Done** | `RiskModel` (Transformer + GAT) trained on 15 Indian cities |

### ⚠️ Intelligent Fraud Detection

| Requirement | Status | Evidence |
|---|---|---|
| Anomaly detection in claims | ✅ **Done** | `FraudModel` (Residual MLP) scores fraud probability on 12 features |
| Location and activity validation | ⚠️ **Partial** | `gps_dist_from_event_km`, `location_consistency`, `gps_spoofing_flag` features exist in FraudModel, but **values are hardcoded** (line 447-451 in ai_service.py), not derived from real GPS data |
| Duplicate claim prevention | ⚠️ **Partial** | `disruption_id` is unique per Disruption model, but there's **no explicit check** to reject a second payout for the same `disruption_id` in `payoutService.ts` |

### ✅ Parametric Automation

| Requirement | Status | Evidence |
|---|---|---|
| Real-time trigger monitoring | ✅ **Done** | `monitoring_oracle()` background task polling every 60 seconds |
| Automatic claim initiation | ✅ **Done** | Oracle auto-creates `active_event` when weather/news thresholds breached |
| Instant payout processing | ✅ **Done** | Oracle auto-settles via `ImpactModel` when event ends |

### ⚠️ Integration Capabilities

| Requirement | Status | Evidence |
|---|---|---|
| Weather APIs | ✅ **Done** | Open-Meteo (archive + forecast), IMD RSS feed |
| Traffic data | ⚠️ **Partial** | OSMnx road graph is structural only — **no live traffic data** (Google Maps key env var exists but unused in actual logic) |
| Platform APIs (simulated) | ✅ **Done** | `MOCK_RIDER_API` simulates Swiggy/delivery platform data |
| Payment systems (mock) | ✅ **Done** | `PaymentModal.tsx` simulates UPI payment with mock payment IDs |

---

## Phase 2 Deliverables (March 21 – April 4): "Protect Your Worker"

> [!IMPORTANT]
> You are currently AT THE END of Phase 2 (deadline: April 4). These should all be complete.

| Deliverable | Status | Notes |
|---|---|---|
| **Registration Process** | ✅ **Done** | `WorkerForm.tsx` → worker_id entry → upsert to MongoDB via `workerService.ts` |
| **Insurance Policy Management** | ✅ **Done** | `premiumService.ts` creates/expires policies, 7-day lifecycle, one active policy per week |
| **Dynamic Premium Calculation** | ✅ **Done** | Full ST-GNN pipeline: weather history + road graph + env features → risk score → actuarial premium |
| **Claims Management** | ⚠️ **Partial** | Simulation-based claims work (`SimulationControls.tsx`). But the **Oracle's auto-triggered claims are not surfaced in the frontend UI** — `latest_payout` from the background oracle is never displayed to the user unless it matches a manual `disruption_id` |

---

## Phase 3 Deliverables (April 5 – 17): "Perfect for Your Worker"

> [!WARNING]
> Phase 3 starts TOMORROW. These items need attention.

| Deliverable | Status | Gap Details |
|---|---|---|
| **Advanced Fraud Detection** | ⚠️ **Partial** | FraudModel architecture is production-ready (Residual MLP). But the 12 input features are **hardcoded mock values** — no integration with real GPS, delivery history, or phone data. GPS spoofing detection, historical data comparison mentioned in document are not wired. |
| **Instant Payout System (Simulated)** | ⚠️ **Partial** | `PaymentModal.tsx` exists for premium *payment*, but there's **no mock payment gateway for payout receipt** (Razorpay test mode / UPI simulator for receiving wages). The settle-week endpoint just returns a JSON. |
| **Intelligent Dashboard — Worker View** | ❌ **Missing** | Document requires: "Earnings protected, active weekly coverage". Current dashboard shows payments/payouts history and basic stats, but **no "earnings protected" metric, coverage visualization, or protection summary**. |
| **Intelligent Dashboard — Admin/Insurer View** | ❌ **Missing** | Document requires: "Loss ratios, predictive analytics on next week's likely weather/disruption claims". **No admin dashboard exists at all.** |
| **5-minute Demo Video** | 🔲 Not yet | Needed for final submission |

---

## Detailed Gap Breakdown

### 🔴 Critical Gaps (Must fix for Phase 3)

#### 1. Admin/Insurer Dashboard — **Not Started**
The document explicitly asks for:
- Loss ratios (premiums collected vs payouts made)
- Predictive analytics on next week's disruptions
- Overview of all workers and claims

**What exists**: Only a worker-facing dashboard. No admin route, no analytics.

**Suggested path**: Create `/admin` page with:
- Total premiums collected vs total payouts (loss ratio)
- Active workers count, policies count
- Weather forecast for next week (already fetching from Open-Meteo)
- Claims heatmap by disruption type

---

#### 2. Worker Dashboard Missing "Earnings Protected" Metric
The document says the worker dashboard should show "earnings protected" and "active weekly coverage".

**What exists**: `DashboardStats.tsx` shows only weekly income forecast + weekly premium.

**Missing metrics**:
- Total earnings protected this week (sum of payout amounts)
- Coverage remaining (days left in policy)
- Risk level visualization
- Protection percentage (payouts / forecasted income loss)

---

#### 3. Fraud Detection Not Wired to Real Data
The 12 features fed to FraudModel are all hardcoded:
```python
# ai_service.py line 447-451 — ALL MOCK VALUES
claim_features = {
    "days_since_purchase": 180,
    "claims_last_12m": 0,
    "time_to_claim_hrs": 0.5,
    # ... all static
}
```

**Should wire to**:
- `days_since_purchase` → calculate from `Policy.start_date`
- `claims_last_12m` → count from `Payout` collection
- `gps_dist_from_event_km` → compare worker GPS vs disruption location
- `num_policies_same_phone` → query worker collection

---

#### 4. Payout Receipt Simulation Missing
The document says: *"Integrate mock payment gateways (Razorpay test mode, Stripe sandbox, or UPI simulators) to demonstrate how the worker receives their lost wages instantly."*

Currently, `PaymentModal.tsx` simulates **paying the premium** (worker → insurer). But there's no simulation of **receiving the payout** (insurer → worker). The settle-week just returns JSON.

**Need**: A mock UPI/bank transfer animation showing money arriving in worker's account after disruption.

---

### 🟡 Minor Gaps

| Gap | Details |
|---|---|
| **Duplicate claim check** | `Disruption.ts` has unique `disruption_id` index, but `payoutService.ts` doesn't check before creating. A duplicate insert would throw a MongoDB error but isn't handled gracefully. |
| **Live traffic data** | `GOOGLE_MAPS_KEY` env var exists but is never used. No traffic API integration. |
| **Registration is minimal** | Only `worker_id` is collected. The document mentions "optimized onboarding for your delivery persona" — could add name, phone, platform selection, zone selection. |
| **3-5 automated triggers** | Document asks for 3-5. Currently only 2 triggers exist: weather (rainfall threshold) and road blockage (news NLP). Missing: heatwave, pollution/AQI, strike detection. |

---

## What's Working Well ✅

| Strength | Details |
|---|---|
| **AI Architecture** | Production-quality ST-GNN (Transformer + GAT) with trained weights |
| **Actuarial Model** | Proper premium formula with risk scaling and business constraints |
| **Parametric Oracle** | Real background monitoring with auto-trigger and auto-settle |
| **Weekly Model** | Entire system is weekly: premiums, policies, settlements |
| **Persona Focus** | Focused on food delivery workers (Swiggy, Zomato, etc.) |
| **Income-Only Coverage** | Correctly excludes health/accident/vehicle — only lost income |
| **UI/UX** | Clean neo-brutalist design, mobile-friendly, smooth animations |
| **Database Integration** | Full MongoDB persistence via Mongoose models |
| **Simulation System** | 4 disruption scenarios with adjustable duration |
| **Fraud Model** | Residual MLP architecture with proper normalization pipeline |

---

## Priority Action Items for Phase 3

| Priority | Task | Effort |
|---|:---:|---|
| 🔴 P0 | Build Admin/Insurer Dashboard (loss ratios, analytics) | **High** |
| 🔴 P0 | Add "Earnings Protected" and coverage metrics to Worker Dashboard | **Medium** |
| 🟠 P1 | Add mock payout receipt animation (UPI simulator) | **Medium** |
| 🟠 P1 | Wire at least 3 fraud features to real DB data | **Medium** |
| 🟡 P2 | Add duplicate claim prevention check in payoutService | **Low** |
| 🟡 P2 | Add more automated triggers (AQI, heatwave) | **Medium** |
| 🟡 P2 | Enhance registration form (name, phone, platform picker) | **Low** |
| ⚪ P3 | Record 5-minute demo video | **Low** |
| ⚪ P3 | Prepare final pitch deck | **Medium** |
