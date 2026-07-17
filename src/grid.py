"""
Grid representation for the planting plot, plus spacing/overlap logic
between planted trees (a simplified stand-in for full 2D computational
geometry: we treat each tree's canopy as a circle and check pairwise
distance against combined canopy radii).
"""

import math


class Grid:
    def __init__(self, width_m, height_m, cell_size_m=5):
        """
        width_m, height_m: physical dimensions of the rectangular plot
        cell_size_m: size of each grid cell (a tree can be planted at
                     the center of any cell)
        """
        self.cell_size = cell_size_m
        self.cols = max(1, int(width_m // cell_size_m))
        self.rows = max(1, int(height_m // cell_size_m))
        # planting[row][col] = species dict or None
        self.planting = [[None for _ in range(self.cols)] for _ in range(self.rows)]

    def cell_center(self, row, col):
        x = col * self.cell_size + self.cell_size / 2
        y = row * self.cell_size + self.cell_size / 2
        return x, y

    def all_cells(self):
        return [(r, c) for r in range(self.rows) for c in range(self.cols)]

    def get(self, row, col):
        return self.planting[row][col]

    def set(self, row, col, species):
        self.planting[row][col] = species

    def neighbors_within_radius(self, row, col, radius_m):
        """Yields (r, c) of all planted cells within radius_m of this cell."""
        x0, y0 = self.cell_center(row, col)
        cell_radius_span = int(math.ceil(radius_m / self.cell_size)) + 1

        for dr in range(-cell_radius_span, cell_radius_span + 1):
            for dc in range(-cell_radius_span, cell_radius_span + 1):
                r, c = row + dr, col + dc
                if 0 <= r < self.rows and 0 <= c < self.cols and (r, c) != (row, col):
                    if self.planting[r][c] is not None:
                        x1, y1 = self.cell_center(r, c)
                        dist = math.hypot(x1 - x0, y1 - y0)
                        if dist <= radius_m:
                            yield (r, c, dist)

    def spacing_penalty(self, row, col, species):
        """
        Penalty for placing `species` at (row, col) given already-planted
        neighbors. Canopy overlap is penalized proportionally to how much
        the combined canopy radii exceed the actual distance.
        """
        penalty = 0.0
        my_radius = species["mature_canopy_radius_m"]

        for r, c, dist in self.neighbors_within_radius(row, col, my_radius * 2):
            other = self.planting[r][c]
            combined_radius = my_radius + other["mature_canopy_radius_m"]
            overlap = combined_radius - dist
            if overlap > 0:
                # normalize by combined radius so penalty is scale-independent
                penalty += (overlap / combined_radius) ** 2

        return penalty

    def biodiversity_bonus(self, row, col, species, window_cells=4):
        """
        Rewards planting a species that's different from nearby species
        (simple proxy for encouraging mixed-species neighborhoods over
        monoculture blocks).
        """
        same_species_count = 0
        total_neighbors = 0

        for dr in range(-window_cells, window_cells + 1):
            for dc in range(-window_cells, window_cells + 1):
                r, ccol = row + dr, col + dc
                if (r, ccol) == (row, col):
                    continue
                if 0 <= r < self.rows and 0 <= ccol < self.cols:
                    neighbor = self.planting[r][ccol]
                    if neighbor is not None:
                        total_neighbors += 1
                        if neighbor["name"] == species["name"]:
                            same_species_count += 1

        if total_neighbors == 0:
            return 0.0
        diversity_ratio = 1 - (same_species_count / total_neighbors)
        return diversity_ratio

    def occupied_cells(self):
        return [
            (r, c, self.planting[r][c])
            for r, c in self.all_cells()
            if self.planting[r][c] is not None
        ]

    def total_planted(self):
        return len(self.occupied_cells())
