from typing import Dict, Any, List
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Carbon Projections"])

class CarbonProjectionPoint(BaseModel):
    year: int
    baseline_carbon_kg: float
    optimized_carbon_kg: float
    net_gain_kg: float

@router.get("/projections", response_model=List[CarbonProjectionPoint])
def calculate_carbon_projections(
    baseline_annual_kg: float = Query(..., description="Annual baseline carbon rate in kg"),
    optimized_annual_kg: float = Query(..., description="Annual optimized carbon rate in kg"),
    max_years: int = Query(30, description="Max forecast years")
):
    """Calculates multi-decade carbon sequestration forecast curves."""
    results = []
    years = [1, 3, 5, 10, 15, 20, 25, 30]
    years = [y for y in years if y <= max_years]
    if max_years not in years:
        years.append(max_years)
        years.sort()

    for y in years:
        base = round(baseline_annual_kg * y, 1)
        opt = round(optimized_annual_kg * y, 1)
        results.append(
            CarbonProjectionPoint(
                year=y,
                baseline_carbon_kg=base,
                optimized_carbon_kg=opt,
                net_gain_kg=round(opt - base, 1)
            )
        )
    return results

@router.get("/info", response_model=Dict[str, Any])
def platform_info():
    """Returns platform metadata, algorithm parameters, and mathematical constraints."""
    return {
        "platform": "Algorithmic Reforestation Planner",
        "algorithm": "Simulated Annealing with Metropolis Acceptance Criterion",
        "spatial_model": "Canopy radius circle packing with overlap decay penalty",
        "biodiversity_model": "Shannon-Wiener entropy + localized neighborhood diversity ratio",
        "default_cooling_rate": 0.9995,
        "default_start_temp": 50.0,
        "spatial_physics": {
            "canopy_overlap_rule": "Normalized quadratic penalty when dist < (r1 + r2)",
            "biodiversity_neighborhood": "4-cell Chebyshev radius window"
        }
    }
