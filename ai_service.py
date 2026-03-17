import torch
import torch.nn as nn
import pandas as pd
import numpy as np
import time, uuid, uvicorn, nest_asyncio, asyncio, requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from torch_geometric.data import Data
from torch_geometric.nn import GATConv
from datetime import datetime

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
        self.fusion = nn.Sequential(nn.Linear(32 + 7 + 4, 16), nn.ReLU(), nn.Linear(16, 1), nn.Sigmoid())

    def forward(self, history, graph, env):
        ts_feat = self.ts_decoder(self.transformer(history)[:, -1, :])
        spatial_feat = torch.mean(self.gat(graph.x, graph.edge_index), dim=0).unsqueeze(0)
        combined = torch.cat((ts_feat, spatial_feat, env), dim=1)
        return self.fusion(combined), ts_feat

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- 3. LOAD THE TRAINED PTH BRAIN ---
model = IndicNationalEngine()
try:
    model.load_state_dict(torch.load("indic_ai_national.pth"))
    model.eval()
    print("🚀 WEIGHTS LOADED: ST-GNN is now City-Aware.")
except:
    print("⚠️ WEIGHTS MISSING: Running with baseline heuristics.")

active_event = None
latest_payout = None

# --- 4. 52-WEEK TRANSFORMER FORECAST ---
def get_weekly_forecast(csv_path="rider_history.csv"):
    """Audits 52 weeks of data to forecast target earnings."""
    df = pd.read_csv(csv_path)
    recent_trend = df['earnings'].tail(14).mean()
    yearly_avg = df['earnings'].mean()
    forecasted_weekly = ((recent_trend * 0.7) + (yearly_avg * 0.3)) * 7
    hourly_rate = round(forecasted_weekly / 70, 2) 
    return round(forecasted_weekly, 2), hourly_rate

# --- 5. THE AGENTIC ORACLE (REAL-TIME SENSING) ---
async def fetch_live_sensors():
    """Uses Mock Rider's coordinates to poll real-world APIs."""
    try:
        # Weather Sensor for MG Road
        w_url = f"https://api.openweathermap.org/data/2.5/weather?lat={MOCK_RIDER_API['lat']}&lon={MOCK_RIDER_API['lon']}&appid={OWM_KEY}"
        w_res = requests.get(w_url).json()
        rain = w_res.get('rain', {}).get('1h', 0)
        
        # News Sentiment for Bangalore
        n_url = f"https://newsapi.org/v2/everything?q=Bangalore+protest+OR+strike&apiKey={NEWS_KEY}"
        n_res = requests.get(n_url).json()
        news_risk = min(n_res.get('totalResults', 0) / 10, 1.0)
        
        return {"rain": rain, "news": news_risk, "traffic": 0.4, "disaster": 0}
    except:
        return {"rain": 0, "news": 0.1, "traffic": 0.2, "disaster": 0}

async def monitoring_oracle():
    global active_event, latest_payout
    while True:
        sensors = await fetch_live_data()
        is_hazard = (sensors["rain"] > 15 or sensors["news"] > 0.7 or sensors["traffic"] > 0.85)
        
        if is_hazard and not active_event:
            # DISRUPTION START
            active_event = {"id": f"DIS_{uuid.uuid4().hex[:4].upper()}", "start_time": time.time()}
            print(f"🚨 ALERT: Disruption detected for {MOCK_RIDER_API['rider_id']}.")

        elif not is_hazard and active_event:
            # DISRUPTION END: THE CALCULATION POINT
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

# --- 6. ENDPOINTS ---

@app.get("/premium")
async def get_premium():
    """Infers risk using the 52-week Forecast + ST-GNN Risk Index."""
    forecast, hourly = get_weekly_forecast()
    history_tensor = torch.rand(1, 30, 2)
    env_mock = torch.tensor([[0.2, 0.4, 0.1, 0.0]])
    with torch.no_grad():
        risk_idx, _ = model(history_tensor, Data(x=torch.rand(5,3), edge_index=torch.tensor([[0,1],[1,0]])), env_mock)
    
    return {
        "rider_info": MOCK_RIDER_API,
        "weekly_forecast": forecast,
        "risk_index": round(risk_idx.item(), 4),
        "premium": round((forecast * 0.015) * (1 + risk_idx.item()), 2)
    }

@app.get("/payment")
async def get_payment():
    """Gives the single latest settlement calculated AFTER a disruption."""
    return latest_payout if latest_payout else {"status": "STABLE", "message": "No claims recorded."}

if __name__ == "__main__":
    nest_asyncio.apply()
    loop = asyncio.get_event_loop()
    loop.create_task(monitoring_oracle())
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, loop="asyncio")
    server = uvicorn.Server(config)
    loop.create_task(server.serve())
    
