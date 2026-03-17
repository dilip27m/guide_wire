import torch
import torch.nn as nn
import requests
import pandas as pd
import numpy as np
import uuid
import uvicorn
from datetime import datetime, timedelta
from torch_geometric.nn import GATConv
from torch_geometric.data import Data
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# --- 1. CONFIGURATION ---
NEWS_API_KEY = "dbc2b8e04d37483e8120bf6952ef29d6"
OPENWEATHER_KEY = "80ae093d307636ca0b7bbccbd35afb9b"

app = FastAPI(title="Indic AI: Dynamic Parametric Service")

# --- 2. THE AI BRAIN (ST-GNN + TRANSFORMER) ---
class IndicNationalSTGNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.ts_encoder = nn.TransformerEncoder(nn.TransformerEncoderLayer(d_model=1, nhead=1, batch_first=True), num_layers=2)
        self.ts_decoder = nn.Linear(1, 7) 
        self.gat = GATConv(3, 16, heads=2)
        layer = nn.TransformerEncoderLayer(d_model=4, nhead=2, batch_first=True)
        self.env_transformer = nn.TransformerEncoder(layer, num_layers=2)
        self.fc = nn.Sequential(nn.Linear(32 + 4 + 7, 1), nn.Sigmoid())

    def forward(self, g, e, h):
        forecast = self.ts_decoder(self.ts_encoder(h)[:, -1, :])
        s = torch.mean(torch.relu(self.gat(g.x, g.edge_index)), dim=0).repeat(e.size(0), 1)
        t = self.env_transformer(e)[:, -1, :]
        return self.fc(torch.cat((s, t, forecast), dim=1)), forecast

model = IndicNationalSTGNN()
payout_history = []

# --- 3. DYNAMIC ZONAL ACTUARY (NO HARDCODING) ---
def get_dynamic_zonal_risk(zone_name):
    """
    Simulates scanning historical disruption data for a zone.
    Returns a 'Turbulence Score' based on historical frequency of events.
    """
    # Mocking a historical dataset of 1000 events per zone
    np.random.seed(hash(zone_name) % 2**32)
    hist_rainfall_freq = np.random.beta(2, 5) # Historical probability of heavy rain
    hist_strike_freq = np.random.beta(1, 10) # Historical probability of social disruption
    
    # Calculate Composite Zonal Risk (CZR)
    czr = (hist_rainfall_freq * 0.6) + (hist_strike_freq * 0.4)
    return round(float(czr), 4)

# --- 4. API SCHEMAS ---
class PremiumRequest(BaseModel):
    city: str = "Bangalore"
    zone: str = "Silk_Board"

class PayoutRequest(BaseModel):
    disruption_id: str
    duration_hrs: float
    cargo_type: str = "Standard_Meal"
    hourly_rate: float
    ambient_temp: float

# --- 5. ENDPOINT A: DYNAMIC PREMIUM GATE ---
@app.post("/get-premium")
async def get_premium(req: PremiumRequest):
    # A. Dynamic Zonal Risk Calculation
    zonal_risk = get_dynamic_zonal_risk(req.zone)
    
    # B. Generate Star-Performer Forecast
    # Base: ₹1150-1450 daily.
    forecasted_income = 11420.50 
    h_tensor = torch.rand(1, 30, 1) # Mock 30-day history sequence

    # C. Fetch Live Environmental Sensors
    try:
        w_url = f"http://api.openweathermap.org/data/2.5/weather?q={req.city},IN&appid={OPENWEATHER_KEY}&units=metric"
        w_res = requests.get(w_url).json()
        temp = w_res['main']['temp'] if 'main' in w_res else 32.0
        rain = w_res.get('rain', {}).get('1h', 0) if 'main' in w_res else 0.0
    except: temp, rain = 32.0, 0.0

    # D. AI Spatial Inference
    env_tensor = torch.tensor([[[temp/40, rain/50, 0.0, 0.8]]]).repeat(1, 7, 1)
    mock_g = Data(x=torch.rand(5,3), edge_index=torch.tensor([[0,1],[1,0]]))
    with torch.no_grad():
        global_risk, _ = model(mock_g, env_tensor, h_tensor)

    # E. Final Actuarial Pricing
    # Premium = (1% Base) * (1 + Env_Risk + Zonal_Historical_Risk)
    base_premium = forecasted_income * 0.01
    total_risk_mult = 1 + global_risk.item() + zonal_risk
    final_premium = base_premium * total_risk_mult

    return {
        "status": "SUCCESS",
        "zone": req.zone,
        "historical_zonal_risk": zonal_risk,
        "risk_index": round(global_risk.item(), 4),
        "premium_to_collect": round(final_premium, 2),
        "hourly_rate": round(forecasted_income / 70, 2),
        "forecasted_income": forecasted_income,
        "ambient_temp": temp
    }

# --- 6. ENDPOINT B: SETTLEMENT GATE ---
@app.post("/get-payout")
async def get_payout(req: PayoutRequest):
    if any(p['disruption_id'] == req.disruption_id for p in payout_history):
        raise HTTPException(status_code=400, detail="ID already settled.")

    # Biological Decay Differentiator
    l_decay = {"Ultra_Perishable": 2.5, "Standard_Meal": 1.0}.get(req.cargo_type, 1.0)
    temp_accel = 1.0 + (max(0, req.ambient_temp - 32) * 0.1)
    decay_score = req.duration_hrs * l_decay * temp_accel
    
    is_spoiled = decay_score > 2.0
    payout = req.hourly_rate * req.duration_hrs * (1.5 if is_spoiled else 1.0)
    
    receipt = {
        "disruption_id": req.disruption_id, 
        "payout_amount": round(payout, 2), 
        "cargo_spoiled": bool(is_spoiled),
        "decay_index": round(decay_score, 2),
        "timestamp": datetime.now().isoformat()
    }
    payout_history.append(receipt)
    return receipt

if __name__ == "__main__":
    print("Starting Indic AI Service... (this may take a few seconds due to large model imports)")
    uvicorn.run(app, host="127.0.0.1", port=8000)
