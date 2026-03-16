import torch
import torch.nn as nn
import requests
import pandas as pd
import numpy as np
import json
import uvicorn
from datetime import datetime, timedelta
from torch_geometric.nn import GATConv
from torch_geometric.data import Data
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from tqdm import tqdm

# --- 1. CONFIGURATION & KEYS ---
NEWS_API_KEY = "dbc2b8e04d37483e8120bf6952ef29d6"
OPENWEATHER_KEY = "80ae093d307636ca0b7bbccbd35afb9b"

app = FastAPI(title="Indic AI: Zero-Touch Parametric Service")

# --- 2. AI ARCHITECTURE (ST-GNN + TRANSFORMER) ---
class IndicNationalSTGNN(nn.Module):
    def __init__(self):
        super().__init__()
        # Time-Series Forecasting (Transformer)
        self.ts_encoder = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(d_model=1, nhead=1, batch_first=True), num_layers=2
        )
        self.ts_decoder = nn.Linear(1, 7) 

        # Spatial Risk (GNN)
        self.gat = GATConv(3, 16, heads=2)
        
        # Environmental Fusion
        layer = nn.TransformerEncoderLayer(d_model=4, nhead=2, batch_first=True)
        self.env_transformer = nn.TransformerEncoder(layer, num_layers=2)
        
        # Fusion Head: [GAT + Env + TS_Forecast]
        self.fc = nn.Sequential(nn.Linear(32 + 4 + 7, 1), nn.Sigmoid())

    def forward(self, g, e, h):
        forecast = self.ts_decoder(self.ts_encoder(h)[:, -1, :])
        s = torch.mean(torch.relu(self.gat(g.x, g.edge_index)), dim=0).repeat(e.size(0), 1)
        t = self.env_transformer(e)[:, -1, :]
        risk_score = self.fc(torch.cat((s, t, forecast), dim=1))
        return risk_score, forecast

# Global Model Instance
model = IndicNationalSTGNN()
payout_history = [] # In-memory DB for the demo

# --- 3. HELPER: DATA GENERATOR ---
def generate_pro_history():
    """Generates the 52-week 'Star Performer' baseline for the Transformer."""
    np.random.seed(42)
    dates = [datetime.now() - timedelta(days=i) for i in range(365)]
    data = [round(1300 * (1.35 if d.weekday() >= 4 else 1.0) * np.random.uniform(0.9, 1.1), 2) for d in dates]
    return pd.DataFrame({"earnings": data[::-1]})

# --- 4. API SCHEMAS ---
class PremiumRequest(BaseModel):
    city: str = "Bangalore"

class PayoutRequest(BaseModel):
    disruption_id: str
    duration_hrs: float
    cargo_type: str = "Standard_Meal"
    forecasted_income: float
    hourly_rate: float
    ambient_temp: float

# --- 5. ENDPOINT A: PREMIUM CALCULATION (PRE-WORK) ---
@app.post("/get-premium")
async def get_premium(req: PremiumRequest):
    history = generate_pro_history()
    h_tensor = torch.tensor(history['earnings'].values[-30:], dtype=torch.float32).view(1, 30, 1)
    
    # Live API Fetching
    try:
        w_url = f"http://api.openweathermap.org/data/2.5/weather?q={req.city},IN&appid={OPENWEATHER_KEY}&units=metric"
        w_res = requests.get(w_url).json()
        temp = w_res['main']['temp'] if 'main' in w_res else 32.0
        rain = w_res.get('rain', {}).get('1h', 0) if 'main' in w_res else 0.0
    except: temp, rain = 32.0, 0.0

    env_tensor = torch.tensor([[[temp/40, rain/50, 0.0, 0.9]]]).repeat(1, 7, 1)
    mock_g = Data(x=torch.rand(5,3), edge_index=torch.tensor([[0,1],[1,0]]))
    
    with torch.no_grad():
        risk_idx, _ = model(mock_g, env_tensor, h_tensor)
    
    weekly_forecast = history['earnings'].tail(7).mean() * 7.15
    premium = (weekly_forecast * 0.01) * (1 + risk_idx.item())

    return {
        "status": "SUCCESS",
        "forecasted_income": round(weekly_forecast, 2),
        "risk_index": round(risk_idx.item(), 4),
        "premium_to_collect": round(premium, 2),
        "hourly_rate": round(weekly_forecast / 70, 2),
        "ambient_temp": temp
    }

# --- 6. ENDPOINT B: PAYOUT SETTLEMENT (POST-DISRUPTION) ---
@app.post("/get-payout")
async def get_payout(req: PayoutRequest):
    # Idempotency Check (Prevent double payout)
    if any(p['disruption_id'] == req.disruption_id for p in payout_history):
        raise HTTPException(status_code=400, detail="Disruption ID already settled.")

    # Biological Spoilage Logic
    l_decay = {"Ultra_Perishable": 2.5, "Standard_Meal": 1.0, "Stable": 0.2}.get(req.cargo_type, 1.0)
    temp_accel = 1.0 + (max(0, req.ambient_temp - 32) * 0.1)
    decay_score = req.duration_hrs * l_decay * temp_accel
    
    is_spoiled = decay_score > 2.0
    payout = req.hourly_rate * req.duration_hrs * (1.5 if is_spoiled else 1.0)
    
    receipt = {
        "disruption_id": req.disruption_id,
        "payout_amount": round(payout, 2),
        "cargo_spoiled": bool(is_spoiled),
        "decay_index": round(decay_score, 3),
        "timestamp": datetime.now().isoformat()
    }
    
    payout_history.append(receipt)
    return receipt

if __name__ == "__main__":
    print("Starting Indic AI Zero-Touch Service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
