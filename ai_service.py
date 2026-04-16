"""
Parametric Insurance System — FastAPI Service
============================================================
Architecture: FastAPI + PyTorch + Spacy (No LLM) + Actuarial Math + Motor (Async DB)
Models: RiskModel (ST-GNN), ImpactModel (Deterministic), FraudModel (Residual MLP)
Database: Async MongoDB (Ready for frontend GPS pings & historical data)

RENDER DEPLOYMENT FIXES (v2):
  - Startup: Use `uvicorn ai_service:app --host 0.0.0.0 --port $PORT`
  - Oracle: 15s startup delay so port binds before background work begins
  - Model loading: Wrapped in try/except with eval() guard
  - PORT binding: Falls back to $PORT env var correctly
"""

import os
import time
import uuid
import math
import requests
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

# ── Async MongoDB Setup ──
import motor.motor_asyncio

# ==========================================
# DATABASE PLACEHOLDER
# BACKEND ENGINEER: Replace this placeholder string with the actual MongoDB URI
# ==========================================
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError(
        "MONGO_URI environment variable is not set. "
        "Set it to your MongoDB Atlas connection string before starting."
    )

try:
    db_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    database = db_client["insurance_db"]
    partners_collection = database["delivery_partners"]
    policies_collection = database["active_policies"]
    history_collection = database["rider_history"]
    live_locations_collection = database["live_locations"]
    print("✅ Connected to Async MongoDB")
except Exception as e:
    print(f"❌ MongoDB Connection Failed: {e}")

# ── Spacy: load lazily to avoid crashing the whole app if model is missing ──
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("[Warning] spaCy model missing. Run: python -m spacy download en_core_web_sm")
    nlp = None
except ImportError:
    print("[Warning] spaCy not installed.")
    nlp = None

# ─────────────────────────────────────────────
# CONFIG & API KEYS
# ─────────────────────────────────────────────
GNEWS_API_KEY     = os.getenv("GNEWS_API_KEY", "dbc2b8e04d37483e8120bf6952ef29d6")  # fallback for demo
OWM_API_KEY       = os.getenv("OWM_API_KEY", "")   # OpenWeatherMap — used for AQI trigger
GOOGLE_MAPS_KEY   = os.getenv("GOOGLE_MAPS_KEY", "")

GRAPH_RADIUS_M    = 1500
WEATHER_DAYS_BACK = 60
EVENT_POLL_MINS   = 30
RAIN_THRESHOLD_MM = 80.0
QUAKE_THRESHOLD_M = 5.0
DEVICE            = torch.device("cpu")

FEATURE_NAMES = [
    "days_since_purchase", "claims_last_12m", "time_to_claim_hrs",
    "gps_dist_from_event_km", "location_consistency", "gps_spoofing_flag",
    "claim_matches_event_type", "was_delivering_at_event", "delivery_km_that_day",
    "vehicle_age_yrs", "overinsurance_ratio", "num_policies_same_phone"
]

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

FALLBACK_RIDER = {
    "rider_id": "USR_2026_99",
    "location_name": "MG Road Hub, Bangalore",
    "lat": 12.9716,
    "lon": 77.5946,
    "status": "ACTIVE"
}

# ─────────────────────────────────────────────
# ASYNC DATABASE FETCHERS & FORECASTER
# ─────────────────────────────────────────────
async def get_active_riders_from_db():
    """Fetches all currently active riders and their latest GPS pings asynchronously."""
    try:
        cursor = live_locations_collection.find({"status": "ACTIVE"})
        return await cursor.to_list(length=1000)
    except Exception as e:
        print(f"[Warning] DB Fetch Active Riders Failed: {e}")
        return []

async def get_partner_from_db(worker_id: str) -> dict:
    """Fetches the delivery partner profile from MongoDB asynchronously."""
    partner = await partners_collection.find_one({"partner_id": worker_id})
    if not partner:
        print(f"[Warning] DB Fetch Partner Failed for {worker_id}, using fallback.")
        return {
            "partner_id": worker_id,
            "name": "Fallback User",
            "phone": "0000000000",
            "lat": 12.9716,
            "lon": 77.5946,
            "city_name": "Bangalore",
            "asset_value": 85000,
            "coverage_tier": 2,
            "onboarding_date": datetime.now() - timedelta(days=180),
            "vehicle_registration_date": datetime.now() - timedelta(days=900)
        }
    return partner

async def get_weekly_forecast(worker_id: str):
    """Audits up to 52 weeks of data from MongoDB to forecast target earnings asynchronously."""
    try:
        cursor = history_collection.find({"rider_id": worker_id}).sort("week_end_date", 1).limit(52)
        records = await cursor.to_list(length=52)
        
        if not records:
            return 4200.0, 60.0

        df = pd.DataFrame(records)
        if 'earnings' not in df.columns:
            return 4200.0, 60.0

        recent_trend = df['earnings'].tail(14).mean()
        yearly_avg   = df['earnings'].mean()
        # Each record is a WEEKLY earnings figure — do NOT multiply by 7
        # (was incorrectly multiplying weekly earnings by 7, giving 7× overestimate)
        forecasted_weekly = (recent_trend * 0.7) + (yearly_avg * 0.3)
        hourly_rate = round(forecasted_weekly / 70, 2)  # ~70 active hours/week
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
    url   = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={start}&end_date={end}"
        f"&hourly=precipitation,windspeed_10m,temperature_2m"
        f"&timezone=Asia%2FKolkata"
    )
    try:
        r    = requests.get(url, timeout=15)
        h    = r.json().get("hourly", {})
        prec = h.get("precipitation", [])
        wind = h.get("windspeed_10m", [])
        temp = h.get("temperature_2m", [])
        n    = min(len(prec), len(wind), len(temp))
        arr  = np.array([[prec[i], wind[i], temp[i]] for i in range(n)], dtype=np.float32)
        daily = []
        for d in range(days):
            chunk = arr[d*24:(d+1)*24]
            daily.append(
                [chunk[:, 0].sum(), chunk[:, 1].max(), chunk[:, 2].mean()]
                if len(chunk) > 0 else [0.0, 0.0, 25.0]
            )
        return np.array(daily, dtype=np.float32)
    except Exception:
        return np.zeros((days, 3), dtype=np.float32)

def fetch_imd_alert(lat, lon):
    try:
        r = requests.get("https://mausam.imd.gov.in/imd_latest/contents/warning_rss.xml", timeout=10)
        if str(lat)[:4] in r.text or "flood" in r.text.lower():
            return True, 999.0, "IMD active alert in region"
    except Exception:
        pass
    url  = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&daily=precipitation_sum&forecast_days=1&timezone=Asia%2FKolkata"
    )
    r    = requests.get(url, timeout=10)
    rain = r.json().get("daily", {}).get("precipitation_sum", [0])[0] or 0
    return (rain >= RAIN_THRESHOLD_MM), rain, f"{rain:.1f}mm in 24hr"

def fetch_news_events(city_name):
    if not GNEWS_API_KEY:
        return []
    url = (
        f"https://gnews.io/api/v4/search"
        f"?q={requests.utils.quote(city_name + ' road blocked flood accident')}"
        f"&lang=en&country=in&max=10&token={GNEWS_API_KEY}"
    )
    r = requests.get(url, timeout=10)
    return [a["title"] + " " + a["description"] for a in r.json().get("articles", [])]

def extract_events_fast(news_snippets):
    if not nlp or not news_snippets:
        return []
    events      = []
    blockage_kw = {"blocked", "closed", "snarl", "jam", "halted", "diverted"}
    flood_kw    = {"waterlogging", "flood", "inundated", "submerged"}
    for snippet in news_snippets:
        s_lower     = snippet.lower()
        is_blocked  = any(k in s_lower for k in blockage_kw)
        is_flood    = any(k in s_lower for k in flood_kw)
        if is_blocked or is_flood:
            locations = [ent.text for ent in nlp(snippet).ents if ent.label_ in ["GPE", "LOC", "FAC"]]
            if locations:
                events.append({
                    "location":        locations[0],
                    "event_type":      "waterlogging" if is_flood else "blockage",
                    "severity":        "high" if is_blocked else "medium",
                    "is_road_blocked": is_blocked,
                })
    return events

def build_city_graph(lat, lon, blocked_edges=None):
    G    = ox.graph_from_point((lat, lon), dist=GRAPH_RADIUS_M, network_type='drive')
    G_un = nx.Graph(ox.project_graph(G))
    deg  = dict(G_un.degree())
    max_deg = max(deg.values()) if deg else 1

    try:
        bc = nx.betweenness_centrality(G_un, normalized=True, k=min(100, len(G_un)))
    except Exception:
        bc = {n: 0.0 for n in G_un.nodes}

    try:
        cl = nx.clustering(G_un)
    except Exception:
        cl = {n: 0.0 for n in G_un.nodes}

    G_clean = nx.Graph()
    G_clean.add_nodes_from(G_un.nodes)
    G_clean.add_edges_from(G_un.edges)

    pyg   = from_networkx(G_clean)
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
    is_coastal  = 1.0 if (lon < 75.5 or lon > 79.5 or lat < 12.0) else 0.0
    is_monsoon  = 0.0 if (lon < 72.5 and lat > 23.0) else 1.0
    lat_norm    = (lat - 8.0)  / (37.0 - 8.0)
    lon_norm    = (lon - 68.0) / (97.0 - 68.0)
    return torch.tensor([[is_coastal, is_monsoon, lat_norm, lon_norm]], dtype=torch.float)

def haversine_km(lat1, lon1, lat2, lon2):
    R    = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a    = (math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))

# ─────────────────────────────────────────────
# 2. MODELS (Exactly matching .pth training specs)
# ─────────────────────────────────────────────
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=512):
        super().__init__()
        pe  = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len).unsqueeze(1).float()
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer('pe', pe.unsqueeze(0))

    def forward(self, x):
        return x + self.pe[:, :x.size(1), :]

class TemporalEncoder(nn.Module):
    def __init__(self, d_input=3, d_model=64, nhead=4, num_layers=4, d_out=32):
        super().__init__()
        self.conv1d      = nn.Conv1d(in_channels=d_input, out_channels=d_model, kernel_size=3, padding=1)
        self.pos_enc     = PositionalEncoding(d_model)
        self.transformer = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(d_model=d_model, nhead=nhead, dim_feedforward=128, dropout=0.1, batch_first=True),
            num_layers=num_layers
        )
        self.norm    = nn.LayerNorm(d_model)
        self.decoder = nn.Linear(d_model, d_out)

    def forward(self, x):
        x = F.relu(self.conv1d(x.transpose(1, 2))).transpose(1, 2)
        x = self.transformer(self.pos_enc(x))
        return self.decoder(self.norm(x[:, -1, :]))

class SpatialEncoder(nn.Module):
    def __init__(self, in_channels=3, hidden=32, heads1=4, heads2=2, d_out=48):
        super().__init__()
        self.gat1      = GATConv(in_channels, hidden, heads=heads1, concat=True, dropout=0.1)
        self.gat2      = GATConv(hidden * heads1, hidden, heads=heads2, concat=False, dropout=0.1)
        self.skip      = nn.Linear(in_channels, hidden)
        self.norm1     = nn.LayerNorm(hidden * heads1)
        self.norm2     = nn.LayerNorm(hidden)
        self.pool_proj = nn.Linear(hidden * 3, d_out)

    def forward(self, x, edge_index, batch):
        h1    = self.norm1(F.elu(self.gat1(x, edge_index)))
        h2    = self.norm2(F.elu(self.gat2(h1, edge_index)) + self.skip(x))
        h_mean = global_mean_pool(h2, batch)
        h_std  = global_mean_pool((h2 - h_mean[batch]) ** 2, batch).sqrt()
        return self.pool_proj(torch.cat([h_mean, global_max_pool(h2, batch), h_std], dim=1))

class RiskModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.temporal = TemporalEncoder()
        self.spatial  = SpatialEncoder()
        self.fusion   = nn.Sequential(
            nn.Linear(84, 64), nn.LayerNorm(64), nn.ReLU(), nn.Dropout(0.15),
            nn.Linear(64, 32), nn.LayerNorm(32), nn.ReLU(), nn.Dropout(0.10),
            nn.Linear(32, 16), nn.ReLU(), nn.Linear(16, 1), nn.Sigmoid()
        )

    def forward(self, weather_seq, graph, env):
        return self.fusion(torch.cat([
            self.temporal(weather_seq),
            self.spatial(graph.x, graph.edge_index, graph.batch),
            env
        ], dim=1))

class ImpactModel:
    PAYOUT_TIERS = {"tier1": 0.25, "tier2": 0.50, "tier3": 1.00}

    def evaluate(self, event: dict, rain_thresh: float, insured_value: float) -> dict:
        rain = event.get("rainfall_mm", 0)
        # Fixed: tier3 was previously unreachable (ternary only produced tier1/tier2)
        if rain >= rain_thresh * 2.0:
            tier = "tier3"   # Catastrophic: 200%+ threshold → 100% payout
        elif rain >= rain_thresh * 1.5:
            tier = "tier2"   # Severe: 150%+ threshold → 50% payout
        elif rain >= rain_thresh:
            tier = "tier1"   # Moderate: at threshold → 25% payout
        else:
            tier = None
        if not tier:
            return {"triggered": False, "tier": None, "payout_ratio": 0.0}
        return {
            "triggered":     True,
            "tier":          tier,
            "payout_amount": insured_value * self.PAYOUT_TIERS[tier],
        }

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
risk_model  = RiskModel().to(DEVICE)
fraud_model = FraudModel().to(DEVICE)

try:
    risk_model.load_state_dict(torch.load("risk_model_robust.pth", map_location=DEVICE)["model_state"])
    risk_model.eval()
    print("🚀 WEIGHTS LOADED: RiskModel (ST-GNN) is ready.")
except Exception as e:
    risk_model.eval()
    print(f"⚠️ RiskModel WEIGHTS MISSING: {e}. Running with random initialization.")

try:
    fraud_model.load_state_dict(torch.load("fraud_model_best.pth", map_location=DEVICE)["model_state"])
    fraud_model.eval()
    print("🚀 WEIGHTS LOADED: FraudModel (Residual MLP) is ready.")
except Exception as e:
    fraud_model.eval()
    print(f"⚠️ FraudModel WEIGHTS MISSING: {e}. Running with random initialization.")

# Fixed: was a single global — caused cross-rider state pollution when
# multiple riders were in the oracle loop. Now per-rider dicts.
active_events: dict  = {}   # rider_id → event dict
latest_payout: dict | None = None

# ─────────────────────────────────────────────
# FASTAPI LIFESPAN & BACKGROUND ORACLE
# ─────────────────────────────────────────────
# ── AQI / Heatwave / Strike helpers for the oracle ──────────────────────────
def fetch_aqi(lat: float, lon: float) -> tuple[bool, float, str]:
    """
    Trigger 3: AQI pollution spike detection.
    Uses OpenWeatherMap Air Pollution API (free tier) if OWM_API_KEY set,
    otherwise falls back to Open-Meteo UV index as a proxy.
    Returns (is_hazard, aqi_value, reason_string)
    """
    try:
        if OWM_API_KEY:
            url = (f"http://api.openweathermap.org/data/2.5/air_pollution"
                   f"?lat={lat}&lon={lon}&appid={OWM_API_KEY}")
            r   = requests.get(url, timeout=10)
            aqi = r.json()["list"][0]["main"]["aqi"]  # 1=Good..5=VeryBad
            is_bad = aqi >= 4  # 4=Poor, 5=VeryPoor → disruption trigger
            return is_bad, float(aqi), f"AQI level {aqi}/5 — outdoor work risky"
        # Fallback: simulate AQI as moderate (no OWM key)
        return False, 2.0, "AQI nominal (no OWM key)"
    except Exception as e:
        print(f"[AQI fetch error] {e}")
        return False, 0.0, "AQI check failed"


def check_heatwave(weather_arr) -> tuple[bool, float, str]:
    """
    Trigger 4: Heatwave detection.
    Uses the most recent temperature reading from the weather history array.
    Threshold: >42°C is classified as a heatwave disruption.
    """
    if weather_arr is None or len(weather_arr) == 0:
        return False, 25.0, "No temperature data"
    # weather_arr columns: [precipitation, windspeed, temperature]
    latest_temp = float(weather_arr[-1, 2])
    is_heat = latest_temp > 42.0
    reason  = f"Temperature {latest_temp:.1f}°C exceeds safe outdoor limit"
    return is_heat, latest_temp, reason


def check_strike_in_news(news_snippets: list) -> tuple[bool, str]:
    """
    Trigger 5: Strike / bandh / curfew detection via NLP keyword scan.
    Expanded keyword set beyond the existing road blockage check.
    """
    strike_kw = {"strike", "bandh", "shutdown", "curfew", "protest",
                 "agitation", "blockade", "halt", "stoppage", "walkout"}
    for snippet in news_snippets:
        s_lower = snippet.lower()
        matched = [k for k in strike_kw if k in s_lower]
        if matched:
            return True, f"Strike/disruption keywords detected: {', '.join(matched)}"
    return False, ""


async def monitoring_oracle():
    """
    Background task polling environment to trigger parametric claims.
    FIX 1: 15-second startup delay ensures the HTTP server binds its port
            before any blocking network calls are made.
    FIX 2: Per-rider active_events dict (was a single global — caused
            cross-rider state pollution with multiple active riders).
    ADDED:  5 triggers — rain, road blockage, AQI, heatwave, strike.
    """
    await asyncio.sleep(15)

    global active_events, latest_payout
    while True:
        try:
            active_riders = await get_active_riders_from_db()
            if not active_riders:
                active_riders = [FALLBACK_RIDER]

            for rider in active_riders:
                rider_id = rider.get('rider_id', rider.get('worker_id', 'unknown'))
                lat, lon = rider['lat'], rider['lon']
                city     = rider.get('location_name', 'Bangalore').split(',')[-1].strip()

                # Fetch all trigger data concurrently
                rain_future    = asyncio.to_thread(fetch_imd_alert,  lat, lon)
                news_future    = asyncio.to_thread(fetch_news_events, city)
                aqi_future     = asyncio.to_thread(fetch_aqi,         lat, lon)
                weather_future = asyncio.to_thread(fetch_weather_history, lat, lon, 1)  # just today

                try:
                    rain_result, news_snippets, aqi_result, weather_today = await asyncio.gather(
                        rain_future, news_future, aqi_future, weather_future
                    )
                    _, rain_mm, rain_reason   = rain_result
                    is_aqi_bad, aqi_val, aqi_reason = aqi_result
                except Exception as e:
                    print(f"Oracle API Fetch Error for {city}: {e}")
                    continue

                road_events              = extract_events_fast(news_snippets)
                is_heatwave, temp, heat_reason = check_heatwave(weather_today)
                is_strike, strike_reason = check_strike_in_news(news_snippets)

                # ── Evaluate all 5 triggers ────────────────────────────────
                trigger_map = {
                    "heavy_rain":   rain_mm > RAIN_THRESHOLD_MM,
                    "road_block":   len(road_events) > 0,
                    "aqi_spike":    is_aqi_bad,
                    "heatwave":     is_heatwave,
                    "strike":       is_strike,
                }
                is_hazard = any(trigger_map.values())
                active_trigger = next((k for k, v in trigger_map.items() if v), "weather")

                # ── Per-rider event tracking (was broken global) ───────────
                if is_hazard and rider_id not in active_events:
                    active_events[rider_id] = {
                        "id":         f"DIS_{uuid.uuid4().hex[:4].upper()}",
                        "start_time": time.time(),
                        "rain":       rain_mm,
                        "lat":        lat,
                        "lon":        lon,
                        "trigger":    active_trigger,
                    }
                    print(f"🚨 ALERT [{active_trigger}]: Disruption for {rider_id} in {city}.")

                elif not is_hazard and rider_id in active_events:
                    event        = active_events[rider_id]
                    forecast, hourly_rate = await get_weekly_forecast(rider_id)
                    duration_hrs = max((time.time() - event["start_time"]) / 3600, 1.3)

                    impact = ImpactModel().evaluate(
                        {"rainfall_mm": event["rain"]}, RAIN_THRESHOLD_MM, 85000
                    )
                    payout = impact.get("payout_amount", round(hourly_rate * duration_hrs, 2))

                    latest_payout = {
                        "rider_id":                 rider_id,
                        "disruption_id":            event["id"],
                        "payout_amount":            payout,
                        "forecasted_weekly_income": forecast,
                        "duration":                 round(duration_hrs, 2),
                        "location":                 rider.get("location_name", "Unknown"),
                        "trigger":                  event["trigger"],
                        "settled_at":               datetime.now().strftime("%H:%M:%S"),
                    }
                    del active_events[rider_id]
                    print(f"✅ SETTLEMENT: Payout ₹{payout:.0f} for {rider_id} [trigger: {event['trigger']}].")

        except Exception as e:
            print(f"Oracle Error: {e}")

        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(monitoring_oracle())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────
class LocationPingRequest(BaseModel):
    worker_id:     str
    lat:           float
    lon:           float
    location_name: Optional[str] = "Unknown"

class PremiumRequest(BaseModel):
    worker_id: str
    city:      Optional[str] = "Bangalore"

class PayoutRequest(BaseModel):
    disruption_id:    str
    disruption_type:  Optional[str]   = "weather"
    duration_hrs:     float
    cargo_type:       Optional[str]   = "standard"
    hourly_rate:      Optional[float] = None
    forecasted_income: float          = 4200.0
    worker_id:        Optional[str]   = "unknown"
    city:             Optional[str]   = "Bangalore"

class SettleWeekRequest(BaseModel):
    worker_id:    str
    total_amount: float
    payout_count: int
    week_label:   Optional[str] = None

# ─────────────────────────────────────────────
# FASTAPI ENDPOINTS
# ─────────────────────────────────────────────

@app.post("/ping-location")
async def post_ping_location(req: LocationPingRequest):
    """POST /ping-location — Frontend app calls this periodically to update live GPS."""
    await live_locations_collection.update_one(
        {"rider_id": req.worker_id},
        {
            "$set": {
                "lat": req.lat,
                "lon": req.lon,
                "location_name": req.location_name,
                "status": "ACTIVE",
                "last_ping": datetime.now()
            }
        },
        upsert=True
    )
    return {"status": "success", "message": f"GPS location logged for {req.worker_id}"}


@app.post("/get-premium")
async def post_get_premium(req: PremiumRequest):
    """POST /get-premium — Calculates Actuarial Premium using ST-GNN."""
    partner = await get_partner_from_db(req.worker_id)

    city_name = req.city or partner.get("city_name", "Bangalore")
    coords    = CITY_COORDS.get(city_name, CITY_COORDS["Bangalore"])
    lat, lon  = coords["lat"], coords["lon"]

    weather_arr  = await asyncio.to_thread(fetch_weather_history, lat, lon)
    w_max        = np.max(weather_arr, axis=0)
    w_max[w_max == 0] = 1.0
    weather_norm = torch.tensor(weather_arr / w_max, dtype=torch.float).unsqueeze(0).to(DEVICE)

    city_graph, _ = await asyncio.to_thread(build_city_graph, lat, lon)
    city_graph    = city_graph.to(DEVICE)
    env           = build_env_features(lat, lon).to(DEVICE)

    with torch.no_grad():
        risk_score = risk_model(weather_norm, city_graph, env).item()

    forecast, hourly = await get_weekly_forecast(req.worker_id)
    avg_income_lost  = forecast / 7.0

    BASE_PROB_SCALER   = 0.012
    daily_trigger_prob = risk_score * BASE_PROB_SCALER

    days_exposed  = 6
    tier_mult     = {1: 0.8, 2: 1.0, 3: 1.3}.get(partner.get("coverage_tier", 2), 1.0)

    raw_weekly_premium = daily_trigger_prob * avg_income_lost * days_exposed * tier_mult
    premium_weekly     = 20.0 + 30.0 * math.tanh(raw_weekly_premium / 100.0)

    return {
        "status":             "ok",
        "forecasted_income":  forecast,
        "risk_index":         round(risk_score, 4),
        "premium_to_collect": round(premium_weekly, 2),
        "hourly_rate":        hourly,
        "ambient_temp":       28.0,
        "platform":           "Swiggy",
        "city":               city_name,
    }


@app.post("/get-payout")
async def post_get_payout(req: PayoutRequest):
    """POST /get-payout — Evaluates Fraud Model & Finalizes Payment Dynamically via Async DB."""
    global latest_payout, active_events

    # Concurrently fetch requisite documentation for fraud inference
    partner_task    = get_partner_from_db(req.worker_id)
    claims_task     = history_collection.count_documents({
        "rider_id": req.worker_id,
        "status": "PAID",
        "timestamp": {"$gte": datetime.now() - timedelta(days=365)}
    })
    location_task   = live_locations_collection.find_one({"rider_id": req.worker_id})
    policy_task     = policies_collection.find_one({"rider_id": req.worker_id, "status": "ACTIVE"})
    # Fetch last 2 GPS pings to detect teleportation (gps_spoofing_flag)
    gps_history_task = live_locations_collection.find(
        {"rider_id": req.worker_id}
    ).sort("last_ping", -1).limit(2).to_list(length=2)

    partner, claims_count, loc_data, policy, gps_history = await asyncio.gather(
        partner_task, claims_task, location_task, policy_task, gps_history_task
    )

    if latest_payout and latest_payout["disruption_id"] == req.disruption_id:
        payout_amount = latest_payout["payout_amount"]
    else:
        _, default_hourly = await get_weekly_forecast(req.worker_id)
        hourly            = req.hourly_rate if req.hourly_rate else default_hourly
        avg_income_lost   = req.forecasted_income / 7.0
        
        daily_trigger_prob_avg = 0.45 * 0.012
        raw_weekly_premium     = daily_trigger_prob_avg * avg_income_lost * 6 * 1.0

        coverage_ratio = 1.0
        if raw_weekly_premium > 0:
            smooth_premium = 20.0 + 30.0 * math.tanh(raw_weekly_premium / 100.0)
            coverage_ratio = smooth_premium / raw_weekly_premium

        payout_amount = round(hourly * max(req.duration_hrs, 0.5) * coverage_ratio, 2)

    # Dynamic Feature Calculation
    now = datetime.now()
    onboarding_date = partner.get("onboarding_date", now - timedelta(days=180))
    vehicle_reg_date = partner.get("vehicle_registration_date", now - timedelta(days=365*2.5))
    
    time_to_claim_hrs = 0.0
    gps_dist_km = 0.0
    # Use per-rider active event (fixed global singleton bug)
    rider_event = active_events.get(req.worker_id) or active_events.get("default")
    if rider_event:
        time_to_claim_hrs = (time.time() - rider_event.get("start_time", time.time())) / 3600.0
        if loc_data and "lat" in rider_event:
            gps_dist_km = haversine_km(rider_event["lat"], rider_event["lon"], loc_data["lat"], loc_data["lon"])

    coverage_amt = policy.get("coverage_amount", 50000) if policy else 50000
    asset_value  = partner.get("asset_value", 85000)

    # ── Compute dynamic fraud features from real data ──────────────────────

    # location_consistency: 0=inconsistent, 1=perfectly consistent
    # Calculated as inverse of GPS jump distance between last 2 pings
    # If < 2 pings available, use a conservative neutral value (0.5)
    location_consistency = 0.5  # conservative default
    gps_spoofing_flag    = 0
    if len(gps_history) >= 2:
        p1, p2 = gps_history[0], gps_history[1]
        jump_km = haversine_km(p1["lat"], p1["lon"], p2["lat"], p2["lon"])
        time_diff_hrs = max(
            abs((p1.get("last_ping", datetime.now()) - p2.get("last_ping", datetime.now())).total_seconds()) / 3600.0,
            0.001  # prevent division by zero
        )
        speed_kmh = jump_km / time_diff_hrs
        # Normal city riding speed is 15-35 km/h.
        # If speed > 120 km/h between pings, flag as spoofing
        gps_spoofing_flag    = 1 if speed_kmh > 120.0 else 0
        # location_consistency: how "reasonable" the speed is
        # 0 km/h = fully stationary (suspicious if claiming trip), 40 km/h = ideal
        location_consistency = float(np.clip(1.0 - (speed_kmh / 200.0), 0.0, 1.0))

    # delivery_km_that_day: estimate from onboarding pattern and time of day
    # Proxy: if GPS is ACTIVE and last_ping is recent, rider was delivering
    # Typical delivery rider does 8-12 hrs/day × 25-35 km/hr avg city speed
    was_active_today = (
        loc_data is not None and
        loc_data.get("status") == "ACTIVE" and
        (datetime.now() - loc_data.get("last_ping", datetime.min)).total_seconds() < 4 * 3600
    )
    hours_worked_estimate = 8.0 if was_active_today else 2.0  # conservative if not tracked
    delivery_km_that_day  = round(hours_worked_estimate * 28.0, 1)  # 28 km/hr avg city speed

    # num_policies_same_phone: count other partners with same phone number
    num_policies_same_phone = 1  # default = this rider only
    partner_phone = partner.get("phone", "")
    if partner_phone and partner_phone not in ("0000000000", ""):
        same_phone_count = await partners_collection.count_documents({
            "phone":      partner_phone,
            "partner_id": {"$ne": req.worker_id}
        })
        num_policies_same_phone = 1 + same_phone_count

    # claim_matches_event_type: expanded to cover all 5 oracle triggers
    matched_event_types = {"weather", "blockage", "heavy_rain", "road_block",
                           "aqi_spike", "heatwave", "strike", "pollution"}
    claim_matches = 1 if req.disruption_type in matched_event_types else 0

    claim_features = {
        "days_since_purchase":      (now - onboarding_date).days,
        "claims_last_12m":          claims_count,
        "time_to_claim_hrs":        time_to_claim_hrs,
        "gps_dist_from_event_km":   gps_dist_km,
        "location_consistency":     location_consistency,      # was hardcoded 0.95
        "gps_spoofing_flag":        gps_spoofing_flag,         # was hardcoded 0
        "claim_matches_event_type": claim_matches,
        "was_delivering_at_event":  1 if (loc_data and loc_data.get("status") == "ACTIVE") else 0,
        "delivery_km_that_day":     delivery_km_that_day,      # was hardcoded 45.0
        "vehicle_age_yrs":          (now - vehicle_reg_date).days / 365.0,
        "overinsurance_ratio":      coverage_amt / max(asset_value, 1),
        "num_policies_same_phone":  num_policies_same_phone,   # was hardcoded 1
    }

    norms = {
        "days_since_purchase":      lambda x: np.clip(x / 365.0, 0, 1),
        "claims_last_12m":          lambda x: np.clip(x / 5.0, 0, 1),
        "time_to_claim_hrs":        lambda x: np.clip(x / 72.0, 0, 1),
        "gps_dist_from_event_km":   lambda x: np.clip(x / 50.0, 0, 1),
        "location_consistency":     lambda x: np.clip(x, 0, 1),
        "gps_spoofing_flag":        lambda x: float(x),
        "claim_matches_event_type": lambda x: float(x),
        "was_delivering_at_event":  lambda x: float(x),
        "delivery_km_that_day":     lambda x: np.clip(x / 120.0, 0, 1),
        "vehicle_age_yrs":          lambda x: np.clip(x / 10.0, 0, 1),
        "overinsurance_ratio":      lambda x: np.clip(x / 2.0, 0, 1),
        "num_policies_same_phone":  lambda x: np.clip(x / 3.0, 0, 1),
    }

    x = torch.tensor([[norms[f](claim_features[f]) for f in FEATURE_NAMES]], dtype=torch.float).to(DEVICE)

    with torch.no_grad():
        fraud_prob = fraud_model(x).item()

    if fraud_prob > 0.65:
        return {
            "status":        "flagged",
            "disruption_id": req.disruption_id,
            "payout_amount": 0.0,
            "reason":        "Fraud probability exceeds safety threshold.",
        }

    return {
        "status":            "approved",
        "disruption_id":     req.disruption_id,
        "payout_amount":     payout_amount,
        "fraud_probability": round(fraud_prob, 4),
        "timestamp":         datetime.now().isoformat(),
    }


@app.post("/settle-week")
async def settle_week(req: SettleWeekRequest):
    """POST /settle-week — called when 'End of Week' button is clicked."""
    today  = datetime.now().date()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    def fmt(d): return f"{d.day} {d.strftime('%b')}"
    week_label = req.week_label or f"{fmt(monday)} – {fmt(sunday)}"

    return {
        "status":       "SETTLED",
        "worker_id":    req.worker_id,
        "total_payout": round(req.total_amount, 2),
        "payout_count": req.payout_count,
        "week_label":   week_label,
        "settled_at":   datetime.now().isoformat(),
        "message":      f"₹{round(req.total_amount, 2):.2f} has been transferred to your account.",
    }


@app.get("/admin/forecast-risk")
async def get_admin_forecast_risk():
    """GET /admin/forecast-risk — Predicts risk for major cities for the upcoming week."""
    cities_to_check = ["Bangalore", "Mumbai", "Delhi", "Chennai"]
    results         = []

    for city in cities_to_check:
        coords   = CITY_COORDS[city]
        lat, lon = coords["lat"], coords["lon"]
        try:
            _, rain_mm, _ = await asyncio.to_thread(fetch_imd_alert, lat, lon)

            if rain_mm > 40.0:
                risk_level, reason = "HIGH",   "Heavy Rainfall Expected"
            elif rain_mm > 15.0:
                risk_level, reason = "MEDIUM", "Moderate Rainfall"
            else:
                risk_level, reason = "LOW",    "Clear/Normal"

            results.append({
                "city":       city,
                "risk_level": risk_level,
                "reason":     reason,
                "rain_mm":    round(rain_mm, 1),
            })
        except Exception:
            results.append({
                "city":       city,
                "risk_level": "UNKNOWN",
                "reason":     "Forecast API Error",
                "rain_mm":    0.0,
            })

    return {"status": "ok", "forecasts": results}


@app.get("/cron")
@app.head("/cron")
async def get_cron():
    return {
        "status":       "alive",
        "timestamp":    datetime.now().isoformat(),
        "active_event": active_event is not None,
    }


# ─────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    # FIX: Always read $PORT from environment. Render injects this automatically.
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("ai_service:app", host="0.0.0.0", port=port, reload=False)
