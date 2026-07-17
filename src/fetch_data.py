"""
Pulls real environmental data for a chosen plot of land using free,
no-signup APIs:
  - NASA POWER            -> solar radiation, rainfall, temperature
  - SoilGrids (ISRIC)      -> soil pH, organic carbon
  - Open-Elevation         -> elevation (optional, used for terrain notes)

Run this on your own machine (not inside a network-restricted sandbox).
Output: data/site_data.json
"""

import json
import os
import time
import requests

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_OUTPUT_PATH = os.path.join(_PROJECT_ROOT, "data", "site_data.json")

# ---- 1. Define your plot here ----------------------------------------
# Bounding box: (lat_min, lon_min, lat_max, lon_max)
# Example plot: a small patch near Bengaluru, India. Swap for your real site.
SITE_NAME = "Plot near Harihar, Karnataka"
LAT_MIN, LON_MIN = 14.428519, 75.434234
LAT_MAX, LON_MAX = 14.435408, 75.443679
# Grid resolution for sampling (keep small: this is a sampling grid for
# climate/soil data, NOT the planting grid used later by the optimizer)
SAMPLE_POINTS_PER_SIDE = 3


def sample_points():
    """Generate a small grid of (lat, lon) points across the bounding box."""
    points = []
    for i in range(SAMPLE_POINTS_PER_SIDE):
        for j in range(SAMPLE_POINTS_PER_SIDE):
            lat = LAT_MIN + (LAT_MAX - LAT_MIN) * i / max(SAMPLE_POINTS_PER_SIDE - 1, 1)
            lon = LON_MIN + (LON_MAX - LON_MIN) * j / max(SAMPLE_POINTS_PER_SIDE - 1, 1)
            points.append((round(lat, 5), round(lon, 5)))
    return points


def fetch_nasa_power(lat, lon):
    """Free, no API key required. Returns climatology averages."""
    url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
    params = {
        "parameters": "ALLSKY_SFC_SW_DWN,PRECTOTCORR,T2M",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "format": "JSON",
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()["properties"]["parameter"]
    return {
        "avg_solar_radiation_mj_m2_day": data["ALLSKY_SFC_SW_DWN"]["ANN"],
        "avg_precipitation_mm_day": data["PRECTOTCORR"]["ANN"],
        "avg_temperature_c": data["T2M"]["ANN"],
    }


def fetch_soilgrids(lat, lon):
    """Free, no API key required. Returns soil pH and organic carbon."""
    url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
    params = {
        "lon": lon,
        "lat": lat,
        "property": ["phh2o", "soc"],
        "depth": "0-5cm",
        "value": "mean",
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    layers = r.json()["properties"]["layers"]
    result = {}
    for layer in layers:
        name = layer["name"]
        mean_val = layer["depths"][0]["values"]["mean"]
        if name == "phh2o":
            result["soil_ph"] = mean_val / 10.0  # SoilGrids returns pH * 10
        elif name == "soc":
            result["soil_organic_carbon_dg_kg"] = mean_val
    return result


def fetch_elevation(lat, lon):
    """Free public instance. Can be slow/rate-limited; used sparingly."""
    url = "https://api.open-elevation.com/api/v1/lookup"
    params = {"locations": f"{lat},{lon}"}
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()["results"][0]["elevation"]


def main():
    points = sample_points()
    samples = []

    for lat, lon in points:
        print(f"Fetching data for ({lat}, {lon})...")
        entry = {"lat": lat, "lon": lon}

        try:
            entry.update(fetch_nasa_power(lat, lon))
        except Exception as e:
            print(f"  NASA POWER failed: {e}")

        try:
            entry.update(fetch_soilgrids(lat, lon))
        except Exception as e:
            print(f"  SoilGrids failed: {e}")

        try:
            entry["elevation_m"] = fetch_elevation(lat, lon)
        except Exception as e:
            print(f"  Open-Elevation failed: {e}")

        samples.append(entry)
        time.sleep(1)  # be polite to free public APIs

    site_data = {
        "site_name": SITE_NAME,
        "bounding_box": {
            "lat_min": LAT_MIN, "lon_min": LON_MIN,
            "lat_max": LAT_MAX, "lon_max": LON_MAX,
        },
        "samples": samples,
    }

    with open(_OUTPUT_PATH, "w") as f:
        json.dump(site_data, f, indent=2)

    print(f"\nSaved {_OUTPUT_PATH}")


if __name__ == "__main__":
    main()
