"""
Runs the full pipeline:
  1. Load site + species data
  2. Build a rectangular grid for the plot
  3. Run simulated annealing to find an optimized planting layout
  4. Compare against a naive uniform-planting baseline
  5. Print carbon capture results
"""

import copy

from suitability import load_species_db, load_site_data, build_cell_environments, cell_species_score
from grid import Grid
from optimizer import simulated_annealing
from carbon import naive_uniform_baseline, total_carbon_capture, species_diversity_count

# Plot dimensions in meters (a small demo plot; matches roughly a 40x40m patch)
PLOT_WIDTH_M = 100
PLOT_HEIGHT_M = 100
CELL_SIZE_M = 5 # bump up so the grid isn't tens of thousands of cells
YEARS_HORIZON = 20


def run():
    species_db = load_species_db()
    site_data = load_site_data()
    env = build_cell_environments(site_data)

    print(f"Site: {site_data['site_name']}")
    print(f"Environment: {env}")
    print(f"Plot size: {PLOT_WIDTH_M}m x {PLOT_HEIGHT_M}m, cell size: {CELL_SIZE_M}m\n")

    # ---- Baseline ----
    baseline_grid = Grid(PLOT_WIDTH_M, PLOT_HEIGHT_M, CELL_SIZE_M)
    baseline_grid, chosen_species = naive_uniform_baseline(baseline_grid, species_db, env, respect_spacing=True)
    baseline_carbon = total_carbon_capture(baseline_grid, cell_species_score, env, YEARS_HORIZON)
    baseline_diversity = species_diversity_count(baseline_grid)

    print("=== Naive Baseline (uniform monoculture) ===")
    print(f"Species used: {chosen_species['common_name']}")
    print(f"Trees planted: {baseline_grid.total_planted()}")
    print(f"Species diversity: {baseline_diversity}")
    print(f"Estimated carbon capture over {YEARS_HORIZON} years: {baseline_carbon:,.1f} kg\n")

    # ---- Optimized (simulated annealing) ----
    opt_grid = Grid(PLOT_WIDTH_M, PLOT_HEIGHT_M, CELL_SIZE_M)
    weights = {"carbon": 1.0, "biodiversity": 0.15, "spacing": 1.0}

    print("=== Running simulated annealing optimizer ===")
    best_grid, best_score, history = simulated_annealing(
        opt_grid,
        species_db,
        cell_species_score,
        env,
        iterations=40000,
        start_temp=50.0,
        cooling_rate=0.9995,
        weights=weights,
        seed=42,
        verbose=True,
    )

    opt_carbon = total_carbon_capture(best_grid, cell_species_score, env, YEARS_HORIZON)
    opt_diversity = species_diversity_count(best_grid)

    print("\n=== Optimized Layout (Simulated Annealing) ===")
    print(f"Trees planted: {best_grid.total_planted()}")
    print(f"Species diversity: {opt_diversity}")
    print(f"Estimated carbon capture over {YEARS_HORIZON} years: {opt_carbon:,.1f} kg\n")

    improvement = ((opt_carbon - baseline_carbon) / baseline_carbon) * 100
    print("=== Comparison ===")
    print(f"Optimized layout captures {improvement:+.1f}% carbon vs. naive baseline")
    print(f"Species diversity improvement: {baseline_diversity} -> {opt_diversity}")

    return best_grid, baseline_grid, env


if __name__ == "__main__":
    run()
