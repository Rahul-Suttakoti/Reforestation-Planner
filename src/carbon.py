"""
Carbon capture estimation + a naive baseline planting strategy to compare
the optimizer's result against.
"""

from suitability import cell_species_score


def naive_uniform_baseline(grid, species_db, env, respect_spacing=True):
    """
    A simple non-optimized strategy real projects sometimes actually use:
    plant the single most carbon-productive species uniformly, ignoring
    per-cell suitability nuance or biodiversity.

    If respect_spacing=True, trees are packed as tightly as the grid
    allows but skip a cell if it would violate that species' own canopy
    spacing (a fair baseline: "uniform monoculture done properly").
    If False, uses a naive fixed grid spacing regardless of canopy size
    (illustrates why ignoring spacing constraints looks good on paper but
    isn't realistic).
    """
    best_species = max(
        species_db,
        key=lambda sp: sp["carbon_sequestration_kg_per_year"] * cell_species_score(env, sp),
    )

    for row, col in grid.all_cells():
        if respect_spacing:
            penalty = grid.spacing_penalty(row, col, best_species)
            if penalty == 0.0:
                grid.set(row, col, best_species)
        else:
            if row % 2 == 0 and col % 2 == 0:
                grid.set(row, col, best_species)

    return grid, best_species


def total_carbon_capture(grid, suitability_fn, env, years=20):
    """
    Sum of (species sequestration rate * suitability at that cell) * years,
    across all planted cells.
    """
    total_annual = 0.0
    for r, c, species in grid.occupied_cells():
        suitability = suitability_fn(env, species)
        total_annual += species["carbon_sequestration_kg_per_year"] * suitability
    return total_annual * years


def species_diversity_count(grid):
    species_names = {species["name"] for _, _, species in grid.occupied_cells()}
    return len(species_names)
