import json
import logging
from typing import Optional, List, Dict, Any
import requests

from backend.app.config import SPECIES_DB_PATH, SITE_DATA_PATH
from backend.app.schemas import Species, EnvironmentConditions, SuitabilityWeights

logger = logging.getLogger(__name__)

SPECIES_PALETTE: Dict[str, str] = {
    "Azadirachta indica": "#10b981",          # Emerald Neem
    "Ficus benghalensis": "#065f46",          # Deep Forest Banyan
    "Tectona grandis": "#b45309",             # Warm Teak Brown
    "Pongamia pinnata": "#15803d",            # Rich Green Beech
    "Delonix regia": "#ea580c",               # Radiant Orange Gulmohar
    "Terminalia arjuna": "#4d7c0f",           # Earthy Olive Arjuna
    "Bambusa bambos": "#84cc16",              # Vibrant Bamboo Lime
    "Mangifera indica": "#eab308",            # Sunburst Mango Gold
    "Dalbergia sissoo": "#854d0e",            # Deep Rosewood Amber
    "Syzygium cumini": "#7e22ce",             # Rich Jamun Violet
    "Madhuca longifolia": "#c2410c",          # Mahua Terracotta
    "Phyllanthus emblica": "#14b8a6",         # Amla Jade Teal
    "Prosopis cineraria": "#d97706",          # Desert Khejri Ochre
    "Albizia lebbeck": "#0284c7",             # Siris Sky Cerulean
    "Casuarina equisetifolia": "#0d9488",     # Coastal Pine Sage
    "Shorea robusta": "#78350f",              # Majestic Sal Bark
    "Butea monosperma": "#ef4444",            # Palash Flame Red
    "Artocarpus heterophyllus": "#65a30d",    # Jackfruit Deep Olive
}

DEFAULT_SPECIES_DATA = [
    {
        "name": "Azadirachta indica",
        "common_name": "Neem",
        "soil_ph_range": [6.2, 8.5],
        "min_annual_rainfall_mm": 400.0,
        "max_annual_rainfall_mm": 1500.0,
        "min_sunlight_hours": 6.0,
        "mature_canopy_radius_m": 7.5,
        "carbon_sequestration_kg_per_year": 18.0,
        "native": True,
        "color": "#10b981"
    },
    {
        "name": "Ficus benghalensis",
        "common_name": "Banyan",
        "soil_ph_range": [5.5, 7.5],
        "min_annual_rainfall_mm": 750.0,
        "max_annual_rainfall_mm": 2500.0,
        "min_sunlight_hours": 5.0,
        "mature_canopy_radius_m": 15.0,
        "carbon_sequestration_kg_per_year": 35.0,
        "native": True,
        "color": "#065f46"
    },
    {
        "name": "Tectona grandis",
        "common_name": "Teak",
        "soil_ph_range": [6.0, 8.0],
        "min_annual_rainfall_mm": 900.0,
        "max_annual_rainfall_mm": 2500.0,
        "min_sunlight_hours": 6.0,
        "mature_canopy_radius_m": 5.0,
        "carbon_sequestration_kg_per_year": 22.5,
        "native": True,
        "color": "#b45309"
    },
    {
        "name": "Pongamia pinnata",
        "common_name": "Indian Beech",
        "soil_ph_range": [5.0, 8.0],
        "min_annual_rainfall_mm": 500.0,
        "max_annual_rainfall_mm": 2500.0,
        "min_sunlight_hours": 5.0,
        "mature_canopy_radius_m": 6.0,
        "carbon_sequestration_kg_per_year": 15.5,
        "native": True,
        "color": "#15803d"
    },
    {
        "name": "Delonix regia",
        "common_name": "Gulmohar",
        "soil_ph_range": [5.5, 7.8],
        "min_annual_rainfall_mm": 600.0,
        "max_annual_rainfall_mm": 2000.0,
        "min_sunlight_hours": 6.0,
        "mature_canopy_radius_m": 8.0,
        "carbon_sequestration_kg_per_year": 20.0,
        "native": False,
        "color": "#ea580c"
    },
    {
        "name": "Terminalia arjuna",
        "common_name": "Arjuna",
        "soil_ph_range": [6.5, 8.5],
        "min_annual_rainfall_mm": 750.0,
        "max_annual_rainfall_mm": 1900.0,
        "min_sunlight_hours": 5.5,
        "mature_canopy_radius_m": 7.0,
        "carbon_sequestration_kg_per_year": 24.0,
        "native": True,
        "color": "#4d7c0f"
    },
    {
        "name": "Bambusa bambos",
        "common_name": "Giant Bamboo",
        "soil_ph_range": [5.0, 7.5],
        "min_annual_rainfall_mm": 1200.0,
        "max_annual_rainfall_mm": 4000.0,
        "min_sunlight_hours": 4.5,
        "mature_canopy_radius_m": 3.5,
        "carbon_sequestration_kg_per_year": 14.0,
        "native": True,
        "color": "#84cc16"
    },
    {
        "name": "Mangifera indica",
        "common_name": "Mango",
        "soil_ph_range": [5.5, 7.5],
        "min_annual_rainfall_mm": 750.0,
        "max_annual_rainfall_mm": 2500.0,
        "min_sunlight_hours": 6.0,
        "mature_canopy_radius_m": 6.5,
        "carbon_sequestration_kg_per_year": 16.0,
        "native": True,
        "color": "#eab308"
    }
]

def load_species_database() -> List[Species]:
    """Loads species from data/species_db.json or default fallback with colors."""
    species_list = []
    if SPECIES_DB_PATH.exists():
        try:
            with open(SPECIES_DB_PATH, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                for item in raw_data:
                    color = SPECIES_PALETTE.get(item.get("name"), "#10b981")
                    item["color"] = color
                    species_list.append(Species(**item))
            return species_list
        except Exception as e:
            logger.warning(f"Failed to read {SPECIES_DB_PATH}: {e}. Using default fallback.")

    return [Species(**item) for item in DEFAULT_SPECIES_DATA]

def range_match_score(value: float, min_val: float, max_val: float) -> float:
    """Returns 1.0 within range, with linear decay outside."""
    if min_val <= value <= max_val:
        return 1.0
    range_width = max(max_val - min_val, 1e-6)
    tolerance = 0.25 * range_width
    distance = min_val - value if value < min_val else value - max_val
    score = 1.0 - (distance / tolerance)
    return max(0.0, min(1.0, score))

def min_threshold_score(value: float, min_required: float, soft_margin_ratio: float = 0.2) -> float:
    """Returns 1.0 if value >= min_required, decays linearly below."""
    if value >= min_required:
        return 1.0
    floor = min_required * (1.0 - soft_margin_ratio)
    if value <= floor:
        return 0.0
    return max(0.0, min(1.0, (value - floor) / (min_required - floor)))

def compute_suitability_score(
    species: Species,
    env: EnvironmentConditions,
    weights: SuitabilityWeights
) -> float:
    """Computes weighted suitability score between 0.0 and 1.0."""
    soil_score = range_match_score(env.soil_ph, species.soil_ph_range[0], species.soil_ph_range[1])
    rainfall_score = range_match_score(env.annual_rainfall_mm, species.min_annual_rainfall_mm, species.max_annual_rainfall_mm)
    sunlight_score = min_threshold_score(env.sunlight_hours, species.min_sunlight_hours)

    total_weight = weights.soil + weights.rainfall + weights.sunlight
    if total_weight <= 0:
        total_weight = 1.0

    score = (
        weights.soil * soil_score
        + weights.rainfall * rainfall_score
        + weights.sunlight * sunlight_score
    ) / total_weight

    return round(float(score), 4)

from concurrent.futures import ThreadPoolExecutor, as_completed

def estimate_regional_climate(lat: float, lon: float) -> EnvironmentConditions:
    """Estimates realistic baseline climate and soil parameters based on geographic coordinates."""
    # Western Ghats / Coastal West India
    if 8.0 <= lat <= 16.5 and 73.0 <= lon <= 77.5:
        return EnvironmentConditions(
            soil_ph=5.9,
            annual_rainfall_mm=2400.0,
            sunlight_hours=5.4,
            avg_temperature_c=23.5,
            elevation_m=650.0,
            soil_organic_carbon_dg_kg=310.0
        )
    # Arid Northwest / Thar Desert / Rajasthan
    elif 23.5 <= lat <= 30.5 and 69.5 <= lon <= 76.5:
        return EnvironmentConditions(
            soil_ph=8.2,
            annual_rainfall_mm=480.0,
            sunlight_hours=7.8,
            avg_temperature_c=28.2,
            elevation_m=280.0,
            soil_organic_carbon_dg_kg=85.0
        )
    # Sub-Himalayan / Terai / Northeast
    elif 25.0 <= lat <= 33.0 and 77.0 <= lon <= 96.0:
        return EnvironmentConditions(
            soil_ph=6.4,
            annual_rainfall_mm=2100.0,
            sunlight_hours=5.6,
            avg_temperature_c=20.8,
            elevation_m=620.0,
            soil_organic_carbon_dg_kg=270.0
        )
    # Delta / Coastal East (Sundarbans / Odisha)
    elif 19.0 <= lat <= 23.5 and 85.0 <= lon <= 90.0:
        return EnvironmentConditions(
            soil_ph=7.5,
            annual_rainfall_mm=1750.0,
            sunlight_hours=5.8,
            avg_temperature_c=26.4,
            elevation_m=15.0,
            soil_organic_carbon_dg_kg=190.0
        )
    # Central Deccan / Maharashtra / Karnataka / Telangana
    elif 13.0 <= lat <= 22.0 and 74.0 <= lon <= 81.0:
        return EnvironmentConditions(
            soil_ph=7.1,
            annual_rainfall_mm=1150.0,
            sunlight_hours=6.4,
            avg_temperature_c=25.8,
            elevation_m=520.0,
            soil_organic_carbon_dg_kg=195.0
        )
    # Global / Default Tropical/Subtropical estimation
    else:
        abs_lat = abs(lat)
        if abs_lat < 15:
            # Equatorial / Tropical
            return EnvironmentConditions(
                soil_ph=6.2,
                annual_rainfall_mm=1900.0,
                sunlight_hours=5.8,
                avg_temperature_c=27.0,
                elevation_m=250.0,
                soil_organic_carbon_dg_kg=240.0
            )
        elif abs_lat < 35:
            # Subtropical
            return EnvironmentConditions(
                soil_ph=6.8,
                annual_rainfall_mm=1100.0,
                sunlight_hours=6.5,
                avg_temperature_c=22.0,
                elevation_m=400.0,
                soil_organic_carbon_dg_kg=180.0
            )
        else:
            # Temperate
            return EnvironmentConditions(
                soil_ph=6.5,
                annual_rainfall_mm=850.0,
                sunlight_hours=5.5,
                avg_temperature_c=14.0,
                elevation_m=350.0,
                soil_organic_carbon_dg_kg=220.0
            )

def fetch_external_environment(lat: float, lon: float) -> EnvironmentConditions:
    """
    Fetches climatology & soil conditions using parallel calls with fast timeout,
    falling back to intelligent regional interpolation for instant low latency.
    """
    env = estimate_regional_climate(lat, lon)

    def _fetch_nasa():
        try:
            url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
            params = {
                "parameters": "ALLSKY_SFC_SW_DWN,PRECTOTCORR,T2M",
                "community": "AG",
                "longitude": lon,
                "latitude": lat,
                "format": "JSON",
            }
            r = requests.get(url, params=params, timeout=2.5)
            if r.status_code == 200:
                p = r.json().get("properties", {}).get("parameter", {})
                daily_precip = p.get("PRECTOTCORR", {}).get("ANN")
                solar_mj = p.get("ALLSKY_SFC_SW_DWN", {}).get("ANN")
                temp_c = p.get("T2M", {}).get("ANN")
                res = {}
                if daily_precip is not None:
                    res["annual_rainfall_mm"] = round(daily_precip * 365.0, 1)
                if solar_mj is not None:
                    res["sunlight_hours"] = round(min(12.0, max(4.0, solar_mj / 3.2)), 1)
                if temp_c is not None:
                    res["avg_temperature_c"] = round(temp_c, 1)
                return res
        except Exception:
            pass
        return None

    def _fetch_soil():
        try:
            url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
            params = {
                "lon": lon,
                "lat": lat,
                "property": ["phh2o", "soc"],
                "depth": "0-5cm",
                "value": "mean",
            }
            r = requests.get(url, params=params, timeout=2.5)
            if r.status_code == 200:
                layers = r.json().get("properties", {}).get("layers", [])
                res = {}
                for layer in layers:
                    name = layer.get("name")
                    mean_val = layer["depths"][0]["values"]["mean"]
                    if name == "phh2o" and mean_val is not None:
                        res["soil_ph"] = round(mean_val / 10.0, 2)
                    elif name == "soc" and mean_val is not None:
                        res["soil_organic_carbon_dg_kg"] = round(float(mean_val), 1)
                return res
        except Exception:
            pass
        return None

    def _fetch_elev():
        try:
            url = "https://api.open-elevation.com/api/v1/lookup"
            params = {"locations": f"{lat},{lon}"}
            r = requests.get(url, params=params, timeout=2.0)
            if r.status_code == 200:
                results = r.json().get("results", [])
                if results and results[0].get("elevation") is not None:
                    return {"elevation_m": round(float(results[0]["elevation"]), 1)}
        except Exception:
            pass
        return None

    with ThreadPoolExecutor(max_workers=3) as executor:
        f_nasa = executor.submit(_fetch_nasa)
        f_soil = executor.submit(_fetch_soil)
        f_elev = executor.submit(_fetch_elev)

        for future in [f_nasa, f_soil, f_elev]:
            try:
                data = future.result()
                if data:
                    for k, v in data.items():
                        setattr(env, k, v)
            except Exception:
                pass

    return env
