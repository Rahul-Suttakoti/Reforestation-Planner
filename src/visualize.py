"""
Renders a planting layout as a 2D map: each tree drawn as a circle scaled
to its mature canopy radius, color-coded by species, so overlaps/spacing
are visually obvious.
"""

import os

import matplotlib.pyplot as plt
import matplotlib.patches as patches

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SPECIES_COLORS = {
    "Azadirachta indica": "#6b8e23",
    "Ficus benghalensis": "#2e5c1a",
    "Tectona grandis": "#8b5a2b",
    "Pongamia pinnata": "#3d7a3d",
    "Delonix regia": "#d2691e",
    "Terminalia arjuna": "#556b2f",
    "Bambusa bambos": "#9acd32",
    "Mangifera indica": "#228b22",
}


def plot_layout(grid, title, filename):
    fig, ax = plt.subplots(figsize=(8, 8))

    plot_width = grid.cols * grid.cell_size
    plot_height = grid.rows * grid.cell_size

    ax.set_xlim(0, plot_width)
    ax.set_ylim(0, plot_height)
    ax.set_aspect("equal")
    ax.set_facecolor("#f5f0e6")

    seen_species = set()
    for row, col, species in grid.occupied_cells():
        x, y = grid.cell_center(row, col)
        radius = species["mature_canopy_radius_m"]
        color = SPECIES_COLORS.get(species["name"], "#666666")

        circle = patches.Circle(
            (x, y), radius, facecolor=color, edgecolor="black",
            alpha=0.55, linewidth=0.8,
        )
        ax.add_patch(circle)
        ax.plot(x, y, marker="o", markersize=3, color="black")

        label = species["common_name"] if species["name"] not in seen_species else None
        if label:
            seen_species.add(species["name"])
            ax.plot([], [], marker="o", markersize=10, color=color, alpha=0.55,
                     linestyle="", label=label)

    ax.set_title(title, fontsize=13, fontweight="bold")
    ax.set_xlabel("meters")
    ax.set_ylabel("meters")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.08), ncol=3, fontsize=8)
    ax.grid(True, linestyle="--", alpha=0.3)

    plt.tight_layout()
    plt.savefig(filename, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved {filename}")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from main import run

    optimized_grid, baseline_grid, env = run()

    plot_layout(optimized_grid, "Optimized Layout (Simulated Annealing)",
                os.path.join(_PROJECT_ROOT, "data", "optimized_layout.png"))
    plot_layout(baseline_grid, "Naive Baseline (Uniform Monoculture)",
                os.path.join(_PROJECT_ROOT, "data", "baseline_layout.png"))
