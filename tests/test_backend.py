import asyncio
import sys
import json
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.schemas import (
    OptimizeRequest,
    EnvironmentConditions,
    SuitabilityWeights,
    OptimizationWeights,
    GeoBoundingBox
)
from backend.app.services.data_service import (
    load_species_database,
    compute_suitability_score,
    DEFAULT_SPECIES_DATA
)
from backend.app.services.geo_service import (
    get_site_presets,
    bbox_to_dimensions_m
)
from backend.app.services.baseline_service import build_naive_baseline
from backend.app.services.optimizer_service import (
    run_simulated_annealing_sync,
    stream_simulated_annealing
)
from backend.app.main import app

def test_species_loading():
    print("[1/6] Testing Species Database...")
    species = load_species_database()
    assert len(species) >= 8, f"Expected at least 8 species, got {len(species)}"
    for sp in species:
        assert sp.name, "Species missing name"
        assert sp.color, f"Species {sp.name} missing color"
        assert sp.mature_canopy_radius_m > 0
    print(f"  OK: Loaded {len(species)} species with palettes and botanical traits.")

def test_suitability_and_baseline():
    print("[2/6] Testing Suitability & Baseline Calculation...")
    species = load_species_database()
    env = EnvironmentConditions(soil_ph=7.1, annual_rainfall_mm=1365.0, sunlight_hours=6.2)
    weights = SuitabilityWeights()

    for sp in species:
        score = compute_suitability_score(sp, env, weights)
        assert 0.0 <= score <= 1.0, f"Suitability score {score} out of bounds for {sp.name}"

    baseline = build_naive_baseline(
        width_m=60.0,
        height_m=60.0,
        cell_size_m=5.0,
        species_list=species,
        env=env,
        suitability_weights=weights,
        years_horizon=20
    )
    assert baseline.trees_planted > 0, "Baseline should have planted trees"
    assert baseline.total_carbon_kg > 0, "Baseline should have positive carbon capture"
    print(f"  OK: Baseline monoculture planted {baseline.trees_planted} trees of {baseline.chosen_species_common} ({baseline.total_carbon_kg:,.1f} kg CO2).")

def test_geo_service():
    print("[3/6] Testing Geo Service & Presets...")
    presets = get_site_presets()
    assert len(presets) >= 4, f"Expected >= 4 presets, got {len(presets)}"
    for p in presets:
        w, h = bbox_to_dimensions_m(p.bounding_box)
        assert w > 20 and h > 20, f"Preset {p.id} dimensions too small: {w}x{h}"
    print(f"  OK: Verified {len(presets)} site presets and geographic dimension calculations.")

def test_sync_optimization():
    print("[4/6] Testing Sync Simulated Annealing Engine...")
    species = load_species_database()
    env = EnvironmentConditions(soil_ph=7.1, annual_rainfall_mm=1365.0, sunlight_hours=6.2)

    result = run_simulated_annealing_sync(
        species_list=species,
        env=env,
        plot_width_m=40.0,
        plot_height_m=40.0,
        cell_size_m=5.0,
        iterations=3000,
        seed=42,
        years_horizon=20
    )

    assert result.trees, "Optimized result must contain trees"
    assert result.metrics.trees_planted > 0
    assert result.metrics.species_diversity_count >= 1
    assert result.comparison.carbon_increase_pct is not None
    print(f"  OK: Simulated annealing completed:")
    print(f"      - Planted: {result.metrics.trees_planted} trees")
    print(f"      - Diversity: {result.metrics.species_diversity_count} species (Shannon index: {result.metrics.shannon_diversity_index})")
    print(f"      - 20-yr Carbon: {result.metrics.total_carbon_kg:,.1f} kg (vs baseline: {result.comparison.carbon_increase_pct:+.1f}%)")
    print(f"      - Canopy coverage: {result.metrics.canopy_coverage_pct}%")

async def test_async_stream():
    print("[5/6] Testing Live Annealing Streaming Generator...")
    species = load_species_database()
    env = EnvironmentConditions(soil_ph=7.1, annual_rainfall_mm=1365.0, sunlight_hours=6.2)

    frames = []
    async for frame in stream_simulated_annealing(
        species_list=species,
        env=env,
        plot_width_m=40.0,
        plot_height_m=40.0,
        cell_size_m=5.0,
        iterations=1000,
        stream_interval=200,
        seed=42,
        years_horizon=20
    ):
        frames.append(frame)

    assert len(frames) >= 5, f"Expected >= 5 streaming frames, got {len(frames)}"
    assert frames[0].type == "progress"
    assert frames[-1].type == "complete"
    assert frames[-1].final_result is not None
    print(f"  OK: Generator emitted {len(frames)} frames smoothly terminating with type='complete'.")

from backend.app.services.autocomplete_service import search_locations

def test_fastapi_app():
    print("[6/7] Testing FastAPI App Route Registration...")
    routes = [r.path for r in app.routes if hasattr(r, 'path')]
    for r in app.routes:
        if hasattr(r, 'original_router'):
            routes.extend([sr.path for sr in r.original_router.routes if hasattr(sr, 'path')])

    expected_endpoints = [
        "/api/health",
        "/api/species",
        "/api/sites/presets",
        "/api/sites/dimensions",
        "/api/sites/fetch-env",
        "/api/sites/autocomplete",
        "/api/optimize/run",
        "/api/optimize/baseline",
        "/api/optimize/stream",
        "/api/analytics/projections",
        "/api/analytics/info"
    ]
    for ep in expected_endpoints:
        assert ep in routes, f"Missing expected route {ep}"
    print(f"  OK: All {len(expected_endpoints)} API and WebSocket routes registered.")

async def test_autocomplete():
    print("[7/7] Testing Autocomplete Recommendation Engine (Major Hubs + Tiny Villages)...")
    res_ban = await search_locations("ban", limit=6)
    names = [r["name"] for r in res_ban]
    assert any("Bangalore" in n for n in names), f"Expected Bangalore in results for 'ban', got: {names}"
    assert any("Bangkok" in n for n in names), f"Expected Bangkok in results for 'ban', got: {names}"
    print(f"  OK: 'ban' matched hubs: {names[:4]}")

    res_village = await search_locations("gudibande", limit=5)
    assert len(res_village) > 0, "Expected results for village 'gudibande'"
    assert "gudibande" in res_village[0]["name"].lower()
    print(f"  OK: 'gudibande' matched village: {res_village[0]['display_name']}")

from fastapi.testclient import TestClient

def test_no_land_selected_enforcement():
    print("[8/8] Testing No Land Selected Enforcement...")
    client = TestClient(app)
    # Payload without bounding_box
    payload = {
        "plot_width_m": 50,
        "plot_height_m": 50,
        "cell_size_m": 5,
        "environment": {
            "soil_ph": 7.0,
            "annual_rainfall_mm": 1200,
            "sunlight_hours": 6
        },
        "iterations": 1000,
        "start_temp": 50,
        "cooling_rate": 0.99
    }
    res_run = client.post("/api/optimize/run", json=payload)
    assert res_run.status_code == 400, f"Expected 400 when no land is selected, got {res_run.status_code}"
    assert "No land is selected" in res_run.json()["detail"]

    res_base = client.post("/api/optimize/baseline", json=payload)
    assert res_base.status_code == 400, f"Expected 400 when no land is selected, got {res_base.status_code}"
    assert "No land is selected" in res_base.json()["detail"]
    print("  OK: Endpoints correctly reject execution with 400 when no land is selected.")

if __name__ == "__main__":
    test_species_loading()
    test_suitability_and_baseline()
    test_geo_service()
    test_sync_optimization()
    asyncio.run(test_async_stream())
    test_fastapi_app()
    asyncio.run(test_autocomplete())
    test_no_land_selected_enforcement()
    print("\nALL BACKEND CORE TESTS PASSED SUCCESSFULLY! (8/8)")
