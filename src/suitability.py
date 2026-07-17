"""
Suitability scoring: given a grid cell's environmental conditions and a
species' requirements, compute a 0-1 match score for soil, rainfall, and
sunlight, then combine into a single weighted suitability score.
"""

import json
import os

# Resolve data/ relative to this file's location (src/../data), so it works
# no matter what directory the script is run from (e.g., PyCharm defaults to
# running from src/, while a terminal might run from the project root).
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_SPECIES_PATH = os.path.join(_PROJECT_ROOT, "data", "species_db.json")
_DEFAULT_SITE_PATH = os.path.join(_PROJECT_ROOT, "data", "site_data.json")


def load_species_db(path=None):
    path = path or _DEFAULT_SPECIES_PATH
    with open(path) as f:
        return json.load(f)


def load_site_data(path=None):
    path = path or _DEFAULT_SITE_PATH
    with open(path) as f:
        return json.load(f)


def range_match_score(value, min_val, max_val):
    """
    Returns 1.0 if value is within [min_val, max_val].
    Decays linearly to 0.0 as value moves outside the range,
    fully zero once it's 25% of the range-width past the edge.
    """
    if min_val <= value <= max_val:
        return 1.0

    range_width = max(max_val - min_val, 1e-6)
    tolerance = 0.25 * range_width

    if value < min_val:
        distance = min_val - value
    else:
        distance = value - max_val

    score = 1.0 - (distance / tolerance)
    return max(0.0, score)


def min_threshold_score(value, min_required, soft_margin_ratio=0.2):
    """
    Returns 1.0 if value >= min_required.
    Decays linearly to 0.0 below the threshold, reaching 0 at
    min_required * (1 - soft_margin_ratio).
    """
    if value >= min_required:
        return 1.0
    floor = min_required * (1 - soft_margin_ratio)
    if value <= floor:
        return 0.0
    return (value - floor) / (min_required - floor)


def cell_species_score(cell_env, species, weights=None):
    """
    cell_env: dict with keys soil_ph, annual_rainfall_mm, sunlight_hours
    species: dict from species_db.json
    weights: optional dict to override default weighting
    Returns a suitability score in [0, 1].
    """
    weights = weights or {"soil": 0.4, "rainfall": 0.35, "sunlight": 0.25}

    soil_score = range_match_score(
        cell_env["soil_ph"],
        species["soil_ph_range"][0],
        species["soil_ph_range"][1],
    )

    rainfall_score = range_match_score(
        cell_env["annual_rainfall_mm"],
        species["min_annual_rainfall_mm"],
        species["max_annual_rainfall_mm"],
    )

    sunlight_score = min_threshold_score(
        cell_env["sunlight_hours"],
        species["min_sunlight_hours"],
    )

    total = (
        weights["soil"] * soil_score
        + weights["rainfall"] * rainfall_score
        + weights["sunlight"] * sunlight_score
    )
    return round(total, 4)


def sunlight_hours_from_radiation(mj_m2_day):
    """
    NASA POWER's ALLSKY_SFC_SW_DWN field is returned in MJ/m2/day.
    Convert to kWh/m2/day (1 kWh = 3.6 MJ), which is the standard
    'peak sun hours' unit used in solar engineering, and works well
    enough as a proxy for usable daily sunlight for plant growth.
    """
    return mj_m2_day / 3.6


def build_cell_environments(site_data):
    """
    Averages the sampled points into a single representative environment
    per plot (fine for a small plot; for a larger one you'd interpolate
    per-cell instead). Skips any sample missing a given field (e.g. if
    that API call failed for that point) rather than crashing.
    """
    samples = site_data["samples"]

    ph_values = [s["soil_ph"] for s in samples if "soil_ph" in s]
    radiation_values = [
        s["avg_solar_radiation_mj_m2_day"] for s in samples
        if "avg_solar_radiation_mj_m2_day" in s
    ]

    if not ph_values:
        raise ValueError(
            "No sample points have soil_ph data - all SoilGrids calls "
            "failed. Re-run fetch_data.py (likely a temporary API issue)."
        )
    if not radiation_values:
        raise ValueError(
            "No sample points have solar radiation data - all NASA POWER "
            "calls failed. Re-run fetch_data.py (likely a temporary API issue)."
        )

    avg_ph = sum(ph_values) / len(ph_values)
    avg_radiation = sum(radiation_values) / len(radiation_values)

    annual_rainfall = site_data.get("annual_rainfall_mm_estimate")
    if annual_rainfall is None:
        precip_values = [
            s["avg_precipitation_mm_day"] for s in samples
            if "avg_precipitation_mm_day" in s
        ]
        if not precip_values:
            raise ValueError(
                "No sample points have precipitation data - all NASA POWER "
                "calls failed. Re-run fetch_data.py (likely a temporary API issue)."
            )
        avg_daily_precip = sum(precip_values) / len(precip_values)
        annual_rainfall = avg_daily_precip * 365

    return {
        "soil_ph": round(avg_ph, 2),
        "annual_rainfall_mm": round(annual_rainfall, 1),
        "sunlight_hours": round(sunlight_hours_from_radiation(avg_radiation), 2),
    }


if __name__ == "__main__":
    species_db = load_species_db()
    site_data = load_site_data()
    env = build_cell_environments(site_data)

    print(f"Site: {site_data['site_name']}")
    print(f"Derived environment: {env}\n")

    print(f"{'Species':<25} Suitability")
    print("-" * 40)
    for sp in species_db:
        score = cell_species_score(env, sp)
        print(f"{sp['common_name']:<25} {score}")
