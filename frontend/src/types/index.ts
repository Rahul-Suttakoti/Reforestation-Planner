export interface Species {
  name: string;
  common_name: string;
  soil_ph_range: [number, number];
  min_annual_rainfall_mm: number;
  max_annual_rainfall_mm: number;
  min_sunlight_hours: number;
  mature_canopy_radius_m: number;
  carbon_sequestration_kg_per_year: number;
  native: boolean;
  color: string;
  suitability_score?: number;
}

export interface EnvironmentConditions {
  soil_ph: number;
  annual_rainfall_mm: number;
  sunlight_hours: number;
  avg_temperature_c?: number;
  elevation_m?: number;
  soil_organic_carbon_dg_kg?: number;
}

export interface SuitabilityWeights {
  soil: number;
  rainfall: number;
  sunlight: number;
}

export interface OptimizationWeights {
  carbon: number;
  biodiversity: number;
  spacing: number;
}

export interface GeoBoundingBox {
  lat_min: number;
  lon_min: number;
  lat_max: number;
  lon_max: number;
}

export interface SitePreset {
  id: string;
  name: string;
  region: string;
  description: string;
  bounding_box: GeoBoundingBox;
  center: [number, number];
  environment: EnvironmentConditions;
  recommended_species: string[];
}

export interface PlantedTree {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  lat?: number;
  lon?: number;
  species_name: string;
  common_name: string;
  canopy_radius_m: number;
  carbon_kg_per_year: number;
  suitability_score: number;
  color: string;
}

export interface SpeciesDistribution {
  count: number;
  percentage: number;
  annual_carbon_kg: number;
  total_carbon_kg: number;
  color: string;
  common_name: string;
}

export interface OptimizationMetrics {
  trees_planted: number;
  species_diversity_count: number;
  shannon_diversity_index: number;
  annual_carbon_kg: number;
  total_carbon_kg: number;
  canopy_coverage_m2: number;
  canopy_coverage_pct: number;
  spacing_penalties_total: number;
  species_distribution: Record<string, SpeciesDistribution>;
}

export interface BaselineResult {
  strategy: string;
  chosen_species_name: string;
  chosen_species_common: string;
  trees_planted: number;
  species_diversity_count: number;
  annual_carbon_kg: number;
  total_carbon_kg: number;
  trees: PlantedTree[];
}

export interface ComparisonMetrics {
  carbon_increase_pct: number;
  carbon_absolute_diff_kg: number;
  diversity_increase: number;
  tree_count_diff: number;
  baseline_carbon_kg: number;
  optimized_carbon_kg: number;
  baseline_trees: number;
  optimized_trees: number;
}

export interface ConvergencePoint {
  iteration: int;
  score: number;
  temperature: number;
  trees_planted: number;
  acceptance_rate: number;
  carbon_estimate: number;
}

type int = number;

export interface OptimizationResult {
  plot_width_m: number;
  plot_height_m: number;
  cell_size_m: number;
  rows: number;
  cols: number;
  best_score: number;
  metrics: OptimizationMetrics;
  trees: PlantedTree[];
  baseline: BaselineResult;
  comparison: ComparisonMetrics;
  convergence_history: ConvergencePoint[];
}

export interface OptimizeRequest {
  plot_width_m: number;
  plot_height_m: number;
  cell_size_m: number;
  bounding_box?: GeoBoundingBox;
  environment: EnvironmentConditions;
  suitability_weights?: SuitabilityWeights;
  optimization_weights?: OptimizationWeights;
  iterations: number;
  start_temp: number;
  cooling_rate: number;
  selected_species?: string[];
  naive_species?: string;
  seed?: number;
  years_horizon?: number;
  stream_interval?: number;
}

export interface StreamFrame {
  type: "progress" | "complete" | "error";
  iteration: number;
  total_iterations: number;
  temperature: number;
  current_score: number;
  best_score: number;
  trees_planted: number;
  acceptance_rate: number;
  move_type?: "plant" | "remove" | "swap";
  move_accepted: boolean;
  move_row?: number;
  move_col?: number;
  shannon_index: number;
  carbon_estimate: number;
  trees?: PlantedTree[];
  final_result?: OptimizationResult;
  message?: string;
}

export interface LocationSearchResult {
  name: string;
  near?: string;
  disambiguated_name?: string;
  category: string;
  region: string;
  country: string;
  display_name: string;
  lat: number;
  lon: number;
  source?: string;
}
