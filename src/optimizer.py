"""
Simulated annealing optimizer for tree species placement.

State: a Grid where each cell is either empty or holds a species.
Objective (to MAXIMIZE):
    total_score = carbon_score + biodiversity_score - spacing_penalty_score

At each step we propose one of three moves:
    - plant a tree in an empty cell
    - remove a tree from an occupied cell
    - change the species at an occupied cell
and accept/reject based on the standard Metropolis criterion.
"""

import copy
import math
import random


def score_cell(grid, row, col, species, suitability_fn, env, weights):
    """Score contribution of placing `species` at (row, col), given env."""
    suitability = suitability_fn(env, species)
    carbon = species["carbon_sequestration_kg_per_year"] * suitability
    biodiversity = grid.biodiversity_bonus(row, col, species)
    spacing_penalty = grid.spacing_penalty(row, col, species)

    return (
        weights["carbon"] * carbon
        + weights["biodiversity"] * biodiversity * 10  # scale to be comparable to carbon
        - weights["spacing"] * spacing_penalty * 50    # spacing violations should hurt
    )


def total_score(grid, suitability_fn, env, weights):
    total = 0.0
    for r, c, species in grid.occupied_cells():
        total += score_cell(grid, r, c, species, suitability_fn, env, weights)
    return total


def random_move(grid, species_db):
    """Pick a random move: plant, remove, or swap species."""
    row = random.randrange(grid.rows)
    col = random.randrange(grid.cols)
    current = grid.get(row, col)

    if current is None:
        move_type = "plant"
        new_species = random.choice(species_db)
    else:
        move_type = random.choice(["remove", "swap"])
        new_species = None if move_type == "remove" else random.choice(species_db)

    return row, col, move_type, new_species


def apply_move(grid, row, col, new_species):
    grid.set(row, col, new_species)


def simulated_annealing(
    grid,
    species_db,
    suitability_fn,
    env,
    iterations=20000,
    start_temp=50.0,
    cooling_rate=0.9995,
    weights=None,
    seed=None,
    verbose=True,
):
    if seed is not None:
        random.seed(seed)

    weights = weights or {"carbon": 1.0, "biodiversity": 1.0, "spacing": 1.0}

    current_score = total_score(grid, suitability_fn, env, weights)
    best_grid = copy.deepcopy(grid)
    best_score = current_score
    temperature = start_temp

    history = []

    for i in range(iterations):
        row, col, move_type, new_species = random_move(grid, species_db)
        old_species = grid.get(row, col)

        # score before the move (only the affected cell's local contribution
        # would be more efficient, but recomputing total is simplest/clearest
        # to read and is still fast enough at this grid size)
        apply_move(grid, row, col, new_species)
        new_total = total_score(grid, suitability_fn, env, weights)
        delta = new_total - current_score

        accept = False
        if delta > 0:
            accept = True
        else:
            probability = math.exp(delta / max(temperature, 1e-6))
            if random.random() < probability:
                accept = True

        if accept:
            current_score = new_total
            if current_score > best_score:
                best_score = current_score
                best_grid = copy.deepcopy(grid)
        else:
            # revert
            apply_move(grid, row, col, old_species)

        temperature *= cooling_rate

        if verbose and i % 2000 == 0:
            history.append((i, current_score, temperature))
            print(f"iter {i:6d}  score={current_score:8.2f}  temp={temperature:6.3f}  planted={grid.total_planted()}")

    return best_grid, best_score, history
