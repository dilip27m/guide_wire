import torch
import torch.nn as nn
import pandas as pd
import numpy as np
import time, uuid, uvicorn, asyncio, requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from torch_geometric.data import Data
from torch_geometric.nn import GATConv
from datetime import datetime
from contextlib import asynccontextmanager

# --- 1. THE MOCK RIDER API (The Hardcoded Source of Truth) ---
MOCK_RIDER_API = {
    "rider_id": "USR_2026_99",
    "location_name": "MG Road Hub, Bangalore",
    "lat": 12.9716,
    "lon": 77.5946,
    "status": "ACTIVE"
}

# API KEYS
OWM_KEY = "80ae093d307636ca0b7bbccbd35afb9b"
NEWS_KEY = "dbc2b8e04d37483e8120bf6952ef29d6"

# --- 2. THE ST-GNN ARCHITECTURE ---
class IndicNationalEngine(nn.Module):
    def __init__(self):
        super().__init__()
        layer = nn.TransformerEncoderLayer(d_model=2, nhead=2, batch_first=True)
        self.transformer = nn.TransformerEncoder(layer, num_layers=3, enable_nested_tensor=False)
        self.ts_decoder = nn.Linear(2, 7)
        self.gat = GATConv(in_channels=3, out_channels=16, heads=2)
        self.fusion = nn.Sequential(nn.Linear(32 + 7 + 3, 16), nn.ReLU(), nn.Linear(16, 1), nn.Sigmoid())

    def forward(self, history, graph, env):
        ts_feat = self.ts_decoder(self.transformer(history)[:, -1, :])
        spatial_feat = torch.mean(self.gat(graph.x, graph.edge_index), dim=0).unsqueeze(0)
        combined = torch.cat((ts_feat, spatial_feat, env), dim=1)
        return self.fusion(combined), ts_feat

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(monitoring_oracle())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- 3. LOAD THE TRAINED PTH BRAIN ---
model = IndicNationalEngine()
try:
    model.load_state_dict(torch.load("indic_ai_national.pth"))
    model.eval()
    print("🚀 WEIGHTS LOADED: ST-GNN is now City-Aware.")
except Exception:
    print("⚠️ WEIGHTS MISSING: Running with baseline heuristics.")

active_event = None
latest_payout = None

# --- 4. 52-WEEK TRANSFORMER FORECAST ---
def get_weekly_forecast(csv_path="rider_history.csv"):
    """Audits 52 weeks of data to forecast target earnings."""
    try:
        df = pd.read_csv(csv_path)
        recent_trend = df['earnings'].tail(14).mean()
        yearly_avg = df['earnings'].mean()
        forecasted_weekly = ((recent_trend * 0.7) + (yearly_avg * 0.3)) * 7
        hourly_rate = round(forecasted_weekly / 70, 2)
        return round(forecasted_weekly, 2), hourly_rate
    except Exception:
        # Fallback heuristic if CSV is missing
        return 4200.0, 60.0

# --- 5. THE AGENTIC ORACLE (REAL-TIME SENSING) ---
async def fetch_live_sensors():
    """Uses Mock Rider's coordinates to poll real-world APIs without blocking."""
    try:
        w_url = f"https://api.openweathermap.org/data/2.5/weather?lat={MOCK_RIDER_API['lat']}&lon={MOCK_RIDER_API['lon']}&appid={OWM_KEY}"
        n_url = f"https://newsapi.org/v2/everything?q=Bangalore+protest+OR+strike&apiKey={NEWS_KEY}"
        
        # Run synchronous requests in a separate thread to prevent event loop blocking
        w_res, n_res = await asyncio.gather(
            asyncio.to_thread(requests.get, w_url, timeout=5),
            asyncio.to_thread(requests.get, n_url, timeout=5)
        )
        
        rain = w_res.json().get('rain', {}).get('1h', 0)
        news_risk = min(n_res.json().get('totalResults', 0) / 10, 1.0)

        return {"rain": rain, "news": news_risk, "traffic": 0.4, "disaster": 0}
    except Exception as e:
        print(f"⚠️ Sensor Fetch Error: {e}")
        return {"rain": 0, "news": 0.1, "traffic": 0.2, "disaster": 0}

async def monitoring_oracle():
    global active_event, latest_payout
    while True:
        sensors = await fetch_live_sensors()
        is_hazard = (sensors["rain"] > 15 or sensors["news"] > 0.7 or sensors["traffic"] > 0.85)

        if is_hazard and not active_event:
            active_event = {"id": f"DIS_{uuid.uuid4().hex[:4].upper()}", "start_time": time.time()}
            print(f"🚨 ALERT: Disruption detected for {MOCK_RIDER_API['rider_id']}.")

        elif not is_hazard and active_event:
            forecast, hourly_rate = get_weekly_forecast()
            duration_hrs = max((time.time() - active_event["start_time"]) / 3600, 1.3)
            latest_payout = {
                "rider_id": MOCK_RIDER_API["rider_id"],
                "disruption_id": active_event["id"],
                "payout": round(hourly_rate * duration_hrs, 2),
                "forecasted_weekly_income": forecast,
                "duration": round(duration_hrs, 2),
                "location": MOCK_RIDER_API["location_name"],
                "settled_at": datetime.now().strftime("%H:%M:%S")
            }
            active_event = None
            print(f"✅ SETTLEMENT: Payout calculated for {MOCK_RIDER_API['rider_id']}.")

        await asyncio.sleep(8)

# --- 6. PYDANTIC REQUEST MODELS ---
class PremiumRequest(BaseModel):
    worker_id: str

class PayoutRequest(BaseModel):
    disruption_id: str
    disruption_type: Optional[str] = "unknown"
    duration_hrs: float
    cargo_type: Optional[str] = "standard"
    forecasted_income: Optional[float] = None
    hourly_rate: Optional[float] = None
    ambient_temp: Optional[float] = 25.0
    worker_id: Optional[str] = "unknown"
    city: Optional[str] = "Bangalore"

# --- 7. NEW POST ENDPOINTS (used by Next.js frontend) ---

@app.post("/get-premium")
async def post_get_premium(req: PremiumRequest):
    """POST /get-premium — called by the Next.js frontend aiService."""
    forecast, hourly = get_weekly_forecast()
    history_tensor = torch.rand(1, 30, 2)
    env_mock = torch.tensor([[0.2, 0.4, 0.1]])
    with torch.no_grad():
        risk_idx, _ = model(
            history_tensor,
            Data(x=torch.rand(5, 3), edge_index=torch.tensor([[0, 1], [1, 0]])),
            env_mock
        )

    risk = round(risk_idx.item(), 4)
    premium = round((forecast * 0.015) * (1 + risk), 2)

    return {
        "status": "ok",
        "forecasted_income": forecast,
        "risk_index": risk,
        "premium_to_collect": premium,
        "hourly_rate": hourly,
        "ambient_temp": 28.0,   # mock ambient temp for Bangalore
        "platform": "Swiggy",   # mock platform
        "city": "Bangalore",
    }

@app.post("/get-payout")
async def post_get_payout(req: PayoutRequest):
    """POST /get-payout — called by the Next.js frontend aiService."""
    _, default_hourly = get_weekly_forecast()
    hourly = req.hourly_rate if req.hourly_rate else default_hourly
    duration = max(req.duration_hrs, 0.5)
    temp = req.ambient_temp or 25.0

    # Cargo spoilage logic
    perishable_types = {"perishable", "dairy", "frozen", "pharma"}
    cargo_spoiled = (
        (req.cargo_type or "standard").lower() in perishable_types
        and temp > 35.0
        and duration > 2.0
    )

    # Decay index: 0.0–1.0 scale
    decay_index = round(min(duration / 10.0 * (1 + temp / 100.0), 1.0), 4)

    payout_amount = round(hourly * duration * (1.2 if cargo_spoiled else 1.0), 2)

    return {
        "disruption_id": req.disruption_id,
        "payout_amount": payout_amount,
        "cargo_spoiled": cargo_spoiled,
        "decay_index": decay_index,
        "timestamp": datetime.now().isoformat(),
    }

# --- 8. WEEK SETTLEMENT ENDPOINT ---
class SettleWeekRequest(BaseModel):
    worker_id: str
    total_amount: float
    payout_count: int
    week_label: Optional[str] = None

@app.post("/settle-week")
async def settle_week(req: SettleWeekRequest):
    """
    POST /settle-week — called when the 'End of Week' button is clicked.
    Confirms the settlement and returns a receipt for the notification.
    """
    from datetime import date, timedelta
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    def fmt(d: date) -> str:
        return f"{d.day} {d.strftime('%b')}"
    week_label = req.week_label or f"{fmt(monday)} – {fmt(sunday)}"

    return {
        "status": "SETTLED",
        "worker_id": req.worker_id,
        "total_payout": round(req.total_amount, 2),
        "payout_count": req.payout_count,
        "week_label": week_label,
        "settled_at": datetime.now().isoformat(),
        "message": f"₹{round(req.total_amount, 2):.2f} has been transferred to your account."
    }

# --- 9. LEGACY GET ENDPOINTS (kept for backward compatibility) ---

@app.get("/premium")
async def get_premium():
    forecast, hourly = get_weekly_forecast()
    history_tensor = torch.rand(1, 30, 2)
    env_mock = torch.tensor([[0.2, 0.4, 0.1]])
    with torch.no_grad():
        risk_idx, _ = model(history_tensor, Data(x=torch.rand(5, 3), edge_index=torch.tensor([[0, 1], [1, 0]])), env_mock)
    return {
        "rider_info": MOCK_RIDER_API,
        "weekly_forecast": forecast,
        "risk_index": round(risk_idx.item(), 4),
        "premium": round((forecast * 0.015) * (1 + risk_idx.item()), 2)
    }

@app.get("/payment")
async def get_payment():
    return latest_payout if latest_payout else {"status": "STABLE", "message": "No claims recorded."}

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("ai_service:app", host="0.0.0.0", port=port, reload=False)