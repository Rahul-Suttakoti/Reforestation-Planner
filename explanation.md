# Reforestation Planner: Simple Architecture Guide

## What this project is

This is one Python application split into modules, not a group of separately
deployed services. The `src/` modules call one another in the same process.
The external services are the public data APIs used by `fetch_data.py`:
NASA POWER, SoilGrids, and Open-Elevation.

## Directory and file responsibilities

```text
Reforestation-Planner/
├── src/                      Python application code
│   ├── fetch_data.py         Fetches site measurements from external APIs
│   ├── suitability.py        Loads JSON and scores species against conditions
│   ├── grid.py               Stores planting locations and spatial rules
│   ├── optimizer.py          Searches layouts using simulated annealing
│   ├── carbon.py             Builds the baseline and calculates result metrics
│   ├── main.py               Orchestrates baseline and optimized runs
│   └── visualize.py          Draws layouts and saves image outputs
├── data/                     Inputs, fetched site data, and generated images
│   ├── species_db.json       Species traits and carbon rates
│   ├── site_data.json        Sampled site conditions (written by fetch_data.py)
│   ├── baseline_layout.png   Rendered baseline (written by visualize.py)
│   └── optimized_layout.png  Rendered optimized layout (written by visualize.py)
├── README.md                 Project overview and run instructions
├── requirements.txt          Third-party Python dependencies
└── explanation.md            This architecture guide
```

`data/` is not a service: it is the shared file-based boundary between data
collection, the planner, and its outputs.

## Architectural style

The project follows a **modular monolith with a pipeline-style workflow**:

- **Modular monolith:** modules are separated by responsibility, but run
  together in one Python process. There are no internal network services or
  independently deployed components.
- **Pipeline:** site data is fetched, normalized into an environment, used to
  score and optimize a planting layout, then rendered as output images.
- **File-based integration:** `site_data.json` and `species_db.json` are the
  input contracts; the PNG files are generated outputs. The fetch step is run
  separately and does not run automatically as part of optimization.

In short: `fetch_data.py` is the ingestion edge, `main.py` coordinates the
planning workflow, the domain modules calculate the layout, and `visualize.py`
is the presentation/output edge.

## End-to-end flow

Data collection is a separate command; it is not automatically triggered by
the optimization run.

```text
External APIs
     │
     ▼
src/fetch_data.py ───────────────► data/site_data.json
                                        │
                                        ▼
src/visualize.py ──calls──► src/main.py:run()
                                ├── suitability.py: load JSON, derive env,
                                │                    score species
                                ├── carbon.py: build baseline and calculate
                                │             carbon/diversity metrics
                                ├── grid.py: create and hold each layout
                                └── optimizer.py: improve a grid using
                                     suitability.py + grid.py scoring rules
                                                │
                                                ▼
                                  return both grids to visualize.py
                                                │
                          ┌─────────────────────┴────────────────────┐
                          ▼                                          ▼
               data/baseline_layout.png                 data/optimized_layout.png
```

### Runtime sequence

1. Run `fetch_data.py` when site measurements need to be refreshed. It samples
   the configured bounding box and writes `data/site_data.json`.
2. `visualize.py` calls `main.run()`. The main module loads the species and
   site JSON through `suitability.py`, which averages the available samples
   into soil pH, annual rainfall, and sunlight values.
3. `main.py` creates a `Grid` and asks `carbon.py` to build the monoculture
   baseline. It creates another `Grid` for the optimizer.
4. `optimizer.py` proposes plant, remove, and species-swap moves. For scoring,
   it asks `suitability.py` for species fit and `grid.py` for spacing and
   biodiversity effects.
5. `main.py` compares carbon and diversity results and returns both layouts.
   `visualize.py` turns those layouts into PNG files under `data/`.

## Simple low-level design (LLD)

```text
main.run()
 ├── load_species_db() / load_site_data()
 ├── build_cell_environments(site_data) -> environment dict
 ├── Grid(width, height, cell_size)
 │    ├── get/set(row, col)
 │    ├── spacing_penalty(row, col, species)
 │    └── biodiversity_bonus(row, col, species)
 ├── naive_uniform_baseline(grid, species, environment)
 ├── simulated_annealing(grid, species, suitability_fn, environment, weights)
 │    ├── random_move(grid, species) -> proposed change
 │    ├── score_cell(...) -> carbon + diversity - spacing
 │    └── retain best grid snapshot
 ├── total_carbon_capture(grid, ...)
 └── return optimized_grid, baseline_grid, environment

visualize.py
 └── plot_layout(grid, title, filename) -> PNG
```

The important objects passed between modules are:

- **Species record:** a dictionary from `species_db.json`, including
  suitability ranges, canopy radius, and carbon rate.
- **Environment:** a dictionary of averaged soil, rainfall, and sunlight
  values produced from `site_data.json`.
- **Grid:** the current arrangement of empty cells and species.
- **Weights:** carbon, biodiversity, and spacing importance for the optimizer.

The optimizer maximizes a weighted score; the final carbon report is calculated
separately over the chosen time horizon. This keeps search scoring distinct
from the user-facing result metric.

## LLD patterns

These are lightweight LLD patterns visible in the implementation, not formal
class hierarchies. The first item in each category is used today. The second is
a suitable extension, but is not implemented yet.

### Behavioral

1. **Strategy — used, lightweight.** The optimizer and carbon calculation
   receive a `suitability_fn` rather than hard-coding the scoring algorithm.
   This keeps the suitability policy replaceable.
2. **Command — extension opportunity, not implemented.** The optimizer has
   plant/remove/swap moves, but they are represented as tuples and applied
   directly. Encapsulating a move with `apply()` and `undo()` would formalize
   the command pattern and make rollback easier to test.

### Structural

1. **Facade — used.** `main.run()` provides a single entry point that
   coordinates loading, baseline creation, optimization, and metric
   calculation for its caller.
2. **Adapter — used in a simple form.** Each provider-specific fetch function
   in `fetch_data.py` translates its API response into the project's internal
   metric names, such as `soil_ph` and `avg_precipitation_mm_day`.

### Creational

1. **Prototype — used.** `optimizer.py` uses `copy.deepcopy()` to preserve the
   best grid while the working grid continues to change. The copy acts as a
   snapshot of the current best solution.
2. **Factory — extension opportunity, not implemented.** `main.py` constructs
   baseline and optimizer grids directly. A factory could create both from one
   shared plot configuration, reducing the chance that dimensions or cell size
   drift between them.

## Important scope/configuration note

`main.py` currently configures a 100 m × 100 m plot with 5 m cells. The
README's headline result describes a 40 m × 40 m plot. These describe different
configurations, so verify which run produced the published result before
comparing numbers. Also, data collection only refreshes the site measurements;
it does not change the plot dimensions used by `main.py`.

## Running the pipeline

From the project directory:

```bash
python src/fetch_data.py  # Optional: refresh site_data.json from public APIs
python src/visualize.py   # Run planner and write both layout images
```
