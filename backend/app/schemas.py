from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class Species(BaseModel):
    name: str
    common_name: str
    soil_ph_range: list[float]
    min_annual_rainfall_mm: float
    max_annual_rainfall_mm: float
    min_sunlight_hours: float
    mature_canopy_radius_m: float
    carbon_sequestration_kg_per_year: float
    native: bool
    color: Optional[str] = None
    suitability_score: Optional[float] = None

class EnvironmentConditions(BaseModel):
    soil_ph: float = 7.1
    annual_rainfall_mm: float = 1365.0
    sunlight_hours: float = 6.0
    avg_temperature_c: Optional[float] = 24.9
    elevation_m: Optional[float] = 586.0
    soil_organic_carbon_dg_kg: Optional[float] = 205.0

class SuitabilityWeights(BaseModel):
    soil: float = 0.40
    rainfall: float = 0.35
    sunlight: float = 0.25

class OptimizationWeights(BaseModel):
    carbon: float = 1.0
    biodiversity: float = 0.15
    spacing: float = 1.0

class GeoBoundingBox(BaseModel):
    lat_min: float
    lon_min: float
    lat_max: float
    lon_max: float

class SitePreset(BaseModel):
    id: str
    name: str
    region: str
    description: str
    bounding_box: GeoBoundingBox
    center: list[float]
    environment: EnvironmentConditions
    recommended_species: list[str] = []

class PlantedTree(BaseModel):
    id: str
    row: int
    col: int
    x: float
    y: float
    lat: Optional[float] = None
    lon: Optional[float] = None
    species_name: str
    common_name: str
    canopy_radius_m: float
    carbon_kg_per_year: float
    suitability_score: float
    color: str

class OptimizeRequest(BaseModel):
    plot_width_m: float = 100.0
    plot_height_m: float = 100.0
    cell_size_m: float = 5.0
    bounding_box: Optional[GeoBoundingBox] = None
    environment: EnvironmentConditions = Field(default_factory=EnvironmentConditions)
    suitability_weights: SuitabilityWeights = Field(default_factory=SuitabilityWeights)
    optimization_weights: OptimizationWeights = Field(default_factory=OptimizationWeights)
    iterations: int = 25000
    start_temp: float = 50.0
    cooling_rate: float = 0.9995
    selected_species: Optional[list[str]] = None
    naive_species: Optional[str] = None
    seed: Optional[int] = 42
    years_horizon: int = 20
    stream_interval: int = 200

class SpeciesDistribution(BaseModel):
    count: int
    percentage: float
    annual_carbon_kg: float
    total_carbon_kg: float
    color: str
    common_name: str

class OptimizationMetrics(BaseModel):
    trees_planted: int
    species_diversity_count: int
    shannon_diversity_index: float
    annual_carbon_kg: float
    total_carbon_kg: float
    canopy_coverage_m2: float
    canopy_coverage_pct: float
    spacing_penalties_total: float
    species_distribution: Dict[str, SpeciesDistribution]

class BaselineResult(BaseModel):
    strategy: str
    chosen_species_name: str
    chosen_species_common: str
    trees_planted: int
    species_diversity_count: int
    annual_carbon_kg: float
    total_carbon_kg: float
    trees: list[PlantedTree]

class ComparisonMetrics(BaseModel):
    carbon_increase_pct: float
    carbon_absolute_diff_kg: float
    diversity_increase: int
    tree_count_diff: int
    baseline_carbon_kg: float
    optimized_carbon_kg: float
    baseline_trees: int
    optimized_trees: int

class ConvergencePoint(BaseModel):
    iteration: int
    score: float
    temperature: float
    trees_planted: int
    acceptance_rate: float
    carbon_estimate: float

class OptimizationResult(BaseModel):
    plot_width_m: float
    plot_height_m: float
    cell_size_m: float
    rows: int
    cols: int
    best_score: float
    metrics: OptimizationMetrics
    trees: list[PlantedTree]
    baseline: BaselineResult
    comparison: ComparisonMetrics
    convergence_history: list[ConvergencePoint]

class StreamFrame(BaseModel):
    type: str = "progress" # "progress" | "complete" | "error"
    iteration: int = 0
    total_iterations: int = 0
    temperature: float = 0.0
    current_score: float = 0.0
    best_score: float = 0.0
    trees_planted: int = 0
    acceptance_rate: float = 0.0
    move_type: Optional[str] = None
    move_accepted: bool = False
    move_row: Optional[int] = None
    move_col: Optional[int] = None
    shannon_index: float = 0.0
    carbon_estimate: float = 0.0
    trees: Optional[list[PlantedTree]] = None
    final_result: Optional[OptimizationResult] = None
    message: Optional[str] = None
