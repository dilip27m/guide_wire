import { DisruptionScenario } from "./types";

// --- Worker Onboarding Options ---

export const CITIES = [
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
] as const;

export const PLATFORMS = [
  "Zomato",
  "Swiggy",
  "Dunzo",
  "Zepto",
  "Blinkit",
  "BigBasket",
] as const;

// --- Disruption Simulation Scenarios ---

export const SCENARIOS: DisruptionScenario[] = [
  {
    type: "heavy_rain",
    label: "Heavy Rain",
    icon: "🌧️",
    duration_hrs: 4,
    cargo_type: "Standard_Meal",
    ambient_temp: 28,
    description: "Torrential rain causing road flooding and delivery cancellations",
  },
  {
    type: "heatwave",
    label: "Heatwave",
    icon: "🔥",
    duration_hrs: 6,
    cargo_type: "Ultra_Perishable",
    ambient_temp: 45,
    description: "Extreme heat causing food spoilage and health risks",
  },
  {
    type: "strike",
    label: "Strike",
    icon: "✊",
    duration_hrs: 8,
    cargo_type: "Standard_Meal",
    ambient_temp: 32,
    description: "City-wide bandh forcing complete work stoppage",
  },
  {
    type: "pollution",
    label: "Pollution Spike",
    icon: "🏭",
    duration_hrs: 5,
    cargo_type: "Stable",
    ambient_temp: 34,
    description: "AQI exceeds 400, outdoor work not recommended",
  },
  {
    type: "road_block",
    label: "Road Blockage",
    icon: "🚧",
    duration_hrs: 3,
    cargo_type: "Standard_Meal",
    ambient_temp: 30,
    description: "Major arterial roads blocked — diversions add 40%+ delivery time",
  },
  {
    type: "aqi_spike",
    label: "AQI Spike",
    icon: "😷",
    duration_hrs: 4,
    cargo_type: "Stable",
    ambient_temp: 36,
    description: "Sudden AQI surge (OWM level 4-5), outdoor health risk declared",
  },
];

