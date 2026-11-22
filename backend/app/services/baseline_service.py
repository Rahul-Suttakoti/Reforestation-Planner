import math
from typing import List, Tuple, Optional
from backend.app.schemas import (
    Species,
    EnvironmentConditions,
    SuitabilityWeights,
    PlantedTree,
    BaselineResult,
    GeoBoundingBox
)
from backend.app.services.data_service import compute_suitability_score
from backend.app.services.geo_service import metric_to_latlon

class FastGrid:
    def __init__(self, width_m: float, height_m: float, cell_size_m: float = 5.0):
        self.cell_size = cell_size_m
        self.cols = max(1, int(width_m // cell_size_m))
        self.rows = max(1, int(height_m // cell_size_m))
        self.width_m = self.cols * cell_size_m
        self.height_m = self.rows * cell_size_m
        self.planting: List[List[Optional[Species]]] = [[None for _ in range(self.cols)] for _ in range(self.rows)]

    def cell_center(self, row: int, col: int) -> Tuple[float, float]:
        x = col * self.cell_size + self.cell_size / 2.0
        y = row * self.cell_size + self.cell_size / 2.0
        return x, y

    def get(self, row: int, col: int) -> Optional[Species]:
        return self.planting[row][col]

    def set(self, row: int, col: int, species: Optional[Species]):
        self.planting[row][col] = species

    def occupied_cells(self):
        for r in range(self.rows):
            for c in range(self.cols):
                sp = self.planting[r][c]
                if sp is not None:
                    yield r, c, sp

    def total_planted(self) -> int:
        count = 0
        for r in range(self.rows):
            for c in range(self.cols):
                if self.planting[r][c] is not None:
                    count += 1
        return count

    def spacing_penalty(self, row: int, col: int, species: Species) -> float:
        penalty = 0.0
        my_radius = species.mature_canopy_radius_m
        x0, y0 = self.cell_center(row, col)
        span = int(math.ceil((my_radius * 2) / self.cell_size)) + 1

        r_min = max(0, row - span)
        r_max = min(self.rows - 1, row + span)
        c_min = max(0, col - span)
        c_max = min(self.cols - 1, col + span)

        for r in range(r_min, r_max + 1):
            for c in range(c_min, c_max + 1):
                if r == row and c == col:
                    continue
                other = self.planting[r][c]
                if other is not None:
                    x1, y1 = self.cell_center(r, c)
                    dist = math.hypot(x1 - x0, y1 - y0)
                    combined = my_radius + other.mature_canopy_radius_m
                    overlap = combined - dist
                    if overlap > 0:
                        penalty += (overlap / combined) ** 2
        return penalty

def build_naive_baseline(
    width_m: float,
    height_m: float,
    cell_size_m: float,
    species_list: List[Species],
    env: EnvironmentConditions,
    suitability_weights: SuitabilityWeights,
    years_horizon: int = 20,
    bbox: Optional[GeoBoundingBox] = None,
    chosen_species_name: Optional[str] = None
) -> BaselineResult:
    """Builds a spacing-respecting monoculture baseline layout using the user-chosen species or smart climate-adapted species."""
    best_sp: Optional[Species] = None
    best_suitability = 1.0

    # 1. If user explicitly picked a species from the dropdown
    if chosen_species_name and chosen_species_name.strip() and chosen_species_name.lower() != "auto":
        for sp in species_list:
            if sp.name.lower() == chosen_species_name.strip().lower() or sp.common_name.lower() == chosen_species_name.strip().lower():
                best_sp = sp
                best_suitability = compute_suitability_score(sp, env, suitability_weights)
                break

    # 2. Otherwise auto-select the best-suited species based on real climate/soil suitability and area-normalized yield
    if best_sp is None:
        scored_species = []
        for sp in species_list:
            score = compute_suitability_score(sp, env, suitability_weights)
            # Area in m2 occupied by mature canopy
            canopy_area = max(math.pi * (sp.mature_canopy_radius_m ** 2), 12.0)
            # Real plot-level carbon yield density per m2
            yield_density = (sp.carbon_sequestration_kg_per_year * score) / canopy_area
            # Balanced selection metric: area yield weighted by climate match confidence
            composite_score = yield_density * (score ** 0.5)
            scored_species.append((composite_score, score, sp))

        scored_species.sort(key=lambda x: x[0], reverse=True)
        if scored_species:
            _, best_suitability, best_sp = scored_species[0]
        else:
            best_sp = species_list[0]
            best_suitability = compute_suitability_score(best_sp, env, suitability_weights)

    grid = FastGrid(width_m, height_m, cell_size_m)

    # Greedily place best species respecting canopy spacing
    trees: List[PlantedTree] = []
    tree_idx = 0

    for r in range(grid.rows):
        for c in range(grid.cols):
            penalty = grid.spacing_penalty(r, c, best_sp)
            if penalty == 0.0:
                grid.set(r, c, best_sp)
                x, y = grid.cell_center(r, c)
                lat, lon = None, None
                if bbox is not None:
                    lat, lon = metric_to_latlon(x, y, bbox, grid.width_m, grid.height_m)

                tree_idx += 1
                trees.append(
                    PlantedTree(
                        id=f"baseline-{tree_idx}",
                        row=r,
                        col=c,
                        x=round(x, 2),
                        y=round(y, 2),
                        lat=lat,
                        lon=lon,
                        species_name=best_sp.name,
                        common_name=best_sp.common_name,
                        canopy_radius_m=best_sp.mature_canopy_radius_m,
                        carbon_kg_per_year=best_sp.carbon_sequestration_kg_per_year,
                        suitability_score=best_suitability,
                        color=best_sp.color or "#10b981"
                    )
                )

    annual_carbon = sum(t.carbon_kg_per_year * t.suitability_score for t in trees)
    total_carbon = annual_carbon * years_horizon

    return BaselineResult(
        strategy=f"Naive Monoculture ({best_sp.common_name})",
        chosen_species_name=best_sp.name,
        chosen_species_common=best_sp.common_name,
        trees_planted=len(trees),
        species_diversity_count=1 if len(trees) > 0 else 0,
        annual_carbon_kg=round(annual_carbon, 2),
        total_carbon_kg=round(total_carbon, 2),
        trees=trees
    )
