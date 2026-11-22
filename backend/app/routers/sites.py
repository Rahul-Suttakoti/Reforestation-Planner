from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException
from backend.app.schemas import (
    SitePreset,
    GeoBoundingBox,
    EnvironmentConditions
)
from backend.app.services.geo_service import (
    get_site_presets,
    bbox_to_dimensions_m,
    center_and_dimensions_to_bbox
)
from backend.app.services.data_service import (
    fetch_external_environment,
    SITE_DATA_PATH
)
from backend.app.services.autocomplete_service import search_locations
from pydantic import BaseModel
import json

class CenterPlotRequest(BaseModel):
    center_lat: float
    center_lon: float
    width_m: float = 100.0
    height_m: float = 100.0

router = APIRouter(prefix="/api/sites", tags=["Sites & Geography"])

@router.get("/presets", response_model=List[SitePreset])
def list_presets():
    """Lists pre-configured reforestation study sites with satellite bounds and environmental parameters."""
    return get_site_presets()

@router.post("/center-to-bbox", response_model=GeoBoundingBox)
def create_bbox_from_center(req: CenterPlotRequest):
    """Generates a bounding box centered on arbitrary coordinates with specified metric dimensions."""
    return center_and_dimensions_to_bbox(
        center_lat=req.center_lat,
        center_lon=req.center_lon,
        width_m=req.width_m,
        height_m=req.height_m
    )

@router.post("/dimensions", response_model=Dict[str, float])
def compute_dimensions(bbox: GeoBoundingBox):
    """Calculates physical width and height in meters from a latitude/longitude bounding box."""
    width_m, height_m = bbox_to_dimensions_m(bbox)
    return {
        "width_m": width_m,
        "height_m": height_m,
        "area_m2": round(width_m * height_m, 1),
        "area_hectares": round((width_m * height_m) / 10000.0, 3)
    }

@router.get("/fetch-env", response_model=EnvironmentConditions)
def fetch_environment_at_coords(
    lat: float = Query(..., description="Latitude of the site"),
    lon: float = Query(..., description="Longitude of the site")
):
    """
    Fetches real-time environmental data (soil pH, precipitation, solar radiation, elevation)
    from NASA POWER, SoilGrids, and Open-Elevation APIs with robust fallback.
    """
    return fetch_external_environment(lat, lon)

@router.get("/autocomplete", response_model=List[Dict[str, Any]])
async def autocomplete_locations(
    q: str = Query(..., description="Location search query (e.g. ban, bangalore, tiny village name)"),
    limit: int = Query(10, description="Maximum number of recommendations to return"),
    lat: Optional[float] = Query(None, description="Proximity latitude for prioritizing local streets and places"),
    lon: Optional[float] = Query(None, description="Proximity longitude for prioritizing local streets and places")
):
    """
    Returns search recommendations with OpenStreetMap + Major Hub coverage:
    Major cities (Bangalore, Bangkok, etc.) + tiny villages, hamlets, and towns globally.
    """
    return await search_locations(q, limit=limit, lat=lat, lon=lon)

@router.get("/sample-site", response_model=Dict[str, Any])
def get_sample_site():
    """Returns the original dataset from data/site_data.json."""
    if SITE_DATA_PATH.exists():
        with open(SITE_DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="site_data.json not found")
