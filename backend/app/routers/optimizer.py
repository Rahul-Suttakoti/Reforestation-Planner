import json
import logging
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from backend.app.schemas import (
    OptimizeRequest,
    OptimizationResult,
    BaselineResult,
    StreamFrame
)
from backend.app.services.data_service import load_species_database
from backend.app.services.optimizer_service import (
    run_simulated_annealing_sync,
    stream_simulated_annealing
)
from backend.app.services.baseline_service import build_naive_baseline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/optimize", tags=["Optimization Engine"])

@router.post("/run", response_model=OptimizationResult)
def run_optimization(request: OptimizeRequest):
    """Executes the simulated annealing optimizer synchronously and returns complete results."""
    if not request.bounding_box:
        raise HTTPException(
            status_code=400,
            detail="No land is selected! Please select a target reforestation region before running."
        )
    try:
        species_list = load_species_database()
        result = run_simulated_annealing_sync(
            species_list=species_list,
            env=request.environment,
            plot_width_m=request.plot_width_m,
            plot_height_m=request.plot_height_m,
            cell_size_m=request.cell_size_m,
            iterations=request.iterations,
            start_temp=request.start_temp,
            cooling_rate=request.cooling_rate,
            suitability_weights=request.suitability_weights,
            optimization_weights=request.optimization_weights,
            selected_species_names=request.selected_species,
            seed=request.seed,
            years_horizon=request.years_horizon,
            bbox=request.bounding_box,
            chosen_species_name=request.naive_species
        )
        return result
    except Exception as e:
        logger.exception("Optimization run failed")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/baseline", response_model=BaselineResult)
def run_baseline_only(request: OptimizeRequest):
    """Computes only the monoculture spacing-respecting baseline for quick comparison."""
    if not request.bounding_box:
        raise HTTPException(
            status_code=400,
            detail="No land is selected! Please select a target reforestation region before running."
        )
    try:
        species_list = load_species_database()
        if request.selected_species:
            species_list = [s for s in species_list if s.name in request.selected_species] or species_list

        return build_naive_baseline(
            width_m=request.plot_width_m,
            height_m=request.plot_height_m,
            cell_size_m=request.cell_size_m,
            species_list=species_list,
            env=request.environment,
            suitability_weights=request.suitability_weights,
            years_horizon=request.years_horizon,
            bbox=request.bounding_box,
            chosen_species_name=request.naive_species
        )
    except Exception as e:
        logger.exception("Baseline calculation failed")
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/stream")
async def websocket_annealing_stream(websocket: WebSocket):
    """
    WebSocket endpoint for live interactive simulated annealing visualization.
    Receives an OptimizeRequest payload and streams StreamFrame frames in real-time.
    """
    await websocket.accept()
    logger.info("WebSocket connection established for live annealing visualization.")

    try:
        data = await websocket.receive_text()
        raw_json = json.loads(data)
        request = OptimizeRequest(**raw_json)

        if not request.bounding_box:
            err_frame = StreamFrame(
                type="error",
                message="No land is selected! Please select a target reforestation region before running annealing."
            )
            await websocket.send_text(err_frame.model_dump_json())
            await websocket.close()
            return

        species_list = load_species_database()

        # Stream iterations
        async for frame in stream_simulated_annealing(
            species_list=species_list,
            env=request.environment,
            plot_width_m=request.plot_width_m,
            plot_height_m=request.plot_height_m,
            cell_size_m=request.cell_size_m,
            iterations=request.iterations,
            start_temp=request.start_temp,
            cooling_rate=request.cooling_rate,
            suitability_weights=request.suitability_weights,
            optimization_weights=request.optimization_weights,
            selected_species_names=request.selected_species,
            stream_interval=request.stream_interval,
            seed=request.seed,
            years_horizon=request.years_horizon,
            bbox=request.bounding_box,
            chosen_species_name=request.naive_species
        ):
            await websocket.send_text(frame.model_dump_json())

    except WebSocketDisconnect:
        logger.info("Client disconnected from annealing WebSocket.")
    except Exception as e:
        logger.exception("Error in annealing stream")
        try:
            err_frame = StreamFrame(
                type="error",
                message=f"Simulation error: {str(e)}"
            )
            await websocket.send_text(err_frame.model_dump_json())
            await websocket.close()
        except Exception:
            pass
