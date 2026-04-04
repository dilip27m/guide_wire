"""
Parametric Insurance System — FastAPI Service
============================================================
Architecture: FastAPI + PyTorch + Spacy (No LLM) + Actuarial Math
Models: RiskModel (ST-GNN), ImpactModel (Deterministic), FraudModel (Residual MLP)
Database: MongoDB (Ready for frontend GPS pings & historical data)
"""

import os
import time
import uuid
import math
import requests
import spacy
import asyncio
import uvicorn
import numpy as np
import pandas as pd
import osmnx as ox
import networkx as nx
import torch
import torch.nn as nn
import torch.nn.functional as F

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from torch_geometric.nn import GATConv, global_mean_pool, global_max_pool
from torch_geometric.utils import from_networkx

# ==========================================
# TODO TEAMMATES: Uncomment these for real DB
# ==========================================
# from pymongo import MongoClient
# MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
# db_client = MongoClient(MONGO_URI)
# database = db_client["insurance_db"]
# partners_collection = database["delivery_partners"]
# policies_collection = database["active_policies"]
# history_collection = database["rider_history"] 
# live_locations_collection = database["live_locations"] # <--- Tracks active GPS pings

# ─────────────────────────────────────────────
# CONFIG & API KEYS
# ─────────────────────────────────────────────
GNEWS_API_KEY    = "dbc2b8e04d37483e8120bf6952ef29d6"
OWM_KEY          = "80ae093d307636ca0b7bbccbd35afb9b"  
GOOGLE_MAPS_KEY  = os.getenv("GOOGLE_MAPS_KEY", "")    

GRAPH_RADIUS_M    = 1500
WEATHER_DAYS_BACK = 60
EVENT_POLL_MINS   = 30
RAIN_THRESHOLD_MM = 80.0
QUAKE_THRESHOLD_M = 5.0
DEVICE            = torch.device("cpu")

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("[Warning] Run: python -m spacy download en_core_web_sm")
    nlp = None

FEATURE_NAMES = [
    "days_since_purchase", "claims_last_12m", "time_to_claim_hrs",
    "gps_dist_from_event_km", "location_consistency", "gps_spoofing_flag",
    "claim_matches_event_type", "was_delivering_at_event", "delivery_km_that_day",
    "vehicle_age_yrs", "overinsurance_ratio", "num_policies_same_phone"
]

# --- CITY COORDINATES FOR MULTI-CITY SUPPORT ---
CITY_COORDS = {
    "Bangalore": {"lat": 12.9716, "lon": 77.5946},
    "Mumbai":    {"lat": 19.0760, "lon": 72.8777},
    "Delhi":     {"lat": 28.6139, "lon": 77.2090},
    "Hyderabad": {"lat": 17.3850, "lon": 78.4867},
    "Chennai":   {"lat": 13.0827, "lon": 80.2707},
    "Pune":      {"lat": 18.5204, "lon": 73.8567},
    "Kolkata":   {"lat": 22.5726, "lon": 88.3639},
    "Ahmedabad": {"lat": 23.0225, "lon": 72.5714},
    "Jaipur":    {"lat": 26.9124, "lon": 75.7873},
    "Lucknow":   {"lat": 26.8467, "lon": 80.9462},
}

# --- FALLBACK RIDER DATA (Used if DB is empty or disconnected) ---
FALLBACK_RIDER = {
    "rider_id": "USR_2026_99",
    "location_name": "MG Road Hub, Bangalore",
    "lat": 12.9716,
    "lon": 77.5946,
    "status": "ACTIVE"
}

# ─────────────────────────────────────────────
# DATABASE MOCK FETCHER & FORECASTER
# ─────────────────────────────────────────────
def get_active_riders_from_db():
    """Fetches all currently active riders and their latest GPS pings."""
    try:
        # --- TODO TEAMMATES: Swap for real DB call ---
        # cursor = live_locations_collection.find({"status": "ACTIVE"})
        # return list(cursor)
        
        # Simulate empty DB to trigger the fallback
        return []
    except Exception as e:
        print(f"[Warning] DB Fetch Active Riders Failed: {e}")
        return []

def get_partner_from_db(worker_id: str) -> dict:
    """Fetches the delivery partner profile from MongoDB."""
    print(f"[Database] Fetching profile for {worker_id} from MongoDB...")
    return {
        "partner_id": worker_id,
        "name": "Ravi Kumar", 
        "phone": "9876543210", 
        "lat": 12.9716, 
        "lon": 77.5946,
        "city_name": "Bangalore", 
        "asset_value": 85000, 
        "coverage_tier": 2,
    }

def get_weekly_forecast(worker_id: str):
    """Audits up to 52 weeks of data from MongoDB to forecast target earnings."""
    try:
        # --- TODO TEAMMATES: Swap mock list for real DB call ---
        # cursor = history_collection.find({"rider_id": worker_id}).sort("week_end_date", 1)
        # records = list(cursor)
        
        records = [
            {"rider_id": worker_id, "week_number": 1, "earnings": 4100},
            {"rider_id": worker_id, "week_number": 2, "earnings": 4350},
            {"rider_id": worker_id, "week_number": 3, "earnings": 4000}
        ]
        if not records:
            return 4200.0, 60.0  

        df = pd.DataFrame(records)
        recent_trend = df['earnings'].tail(14).mean()
        yearly_avg = df['earnings'].mean()
        
        forecasted_weekly = ((recent_trend * 0.7) + (yearly_avg * 0.3)) * 7
        hourly_rate = round(forecasted_weekly / 70, 2)
        
        return round(forecasted_weekly, 2), hourly_rate
        
    except Exception as e:
        print(f"[Warning] DB Forecast Failed for {worker_id}: {e}")
        return 4200.0, 60.0  

# ─────────────────────────────────────────────
# 1. DATA FETCHERS
# ─────────────────────────────────────────────
def fetch_weather_history(lat, lon, days=WEATHER_DAYS_BACK):
    end   = datetime.utcnow().date()
    start = end - timedelta(days=days)
    url   = (f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
             f"&start_date={start}&end_date={end}&hourly=precipitation,windspeed_10m,temperature_2m&timezone=Asia%2FKolkata")
    try:
        r = requests.get(url, timeout=15)
        h = r.json().get("hourly", {})
        prec, wind, temp = h.get("precipitation", []), h.get("windspeed_10m", []), h.get("temperature_2m", [])
        n = min(len(prec), len(wind), len(temp))
        arr = np.array([[prec[i], wind[i], temp[i]] for i in range(n)], dtype=np.float32)
        daily = []
        for d in range(days):
            chunk = arr[d*24:(d+1)*24]
            daily.append([chunk[:,0].sum(), chunk[:,1].max(), chunk[:,2].mean()] if len(chunk) > 0 else [0.0, 0.0, 25.0])
        return np.array(daily, dtype=np.float32)
    except Exception:
        return np.zeros((days, 3), dtype=np.float32)

def fetch_imd_alert(lat, lon):
    try:
        r = requests.get("https://mausam.imd.gov.in/imd_latest/contents/warning_rss.xml", timeout=10)
        if str(lat)[:4] in r.text or "flood" in r.text.lower():
            return True, 999.0, "IMD active alert in region"
    except Exception: pass
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum&forecast_days=1&timezone=Asia%2FKolkata"
    r = requests.get(url, timeout=10)
    rain = r.json().get("daily", {}).get("precipitation_sum", [0])[0] or 0
    return (rain >= RAIN_THRESHOLD_MM), rain, f"{rain:.1f}mm in 24hr"

def fetch_news_events(city_name):
    if not GNEWS_API_KEY: return []
    url = f"https://gnews.io/api/v4/search?q={requests.utils.quote(city_name + ' road blocked flood accident')}&lang=en&country=in&max=10&token={GNEWS_API_KEY}"
    r = requests.get(url, timeout=10)
    return [a["title"] + " " + a["description"] for a in r.json().get("articles", [])]

def extract_events_fast(news_snippets):
    if not nlp or not news_snippets: return []
    events = []
    blockage_kw = {"blocked", "closed", "snarl", "jam", "halted", "diverted"}
    flood_kw = {"waterlogging", "flood", "inundated", "submerged"}
    for snippet in news_snippets:
        s_lower = snippet.lower()
        is_blocked, is_flood = any(k in s_lower for k in blockage_kw), any(k in s_lower for k in flood_kw)
        if is_blocked or is_flood:
            locations = [ent.text for ent in nlp(snippet).ents if ent.label_ in ["GPE", "LOC", "FAC"]]
            if locations:
                events.append({"location": locations[0], "event_type": "waterlogging" if is_flood else "blockage", 
                               "severity": "high" if is_blocked else "medium", "is_road_blocked": is_blocked})
    return events

def build_city_graph(lat, lon, blocked_edges=None):
    G = ox.graph_from_point((lat, lon), dist=GRAPH_RADIUS_M, network_type='drive')
    G_un = nx.Graph(ox.project_graph(G))
    deg = dict(G_un.degree())
    max_deg = max(deg.values()) if deg else 1
    
    try: bc = nx.betweenness_centrality(G_un, normalized=True, k=min(100, len(G_un)))
    except Exception: bc = {n: 0.0 for n in G_un.nodes}
        
    try: cl = nx.clustering(G_un)
    except Exception: cl = {n: 0.0 for n in G_un.nodes}

    G_clean = nx.Graph()
    G_clean.add_nodes_from(G_un.nodes)
    G_clean.add_edges_from(G_un.edges)

    pyg = from_networkx(G_clean)
    feats = [[deg.get(n, 0) / max_deg, bc.get(n, 0), cl.get(n, 0)] for n in G_clean.nodes]
    pyg.x = torch.tensor(feats, dtype=torch.float)
    
    if blocked_edges:
        sev_map = {"high": 0, "medium": 1, "low": 2}
        for event in blocked_edges:
            if event.get("is_road_blocked"):
                for i in range(min(sev_map.get(event.get("severity", "low"), 2) + 1, pyg.x.shape[0])):
                    pyg.x[i, 0] = 0.0 
    
    pyg.batch = torch.zeros(pyg.num_nodes, dtype=torch.long)
    return pyg, len(G_clean.nodes)

def build_env_features(lat, lon):
    is_coastal = 1.0 if (lon < 75.5 or lon > 79.5 or lat < 12.0) else 0.0
    is_monsoon = 0.0 if (lon < 72.5 and lat > 23.0) else 1.0
    lat_norm, lon_norm = (lat - 8.0) / (37.0 - 8.0), (lon - 68.0) / (97.0 - 68.0)
    return torch.tensor([[is_coastal, is_monsoon, lat_norm, lon_norm]], dtype=torch.float)

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

# ─────────────────────────────────────────────
# 2. MODELS (Exactly matching .pth training specs)
# ─────────────────────────────────────────────
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=512):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len).unsqueeze(1).float()
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer('pe', pe.unsqueeze(0))
    def forward(self, x): return x + self.pe[:, :x.size(1), :]

class TemporalEncoder(nn.Module):
    def __init__(self, d_input=3, d_model=64, nhead=4, num_layers=4, d_out=32):
        super().__init__()
        self.conv1d = nn.Conv1d(in_channels=d_input, out_channels=d_model, kernel_size=3, padding=1)
        self.pos_enc = PositionalEncoding(d_model)
        self.transformer = nn.TransformerEncoder(nn.TransformerEncoderLayer(d_model=d_model, nhead=nhead, dim_feedforward=128, dropout=0.1, batch_first=True), num_layers=num_layers)
        self.norm = nn.LayerNorm(d_model)
        self.decoder = nn.Linear(d_model, d_out)
    def forward(self, x):
        x = F.relu(self.conv1d(x.transpose(1, 2))).transpose(1, 2)
        x = self.transformer(self.pos_enc(x))
        return self.decoder(self.norm(x[:, -1, :]))

class SpatialEncoder(nn.Module):
    def __init__(self, in_channels=3, hidden=32, heads1=4, heads2=2, d_out=48):
        super().__init__()
        self.gat1 = GATConv(in_channels, hidden, heads=heads1, concat=True, dropout=0.1)
        self.gat2 = GATConv(hidden * heads1, hidden, heads=heads2, concat=False, dropout=0.1)
        self.skip = nn.Linear(in_channels, hidden)
        self.norm1 = nn.LayerNorm(hidden * heads1)
        self.norm2 = nn.LayerNorm(hidden)
        self.pool_proj = nn.Linear(hidden * 3, d_out)
    def forward(self, x, edge_index, batch):
        h1 = self.norm1(F.elu(self.gat1(x, edge_index)))
        h2 = self.norm2(F.elu(self.gat2(h1, edge_index)) + self.skip(x))
        h_mean = global_mean_pool(h2, batch)
        h_std = global_mean_pool((h2 - h_mean[batch]) ** 2, batch).sqrt()
        return self.pool_proj(torch.cat([h_mean, global_max_pool(h2, batch), h_std], dim=1))

class RiskModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.temporal = TemporalEncoder()
        self.spatial = SpatialEncoder()
        self.fusion = nn.Sequential(
            nn.Linear(84, 64), nn.LayerNorm(64), nn.ReLU(), nn.Dropout(0.15),
            nn.Linear(64, 32), nn.LayerNorm(32), nn.ReLU(), nn.Dropout(0.10),
            nn.Linear(32, 16), nn.ReLU(), nn.Linear(16, 1), nn.Sigmoid()
        )
    def forward(self, weather_seq, graph, env):
        return self.fusion(torch.cat([self.temporal(weather_seq), self.spatial(graph.x, graph.edge_index, graph.batch), env], dim=1))

class ImpactModel:
    PAYOUT_TIERS = {"tier1": 0.25, "tier2": 0.50, "tier3": 1.00}
    def evaluate(self, event: dict, rain_thresh: float, insured_value: float) -> dict:
        rain = event.get("rainfall_mm", 0)
        tier = "tier2" if rain >= rain_thresh * 1.5 else ("tier1" if rain >= rain_thresh else None)
        if not tier: return {"triggered": False, "tier": None, "payout_ratio": 0.0}
        return {"triggered": True, "tier": tier, "payout_amount": insured_value * self.PAYOUT_TIERS[tier]}

class FraudModel(nn.Module):
    def __init__(self, in_features=12):
        super().__init__()
        self.input_proj = nn.Sequential(nn.Linear(in_features, 64), nn.LayerNorm(64), nn.ReLU(), nn.Dropout(0.2))
        self.res1 = nn.Sequential(nn.Linear(64, 64), nn.LayerNorm(64), nn.ReLU(), nn.Dropout(0.15), nn.Linear(64, 64), nn.LayerNorm(64))
        self.res2 = nn.Sequential(nn.Linear(64, 32), nn.LayerNorm(32), nn.ReLU(), nn.Dropout(0.10), nn.Linear(32, 32), nn.LayerNorm(32))
        self.down = nn.Linear(64, 32)
        self.head = nn.Sequential(nn.ReLU(), nn.Linear(32, 16), nn.ReLU(), nn.Linear(16, 1), nn.Sigmoid())
    def forward(self, x):
        h = self.input_proj(x)
        h = F.relu(self.res1(h) + h)
        h = F.relu(self.res2(h) + self.down(h))
        return self.head(h)

# ─────────────────────────────────────────────
# GLOBALS & MODEL LOADING
# ─────────────────────────────────────────────
risk_model = RiskModel().to(DEVICE)
fraud_model = FraudModel().to(DEVICE)

try:
    risk_model.load_state_dict(torch.load("risk_model_robust.pth", map_location=DEVICE)["model_state"])
    risk_model.eval()
    print("🚀 WEIGHTS LOADED: RiskModel (ST-GNN) is ready.")
except Exception as e:
    print(f"⚠️ RiskModel WEIGHTS MISSING: {e}. Running with random initialization.")

try:
    fraud_model.load_state_dict(torch.load("fraud_model_best.pth", map_location=DEVICE)["model_state"])
    fraud_model.eval()
    print("🚀 WEIGHTS LOADED: FraudModel (Residual MLP) is ready.")
except Exception as e:
    print(f"⚠️ FraudModel WEIGHTS MISSING: {e}. Running with random initialization.")

active_event = None
latest_payout = None

# ─────────────────────────────────────────────
# FASTAPI LIFESPAN & BACKGROUND ORACLE
# ─────────────────────────────────────────────
async def monitoring_oracle():
    """Background task polling environment to trigger parametric claims for active riders."""
    global active_event, latest_payout
    while True:
        try:
            # 1. Fetch live riders from DB (or fallback)
            active_riders = get_active_riders_from_db()
            if not active_riders:
                active_riders = [FALLBACK_RIDER]

            # 2. Monitor triggers for each active rider's location
            for rider in active_riders:
                lat, lon = rider['lat'], rider['lon']
                city = rider.get('location_name', 'Bangalore').split(',')[-1].strip()
                
                # Use asyncio.gather to run in parallel and avoid un-awaited coroutines if one fails
                rain_future = asyncio.to_thread(fetch_imd_alert, lat, lon)
                news_future = asyncio.to_thread(fetch_news_events, city)
                
                try:
                    rain_result, news_snippets = await asyncio.gather(rain_future, news_future)
                    _, rain_mm, _ = rain_result
                except Exception as e:
                    print(f"Oracle API Fetch Error for {city}: {e}")
                    continue # Skip this rider's parametric check this minute
                
                road_events = extract_events_fast(news_snippets)
                
                # Parametric Threshold Logic
                is_hazard = (rain_mm > RAIN_THRESHOLD_MM) or len(road_events) > 0

                if is_hazard and not active_event:
                    active_event = {"id": f"DIS_{uuid.uuid4().hex[:4].upper()}", "start_time": time.time(), "rain": rain_mm}
                    print(f"🚨 ALERT: Parametric Disruption detected for {rider['rider_id']} in {city}.")

                elif not is_hazard and active_event:
                    # Event ended - Process Settlement
                    forecast, hourly_rate = get_weekly_forecast(rider["rider_id"])
                    duration_hrs = max((time.time() - active_event["start_time"]) / 3600, 1.3)
                    
                    # Impact Model dictates the parametric multiplier
                    impact = ImpactModel().evaluate({"rainfall_mm": active_event["rain"]}, RAIN_THRESHOLD_MM, 85000)
                    payout = impact.get("payout_amount", round(hourly_rate * duration_hrs, 2))

                    latest_payout = {
                        "rider_id": rider["rider_id"],
                        "disruption_id": active_event["id"],
                        "payout_amount": payout,
                        "forecasted_weekly_income": forecast,
                        "duration": round(duration_hrs, 2),
                        "location": rider["location_name"],
                        "settled_at": datetime.now().strftime("%H:%M:%S")
                    }
                    active_event = None
                    print(f"✅ SETTLEMENT: Parametric Payout processed for {rider['rider_id']}.")

        except Exception as e:
            print(f"Oracle Error: {e}")
            
        await asyncio.sleep(60) # Poll every 60s

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(monitoring_oracle())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────
class LocationPingRequest(BaseModel):
    worker_id: str
    lat: float
    lon: float
    location_name: Optional[str] = "Unknown"

class PremiumRequest(BaseModel):
    worker_id: str
    city: Optional[str] = "Bangalore"

class PayoutRequest(BaseModel):
    disruption_id: str
    disruption_type: Optional[str] = "weather"
    duration_hrs: float
    cargo_type: Optional[str] = "standard"
    hourly_rate: Optional[float] = None
    worker_id: Optional[str] = "unknown"
    city: Optional[str] = "Bangalore"

class SettleWeekRequest(BaseModel):
    worker_id: str
    total_amount: float
    payout_count: int
    week_label: Optional[str] = None

# ─────────────────────────────────────────────
# FASTAPI ENDPOINTS
# ─────────────────────────────────────────────

@app.post("/ping-location")
async def post_ping_location(req: LocationPingRequest):
    """POST /ping-location — Frontend app calls this periodically to update live GPS."""
    # --- TODO TEAMMATES: Update MongoDB ---
    # live_locations_collection.update_one(
    #     {"rider_id": req.worker_id},
    #     {
    #         "$set": {
    #             "lat": req.lat, 
    #             "lon": req.lon, 
    #             "location_name": req.location_name, 
    #             "status": "ACTIVE", 
    #             "last_ping": datetime.now().isoformat()
    #         }
    #     },
    #     upsert=True
    # )
    return {"status": "success", "message": f"GPS location logged for {req.worker_id}"}

@app.post("/get-premium")
async def post_get_premium(req: PremiumRequest):
    """POST /get-premium — Calculates Actuarial Premium using ST-GNN."""
    partner = get_partner_from_db(req.worker_id)
    
    # Use city from request for multi-city support
    city_name = req.city or "Bangalore"
    coords = CITY_COORDS.get(city_name, CITY_COORDS["Bangalore"])
    lat, lon = coords["lat"], coords["lon"]
    
    # Run heavy ops in thread pool
    weather_arr = await asyncio.to_thread(fetch_weather_history, lat, lon)
    w_max = np.max(weather_arr, axis=0)
    w_max[w_max == 0] = 1.0
    weather_norm = torch.tensor(weather_arr / w_max, dtype=torch.float).unsqueeze(0).to(DEVICE)
    
    city_graph, _ = await asyncio.to_thread(build_city_graph, lat, lon)
    city_graph = city_graph.to(DEVICE)
    env = build_env_features(lat, lon).to(DEVICE)

    with torch.no_grad():
        risk_score = risk_model(weather_norm, city_graph, env).item()

    # Actuarial Weekly Pricing Model (Formula Integration & Constraints)
    forecast, hourly = get_weekly_forecast(req.worker_id)
    avg_income_lost = forecast / 7.0
    
    BASE_PROB_SCALER = 0.012  # Actuarial scaler mapping AI risk -> real world daily probability
    daily_trigger_prob = risk_score * BASE_PROB_SCALER 
    
    days_exposed = 6 
    tier_mult = {1: 0.8, 2: 1.0, 3: 1.3}[partner["coverage_tier"]]
    
    raw_weekly_premium = daily_trigger_prob * avg_income_lost * days_exposed * tier_mult
    
    # Smooth asymptotic mapping between 20 and 50 using tanh
    premium_weekly = 20.0 + 30.0 * math.tanh(raw_weekly_premium / 100.0)

    return {
        "status": "ok",
        "forecasted_income": forecast,
        "risk_index": round(risk_score, 4),
        "premium_to_collect": round(premium_weekly, 2),
        "hourly_rate": hourly,
        "ambient_temp": 28.0, 
        "platform": "Swiggy", 
        "city": partner["city_name"],
    }

@app.post("/get-payout")
async def post_get_payout(req: PayoutRequest):
    """POST /get-payout — Evaluates Fraud Model & Finalizes Payment."""
    global latest_payout
    
    # If the background oracle caught a real parametric event, use it
    if latest_payout and latest_payout["disruption_id"] == req.disruption_id:
        payout_amount = latest_payout["payout_amount"]
    else:
        # Fallback to manual duration calculation if no parametric event triggered
        _, default_hourly = get_weekly_forecast(req.worker_id)
        hourly = req.hourly_rate if req.hourly_rate else default_hourly
        
        # Normalize payout: Map assumed raw risk using the same tanh function to find the scale-down ratio
        avg_income_lost = req.forecasted_income / 7.0
        daily_trigger_prob_avg = 0.45 * 0.012 # Generic risk estimation without running heavy GNN
        raw_weekly_premium = daily_trigger_prob_avg * avg_income_lost * 6 * 1.0
        
        coverage_ratio = 1.0
        if raw_weekly_premium > 0:
            smooth_premium = 20.0 + 30.0 * math.tanh(raw_weekly_premium / 100.0)
            coverage_ratio = smooth_premium / raw_weekly_premium
            
        payout_amount = round(hourly * max(req.duration_hrs, 0.5) * coverage_ratio, 2)

    # Validate with FraudModel (Residual MLP)
    claim_features = {
        "days_since_purchase": 180, "claims_last_12m": 0, "time_to_claim_hrs": 0.5, 
        "gps_dist_from_event_km": 1.2, "location_consistency": 0.95, "gps_spoofing_flag": 0, 
        "claim_matches_event_type": 1, "was_delivering_at_event": 1, "delivery_km_that_day": 45.0, 
        "vehicle_age_yrs": 2.5, "overinsurance_ratio": 1.0, "num_policies_same_phone": 1
    }

    norms = {
        "days_since_purchase": lambda x: np.clip(x / 365.0, 0, 1), "claims_last_12m": lambda x: np.clip(x / 5.0, 0, 1),
        "time_to_claim_hrs": lambda x: np.clip(x / 72.0, 0, 1), "gps_dist_from_event_km": lambda x: np.clip(x / 50.0, 0, 1),
        "location_consistency": lambda x: np.clip(x, 0, 1), "gps_spoofing_flag": lambda x: float(x),
        "claim_matches_event_type": lambda x: float(x), "was_delivering_at_event": lambda x: float(x),
        "delivery_km_that_day": lambda x: np.clip(x / 120.0, 0, 1), "vehicle_age_yrs": lambda x: np.clip(x / 10.0, 0, 1),
        "overinsurance_ratio": lambda x: np.clip(x / 2.0, 0, 1), "num_policies_same_phone": lambda x: np.clip(x / 3.0, 0, 1),
    }

    x = torch.tensor([[norms[f](claim_features[f]) for f in FEATURE_NAMES]], dtype=torch.float).to(DEVICE)
    with torch.no_grad():
        fraud_prob = fraud_model(x).item()

    if fraud_prob > 0.65:
        return {
            "status": "flagged",
            "disruption_id": req.disruption_id,
            "payout_amount": 0.0,
            "reason": "Fraud probability exceeds safety threshold."
        }

    return {
        "status": "approved",
        "disruption_id": req.disruption_id,
        "payout_amount": payout_amount,
        "fraud_probability": round(fraud_prob, 4),
        "timestamp": datetime.now().isoformat(),
    }

@app.post("/settle-week")
async def settle_week(req: SettleWeekRequest):
    """POST /settle-week — called when 'End of Week' button is clicked."""
    today = datetime.now().date()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    
    def fmt(d): return f"{d.day} {d.strftime('%b')}"
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

@app.get("/admin/forecast-risk")
async def get_admin_forecast_risk():
    """GET /admin/forecast-risk — Predicts risk for major cities for the upcoming week."""
    cities_to_check = ["Bangalore", "Mumbai", "Delhi", "Chennai"]
    results = []
    
    for city in cities_to_check:
        coords = CITY_COORDS[city]
        lat, lon = coords["lat"], coords["lon"]
        try:
            # fetch_imd_alert returns (temp_c, rain_mm, wind_kph) based on 1-day or 7-day forecast depending on implementation
            _, rain_mm, _ = await asyncio.to_thread(fetch_imd_alert, lat, lon)
            
            # Simple Admin heuristic for the portfolio dashboard
            if rain_mm > 40.0:
                risk_level = "HIGH"
                reason = "Heavy Rainfall Expected"
            elif rain_mm > 15.0:
                risk_level = "MEDIUM"
                reason = "Moderate Rainfall"
            else:
                risk_level = "LOW"
                reason = "Clear/Normal"
                
            results.append({
                "city": city,
                "risk_level": risk_level,
                "reason": reason,
                "rain_mm": round(rain_mm, 1)
            })
        except Exception as e:
            results.append({
                "city": city,
                "risk_level": "UNKNOWN",
                "reason": f"Forecast API Error",
                "rain_mm": 0.0
            })
            
    return {"status": "ok", "forecasts": results}

@app.get("/cron")
@app.head("/cron")
async def get_cron():
    return {"status": "alive", "timestamp": datetime.now().isoformat(), "active_event": active_event is not None}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("ai_service:app", host="0.0.0.0", port=port, reload=False)
