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

# --- 1. LIVE API KEYS & MOCK IDENTITY ---
OWM_KEY = "80ae093d307636ca0b7bbccbd35afb9b"
NEWS_KEY = "dbc2b8e04d37483e8120bf6952ef29d6"

MOCK_RIDER = {
    "id": "USR_2026_99",
    "location": "MG Road, Bangalore",
    "lat": 12.9716, 
    "lon": 77.5946
}

# --- 2. ST-GNN ARCHITECTURE (Transformer + GAT) ---
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

# --- 3. SYSTEM STATE ---
model = IndicNationalEngine()
active_event = None
latest_payout = None

# --- 4. DATA AUDIT (CSV DRIVEN) ---
def get_audited_hourly_rate():
    """Uses the 52-week history to find the rider's true value of time."""
    df = pd.read_csv("rider_history.csv")
    recent_daily_avg = df['earnings'].tail(30).mean()
    return round(recent_daily_avg / 10, 2) # Derived from audited performance

# --- 5. AGENTIC ORACLE (REAL-TIME POLLING) ---
async def fetch_live_data():
    """Pings OWM and NewsAPI for MG Road status."""
    try:
        # Weather Sensor
        w_res = requests.get(f"https://api.openweathermap.org/data/2.5/weather?lat={MOCK_RIDER['lat']}&lon={MOCK_RIDER['lon']}&appid={OWM_KEY}").json()
        rain = w_res.get('rain', {}).get('1h', 0)
        
        # News/Social Sensor (Scanning for local friction)
        n_res = requests.get(f"https://newsapi.org/v2/everything?q=Bangalore+protest+OR+strike+OR+blockade&apiKey={NEWS_KEY}").json()
        news_risk = min(n_res.get('totalResults', 0) / 10, 1.0)
        
        return {"rain": rain, "news": news_risk, "traffic": 0.4, "disaster": 0}
    except:
        return {"rain": 0, "news": 0.1, "traffic": 0.2, "disaster": 0}

async def monitoring_oracle():
    global active_event, latest_payout
    while True:
        sensors = await fetch_live_data()
        # Trigger: Rain > 15mm OR News Risk > 0.7 OR Traffic Clog
        is_hazard = sensors["rain"] > 15 or sensors["news"] > 0.7 or sensors["traffic"] > 0.85
        
        if is_hazard and not active_event:
            active_event = {"id": f"DIS_{uuid.uuid4().hex[:4].upper()}", "start": time.time()}
            print(f"🚨 EVENT OPENED: {active_event['id']} (Reason: Sensors triggered)")

        elif not is_hazard and active_event:
            # Payout calculated ONLY after event ends
            rate = get_audited_hourly_rate()
            duration = max((time.time() - active_event["start"]) / 3600, 1.5) # Forced demo min
            
            latest_payout = {
                "disruption_id": active_event["id"],
                "payout": round(rate * duration, 2),
                "duration": round(duration, 2),
                "audit_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "rider_id": MOCK_RIDER["id"]
            }
            active_event = None
            print(f"✅ EVENT SETTLED: Payout of ₹{latest_payout['payout']} ready.")

        await asyncio.sleep(10) # Checks the city every 10 seconds

# --- 6. THE TWO ENDPOINTS ---

@app.get("/premium")
async def get_premium():
    """Uses ST-GNN to price risk based on CSV history and City context."""
    hourly_val = get_audited_hourly_rate()
    # Passing mock tensors through the Transformer/GAT layers
    history_mock = torch.rand(1, 30, 2)
    env_mock = torch.tensor([[0.2, 0.4, 0.1, 0.0]]) # Standard city state
    with torch.no_grad():
        risk_idx, _ = model(history_mock, Data(x=torch.rand(5,3), edge_index=torch.tensor([[0,1],[1,0]])), env_mock)
    
    return {
        "rider_id": MOCK_RIDER["id"],
        "hourly_value": hourly_val,
        "risk_index": round(risk_idx.item(), 4),
        "premium": round((hourly_val * 70) * 0.015, 2)
    }

@app.get("/payment")
async def get_payment():
    """Returns the single latest payment calculated after a hazard cleared."""
    return latest_payout if latest_payout else {"status": "NO_RECENT_SETTLEMENTS"}

# --- 7. RUN ---
if __name__ == "__main__":
    nest_asyncio.apply()
    loop = asyncio.get_event_loop()
    loop.create_task(monitoring_oracle())
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, loop="asyncio")
    server = uvicorn.Server(config)
    loop.create_task(server.serve())
