from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas import Species, EnvironmentConditions, SuitabilityWeights
from backend.app.services.data_service import (
    load_species_database,
    compute_suitability_score,
    SPECIES_PALETTE
)

router = APIRouter(prefix="/api/species", tags=["Species"])

@router.get("", response_model=List[Species])
def get_all_species(
    soil_ph: Optional[float] = Query(None, description="Current soil pH"),
    rainfall_mm: Optional[float] = Query(None, description="Annual rainfall in mm"),
    sunlight_hours: Optional[float] = Query(None, description="Average sunlight hours per day"),
):
    """Returns all available tree species, optionally scored against environmental parameters."""
    species_list = load_species_database()

    if soil_ph is not None or rainfall_mm is not None or sunlight_hours is not None:
        env = EnvironmentConditions(
            soil_ph=soil_ph if soil_ph is not None else 7.0,
            annual_rainfall_mm=rainfall_mm if rainfall_mm is not None else 1200.0,
            sunlight_hours=sunlight_hours if sunlight_hours is not None else 6.0
        )
        weights = SuitabilityWeights()
        for sp in species_list:
            sp.suitability_score = compute_suitability_score(sp, env, weights)

    return species_list

@router.get("/{name}", response_model=Species)
def get_species_by_name(name: str):
    """Retrieves a single species by scientific or common name."""
    species_list = load_species_database()
    for sp in species_list:
        if sp.name.lower() == name.lower() or sp.common_name.lower() == name.lower():
            return sp
    raise HTTPException(status_code=404, detail=f"Species '{name}' not found.")
