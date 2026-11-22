import copy
import math
import random
import asyncio
from typing import List, Dict, Tuple, Optional, AsyncGenerator

from backend.app.schemas import (
    Species,
    EnvironmentConditions,
    SuitabilityWeights,
    OptimizationWeights,
    PlantedTree,
    OptimizationMetrics,
    OptimizationResult,
    ComparisonMetrics,
    ConvergencePoint,
    StreamFrame,
    GeoBoundingBox,
    SpeciesDistribution,
)
from backend.app.services.data_service import compute_suitability_score, SPECIES_PALETTE
from backend.app.services.geo_service import metric_to_latlon
from backend.app.services.baseline_service import FastGrid, build_naive_baseline

# Precompute Cartesian distance lookup table for fast spacing checks
MAX_GRID_SPAN = 35
DEFAULT_CELL_SIZE = 5.0
DIST_TABLE = [
    [math.hypot(dr * DEFAULT_CELL_SIZE, dc * DEFAULT_CELL_SIZE) for dc in range(MAX_GRID_SPAN + 1)]
    for dr in range(MAX_GRID_SPAN + 1)
]

def get_precomputed_dist(dr: int, dc: int, cell_size: float = 5.0) -> float:
    adr = abs(dr)
    adc = abs(dc)
    if cell_size == DEFAULT_CELL_SIZE and adr <= MAX_GRID_SPAN and adc <= MAX_GRID_SPAN:
        return DIST_TABLE[adr][adc]
    return math.hypot(adr * cell_size, adc * cell_size)

class AnnealingGrid(FastGrid):
    def __init__(self, width_m: float, height_m: float, cell_size_m: float = 5.0):
        super().__init__(width_m, height_m, cell_size_m)

    def biodiversity_bonus(self, row: int, col: int, species: Species, window_cells: int = 4) -> float:
        same_species_count = 0
        total_neighbors = 0

        r_min = max(0, row - window_cells)
        r_max = min(self.rows - 1, row + window_cells)
        c_min = max(0, col - window_cells)
        c_max = min(self.cols - 1, col + window_cells)

        for r in range(r_min, r_max + 1):
            for c in range(c_min, c_max + 1):
                if r == row and c == col:
                    continue
                neighbor = self.planting[r][c]
                if neighbor is not None:
                    total_neighbors += 1
                    if neighbor.name == species.name:
                        same_species_count += 1

        if total_neighbors == 0:
            return 0.0
        return 1.0 - (same_species_count / total_neighbors)

def score_cell(
    grid: AnnealingGrid,
    row: int,
    col: int,
    species: Species,
    suitability: float,
    weights: OptimizationWeights
) -> float:
    carbon = species.carbon_sequestration_kg_per_year * suitability
    biodiversity = grid.biodiversity_bonus(row, col, species)
    spacing_penalty = grid.spacing_penalty(row, col, species)

    return (
        weights.carbon * carbon
        + weights.biodiversity * biodiversity * 10.0
        - weights.spacing * spacing_penalty * 50.0
    )

def total_grid_score(
    grid: AnnealingGrid,
    suitability_map: Dict[str, float],
    weights: OptimizationWeights
) -> float:
    total = 0.0
    for r, c, species in grid.occupied_cells():
        suitability = suitability_map.get(species.name, 1.0)
        total += score_cell(grid, r, c, species, suitability, weights)
    return total

def calculate_incident_spacing_penalty(grid: AnnealingGrid, r0: int, c0: int, sp: Optional[Species]) -> float:
    """Computes total spacing overlap penalty of tree at (r0, c0) with all neighbors."""
    if sp is None:
        return 0.0
    my_r = sp.mature_canopy_radius_m
    span = int(math.ceil((my_r * 2.0) / grid.cell_size)) + 1
    penalty = 0.0

    r_min = max(0, r0 - span)
    r_max = min(grid.rows - 1, r0 + span)
    c_min = max(0, c0 - span)
    c_max = min(grid.cols - 1, c0 + span)

    for r1 in range(r_min, r_max + 1):
        dr = abs(r1 - r0)
        for c1 in range(c_min, c_max + 1):
            if r1 == r0 and c1 == c0:
                continue
            other = grid.planting[r1][c1]
            if other is not None:
                dist = get_precomputed_dist(dr, abs(c1 - c0), grid.cell_size)
                combined = my_r + other.mature_canopy_radius_m
                overlap = combined - dist
                if overlap > 0:
                    penalty += (overlap / combined) ** 2
    return penalty

def calculate_shannon_index(grid: AnnealingGrid) -> float:
    counts: Dict[str, int] = {}
    total = 0
    for _, _, sp in grid.occupied_cells():
        counts[sp.name] = counts.get(sp.name, 0) + 1
        total += 1

    if total == 0:
        return 0.0

    shannon = 0.0
    for count in counts.values():
        p = count / total
        if p > 0:
            shannon -= p * math.log(p)
    return round(shannon, 3)

def calculate_canopy_coverage(grid: AnnealingGrid) -> Tuple[float, float]:
    occupied = list(grid.occupied_cells())
    if not occupied:
        return 0.0, 0.0

    covered_cells = 0
    for r in range(grid.rows):
        for c in range(grid.cols):
            cx, cy = grid.cell_center(r, c)
            for tr, tc, tsp in occupied:
                tx, ty = grid.cell_center(tr, tc)
                if math.hypot(cx - tx, cy - ty) <= tsp.mature_canopy_radius_m:
                    covered_cells += 1
                    break

    covered_m2 = covered_cells * (grid.cell_size ** 2)
    total_m2 = grid.width_m * grid.height_m
    pct = (covered_m2 / max(total_m2, 1.0)) * 100.0
    return round(covered_m2, 1), round(min(100.0, pct), 1)

def build_planted_trees_list(
    grid: AnnealingGrid,
    suitability_map: Dict[str, float],
    bbox: Optional[GeoBoundingBox] = None,
    organic_dispersion: bool = True
) -> List[PlantedTree]:
    trees: List[PlantedTree] = []
    idx = 0
    for r, c, sp in grid.occupied_cells():
        idx += 1
        x, y = grid.cell_center(r, c)

        if organic_dispersion:
            # Deterministic natural organic dispersion so trees appear naturally circle-packed rather than on an artificial grid
            h = (r * 73856093 ^ c * 19349663 ^ len(sp.name) * 83492791) % 1000
            angle = (h / 1000.0) * 2 * math.pi
            mag = (((h * 37) % 500) / 500.0) * min(grid.cell_size * 0.22, 1.1)
            dx = math.cos(angle) * mag
            dy = math.sin(angle) * mag
            x = max(sp.mature_canopy_radius_m, min(grid.width_m - sp.mature_canopy_radius_m, x + dx))
            y = max(sp.mature_canopy_radius_m, min(grid.height_m - sp.mature_canopy_radius_m, y + dy))

        lat, lon = None, None
        if bbox is not None:
            lat, lon = metric_to_latlon(x, y, bbox, grid.width_m, grid.height_m)

        trees.append(
            PlantedTree(
                id=f"tree-{r}-{c}-{idx}",
                row=r,
                col=c,
                x=round(x, 2),
                y=round(y, 2),
                lat=lat,
                lon=lon,
                species_name=sp.name,
                common_name=sp.common_name,
                canopy_radius_m=sp.mature_canopy_radius_m,
                carbon_kg_per_year=sp.carbon_sequestration_kg_per_year,
                suitability_score=suitability_map.get(sp.name, 1.0),
                color=sp.color or SPECIES_PALETTE.get(sp.name, "#10b981")
            )
        )
    return trees

def compute_optimization_metrics(
    grid: AnnealingGrid,
    suitability_map: Dict[str, float],
    years_horizon: int = 20
) -> OptimizationMetrics:
    species_dist: Dict[str, Dict] = {}
    total_trees = 0
    annual_carbon = 0.0
    total_penalties = 0.0

    for r, c, sp in grid.occupied_cells():
        total_trees += 1
        suitability = suitability_map.get(sp.name, 1.0)
        tree_carbon = sp.carbon_sequestration_kg_per_year * suitability
        annual_carbon += tree_carbon
        total_penalties += grid.spacing_penalty(r, c, sp)

        if sp.name not in species_dist:
            species_dist[sp.name] = {
                "count": 0,
                "annual_carbon": 0.0,
                "color": sp.color or SPECIES_PALETTE.get(sp.name, "#10b981"),
                "common_name": sp.common_name
            }
        species_dist[sp.name]["count"] += 1
        species_dist[sp.name]["annual_carbon"] += tree_carbon

    distribution_models: Dict[str, SpeciesDistribution] = {}
    for name, data in species_dist.items():
        pct = (data["count"] / max(total_trees, 1)) * 100.0
        tot_c = data["annual_carbon"] * years_horizon
        distribution_models[name] = SpeciesDistribution(
            count=data["count"],
            percentage=round(pct, 1),
            annual_carbon_kg=round(data["annual_carbon"], 2),
            total_carbon_kg=round(tot_c, 2),
            color=data["color"],
            common_name=data["common_name"]
        )

    shannon = calculate_shannon_index(grid)
    canopy_m2, canopy_pct = calculate_canopy_coverage(grid)

    return OptimizationMetrics(
        trees_planted=total_trees,
        species_diversity_count=len(species_dist),
        shannon_diversity_index=shannon,
        annual_carbon_kg=round(annual_carbon, 2),
        total_carbon_kg=round(annual_carbon * years_horizon, 2),
        canopy_coverage_m2=canopy_m2,
        canopy_coverage_pct=canopy_pct,
        spacing_penalties_total=round(total_penalties, 2),
        species_distribution=distribution_models
    )

def run_simulated_annealing_sync(
    species_list: List[Species],
    env: EnvironmentConditions,
    plot_width_m: float = 100.0,
    plot_height_m: float = 100.0,
    cell_size_m: float = 5.0,
    iterations: int = 25000,
    start_temp: float = 50.0,
    cooling_rate: float = 0.9995,
    suitability_weights: Optional[SuitabilityWeights] = None,
    optimization_weights: Optional[OptimizationWeights] = None,
    selected_species_names: Optional[List[str]] = None,
    seed: Optional[int] = 42,
    years_horizon: int = 20,
    bbox: Optional[GeoBoundingBox] = None,
    chosen_species_name: Optional[str] = None
) -> OptimizationResult:
    """High-speed synchronous simulated annealing using O(1) incident edge delta evaluation."""
    if seed is not None:
        random.seed(seed)

    suitability_weights = suitability_weights or SuitabilityWeights()
    optimization_weights = optimization_weights or OptimizationWeights()

    active_species = species_list
    if selected_species_names:
        active_species = [s for s in species_list if s.name in selected_species_names]
        if not active_species:
            active_species = species_list

    suitability_map = {
        sp.name: compute_suitability_score(sp, env, suitability_weights)
        for sp in active_species
    }

    grid = AnnealingGrid(plot_width_m, plot_height_m, cell_size_m)
    rows, cols = grid.rows, grid.cols
    W_BIO = 4

    # Direct tracking of occupied neighbor counts for ultra-low latency biodiversity delta
    occ_count = [[0 for _ in range(cols)] for _ in range(rows)]
    sp_counts = [[{} for _ in range(cols)] for _ in range(rows)]

    current_score = 0.0
    best_grid = copy.deepcopy(grid)
    best_score = 0.0
    temperature = start_temp

    history: List[ConvergencePoint] = []
    accepted_moves = 0
    record_interval = max(500, iterations // 40)

    for i in range(iterations):
        r = random.randrange(rows)
        c = random.randrange(cols)
        cur = grid.get(r, c)

        if cur is None:
            new_sp = random.choice(active_species)
        else:
            new_sp = None if random.random() < 0.5 else random.choice(active_species)

        if new_sp == cur:
            continue

        # 1. Delta Carbon
        carb_old = cur.carbon_sequestration_kg_per_year * suitability_map.get(cur.name, 1.0) if cur else 0.0
        carb_new = new_sp.carbon_sequestration_kg_per_year * suitability_map.get(new_sp.name, 1.0) if new_sp else 0.0
        delta_carb = carb_new - carb_old

        # 2. Delta Spacing (Incident edges change symmetrically)
        pen_old = calculate_incident_spacing_penalty(grid, r, c, cur)
        pen_new = calculate_incident_spacing_penalty(grid, r, c, new_sp)
        delta_spacing = 2.0 * (pen_new - pen_old)

        # 3. Delta Biodiversity
        tot_self = occ_count[r][c]
        bio_self_old = (1.0 - sp_counts[r][c].get(cur.name, 0) / tot_self) if (cur and tot_self > 0) else 0.0
        bio_self_new = (1.0 - sp_counts[r][c].get(new_sp.name, 0) / tot_self) if (new_sp and tot_self > 0) else 0.0
        delta_bio = bio_self_new - bio_self_old

        # Window neighbors
        r_min = max(0, r - W_BIO)
        r_max = min(rows - 1, r + W_BIO)
        c_min = max(0, c - W_BIO)
        c_max = min(cols - 1, c + W_BIO)

        for nr in range(r_min, r_max + 1):
            for nc in range(c_min, c_max + 1):
                if nr == r and nc == c:
                    continue
                oth = grid.get(nr, nc)
                if oth is not None:
                    tot = occ_count[nr][nc]
                    same = sp_counts[nr][nc].get(oth.name, 0)
                    b_old = 1.0 - same / tot if tot > 0 else 0.0

                    tot_new = tot
                    same_new = same
                    if cur is not None:
                        tot_new -= 1
                        if cur.name == oth.name:
                            same_new -= 1
                    if new_sp is not None:
                        tot_new += 1
                        if new_sp.name == oth.name:
                            same_new += 1

                    b_new = 1.0 - same_new / tot_new if tot_new > 0 else 0.0
                    delta_bio += (b_new - b_old)

        delta = (
            optimization_weights.carbon * delta_carb
            + optimization_weights.biodiversity * delta_bio * 10.0
            - optimization_weights.spacing * delta_spacing * 50.0
        )

        accept = False
        if delta > 0:
            accept = True
        else:
            prob = math.exp(delta / max(temperature, 1e-6))
            if random.random() < prob:
                accept = True

        if accept:
            accepted_moves += 1
            current_score += delta
            grid.set(r, c, new_sp)

            # Update neighbor counts
            for nr in range(r_min, r_max + 1):
                for nc in range(c_min, c_max + 1):
                    if nr == r and nc == c:
                        continue
                    if cur is not None:
                        occ_count[nr][nc] -= 1
                        sp_counts[nr][nc][cur.name] = sp_counts[nr][nc].get(cur.name, 1) - 1
                    if new_sp is not None:
                        occ_count[nr][nc] += 1
                        sp_counts[nr][nc][new_sp.name] = sp_counts[nr][nc].get(new_sp.name, 0) + 1

            if current_score > best_score:
                best_score = current_score
                best_grid = copy.deepcopy(grid)

        temperature *= cooling_rate

        if i % record_interval == 0 or i == iterations - 1:
            annual_c = sum(sp.carbon_sequestration_kg_per_year * suitability_map.get(sp.name, 1.0) for _, _, sp in grid.occupied_cells())
            history.append(
                ConvergencePoint(
                    iteration=i,
                    score=round(current_score, 2),
                    temperature=round(temperature, 3),
                    trees_planted=grid.total_planted(),
                    acceptance_rate=round(accepted_moves / max(i + 1, 1), 3),
                    carbon_estimate=round(annual_c * years_horizon, 1)
                )
            )

    # Compute baseline
    baseline = build_naive_baseline(
        plot_width_m, plot_height_m, cell_size_m, active_species, env, suitability_weights, years_horizon, bbox, chosen_species_name
    )

    metrics = compute_optimization_metrics(best_grid, suitability_map, years_horizon)
    trees = build_planted_trees_list(best_grid, suitability_map, bbox)

    base_carbon = max(baseline.total_carbon_kg, 1.0)
    opt_carbon = metrics.total_carbon_kg
    carbon_diff_kg = opt_carbon - base_carbon
    carbon_pct = ((opt_carbon - base_carbon) / base_carbon) * 100.0

    comparison = ComparisonMetrics(
        carbon_increase_pct=round(carbon_pct, 1),
        carbon_absolute_diff_kg=round(carbon_diff_kg, 1),
        diversity_increase=metrics.species_diversity_count - baseline.species_diversity_count,
        tree_count_diff=metrics.trees_planted - baseline.trees_planted,
        baseline_carbon_kg=baseline.total_carbon_kg,
        optimized_carbon_kg=metrics.total_carbon_kg,
        baseline_trees=baseline.trees_planted,
        optimized_trees=metrics.trees_planted
    )

    return OptimizationResult(
        plot_width_m=best_grid.width_m,
        plot_height_m=best_grid.height_m,
        cell_size_m=cell_size_m,
        rows=best_grid.rows,
        cols=best_grid.cols,
        best_score=round(best_score, 2),
        metrics=metrics,
        trees=trees,
        baseline=baseline,
        comparison=comparison,
        convergence_history=history
    )

async def stream_simulated_annealing(
    species_list: List[Species],
    env: EnvironmentConditions,
    plot_width_m: float = 100.0,
    plot_height_m: float = 100.0,
    cell_size_m: float = 5.0,
    iterations: int = 25000,
    start_temp: float = 50.0,
    cooling_rate: float = 0.9995,
    suitability_weights: Optional[SuitabilityWeights] = None,
    optimization_weights: Optional[OptimizationWeights] = None,
    selected_species_names: Optional[List[str]] = None,
    stream_interval: Optional[int] = None,
    seed: Optional[int] = None,
    years_horizon: int = 20,
    bbox: Optional[GeoBoundingBox] = None,
    chosen_species_name: Optional[str] = None
) -> AsyncGenerator[StreamFrame, None]:
    """Ultra-low latency async streaming generator yielding fluid visual frames at ~60fps."""
    if seed is not None:
        random.seed(seed)

    suitability_weights = suitability_weights or SuitabilityWeights()
    optimization_weights = optimization_weights or OptimizationWeights()

    active_species = species_list
    if selected_species_names:
        active_species = [s for s in species_list if s.name in selected_species_names]
        if not active_species:
            active_species = species_list

    suitability_map = {
        sp.name: compute_suitability_score(sp, env, suitability_weights)
        for sp in active_species
    }

    grid = AnnealingGrid(plot_width_m, plot_height_m, cell_size_m)
    rows, cols = grid.rows, grid.cols
    W_BIO = 4

    occ_count = [[0 for _ in range(cols)] for _ in range(rows)]
    sp_counts = [[{} for _ in range(cols)] for _ in range(rows)]

    current_score = 0.0
    best_grid = copy.deepcopy(grid)
    best_score = 0.0
    temperature = start_temp
    accepted_moves = 0

    # Fluid adaptive streaming cadence: aim for ~35 frames total across the simulation
    actual_interval = stream_interval or max(400, iterations // 35)

    yield StreamFrame(
        type="progress",
        iteration=0,
        total_iterations=iterations,
        temperature=round(temperature, 3),
        current_score=0.0,
        best_score=0.0,
        trees_planted=0,
        acceptance_rate=0.0,
        move_type=None,
        move_accepted=False,
        shannon_index=0.0,
        carbon_estimate=0.0,
        trees=[]
    )

    for i in range(1, iterations + 1):
        r = random.randrange(rows)
        c = random.randrange(cols)
        cur = grid.get(r, c)

        if cur is None:
            move_type = "plant"
            new_sp = random.choice(active_species)
        else:
            move_type = "remove" if random.random() < 0.5 else "swap"
            new_sp = None if move_type == "remove" else random.choice(active_species)

        if new_sp == cur:
            continue

        carb_old = cur.carbon_sequestration_kg_per_year * suitability_map.get(cur.name, 1.0) if cur else 0.0
        carb_new = new_sp.carbon_sequestration_kg_per_year * suitability_map.get(new_sp.name, 1.0) if new_sp else 0.0
        delta_carb = carb_new - carb_old

        pen_old = calculate_incident_spacing_penalty(grid, r, c, cur)
        pen_new = calculate_incident_spacing_penalty(grid, r, c, new_sp)
        delta_spacing = 2.0 * (pen_new - pen_old)

        tot_self = occ_count[r][c]
        bio_self_old = (1.0 - sp_counts[r][c].get(cur.name, 0) / tot_self) if (cur and tot_self > 0) else 0.0
        bio_self_new = (1.0 - sp_counts[r][c].get(new_sp.name, 0) / tot_self) if (new_sp and tot_self > 0) else 0.0
        delta_bio = bio_self_new - bio_self_old

        r_min = max(0, r - W_BIO)
        r_max = min(rows - 1, r + W_BIO)
        c_min = max(0, c - W_BIO)
        c_max = min(cols - 1, c + W_BIO)

        for nr in range(r_min, r_max + 1):
            for nc in range(c_min, c_max + 1):
                if nr == r and nc == c:
                    continue
                oth = grid.get(nr, nc)
                if oth is not None:
                    tot = occ_count[nr][nc]
                    same = sp_counts[nr][nc].get(oth.name, 0)
                    b_old = 1.0 - same / tot if tot > 0 else 0.0

                    tot_new = tot
                    same_new = same
                    if cur is not None:
                        tot_new -= 1
                        if cur.name == oth.name:
                            same_new -= 1
                    if new_sp is not None:
                        tot_new += 1
                        if new_sp.name == oth.name:
                            same_new += 1

                    b_new = 1.0 - same_new / tot_new if tot_new > 0 else 0.0
                    delta_bio += (b_new - b_old)

        delta = (
            optimization_weights.carbon * delta_carb
            + optimization_weights.biodiversity * delta_bio * 10.0
            - optimization_weights.spacing * delta_spacing * 50.0
        )

        accept = False
        if delta > 0:
            accept = True
        else:
            prob = math.exp(delta / max(temperature, 1e-6))
            if random.random() < prob:
                accept = True

        if accept:
            accepted_moves += 1
            current_score += delta
            grid.set(r, c, new_sp)

            for nr in range(r_min, r_max + 1):
                for nc in range(c_min, c_max + 1):
                    if nr == r and nc == c:
                        continue
                    if cur is not None:
                        occ_count[nr][nc] -= 1
                        sp_counts[nr][nc][cur.name] = sp_counts[nr][nc].get(cur.name, 1) - 1
                    if new_sp is not None:
                        occ_count[nr][nc] += 1
                        sp_counts[nr][nc][new_sp.name] = sp_counts[nr][nc].get(new_sp.name, 0) + 1

            if current_score > best_score:
                best_score = current_score
                best_grid = copy.deepcopy(grid)

        temperature *= cooling_rate

        if i % actual_interval == 0 or i == iterations:
            rate = round(accepted_moves / max(i, 1), 3)
            annual_c = sum(sp.carbon_sequestration_kg_per_year * suitability_map.get(sp.name, 1.0) for _, _, sp in grid.occupied_cells())
            shannon = calculate_shannon_index(grid)
            current_trees = build_planted_trees_list(grid, suitability_map, bbox)

            yield StreamFrame(
                type="progress",
                iteration=i,
                total_iterations=iterations,
                temperature=round(temperature, 3),
                current_score=round(current_score, 2),
                best_score=round(best_score, 2),
                trees_planted=len(current_trees),
                acceptance_rate=rate,
                move_type=move_type,
                move_accepted=accept,
                move_row=r,
                move_col=c,
                shannon_index=shannon,
                carbon_estimate=round(annual_c * years_horizon, 1),
                trees=current_trees
            )
            # Ultra-short non-blocking dispatch tick
            await asyncio.sleep(0.003)

    # Final result
    baseline = build_naive_baseline(
        plot_width_m, plot_height_m, cell_size_m, active_species, env, suitability_weights, years_horizon, bbox, chosen_species_name
    )
    final_metrics = compute_optimization_metrics(best_grid, suitability_map, years_horizon)
    final_trees = build_planted_trees_list(best_grid, suitability_map, bbox)

    base_carbon = max(baseline.total_carbon_kg, 1.0)
    opt_carbon = final_metrics.total_carbon_kg
    carbon_diff_kg = opt_carbon - base_carbon
    carbon_pct = ((opt_carbon - base_carbon) / base_carbon) * 100.0

    comparison = ComparisonMetrics(
        carbon_increase_pct=round(carbon_pct, 1),
        carbon_absolute_diff_kg=round(carbon_diff_kg, 1),
        diversity_increase=final_metrics.species_diversity_count - baseline.species_diversity_count,
        tree_count_diff=final_metrics.trees_planted - baseline.trees_planted,
        baseline_carbon_kg=baseline.total_carbon_kg,
        optimized_carbon_kg=final_metrics.total_carbon_kg,
        baseline_trees=baseline.trees_planted,
        optimized_trees=final_metrics.trees_planted
    )

    final_result = OptimizationResult(
        plot_width_m=best_grid.width_m,
        plot_height_m=best_grid.height_m,
        cell_size_m=cell_size_m,
        rows=best_grid.rows,
        cols=best_grid.cols,
        best_score=round(best_score, 2),
        metrics=final_metrics,
        trees=final_trees,
        baseline=baseline,
        comparison=comparison,
        convergence_history=[]
    )

    yield StreamFrame(
        type="complete",
        iteration=iterations,
        total_iterations=iterations,
        temperature=round(temperature, 3),
        current_score=round(best_score, 2),
        best_score=round(best_score, 2),
        trees_planted=len(final_trees),
        acceptance_rate=round(accepted_moves / max(iterations, 1), 3),
        trees=final_trees,
        final_result=final_result,
        message="Simulated annealing completed."
    )
