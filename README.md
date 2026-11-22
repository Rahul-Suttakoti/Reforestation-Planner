# 🌲 Algorithmic Reforestation Planner

> **AI-powered ecological land planning:** Optimizes where to plant which tree species on any plot of land worldwide to maximize carbon capture and biodiversity, using simulated annealing constrained by real mature canopy-spacing physics — instead of naive uniform monoculture planting.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/3D_Globe-Three.js-black?style=flat-square&logo=three.js)](https://threejs.org)
[![Leaflet](https://img.shields.io/badge/GIS-Leaflet-199900?style=flat-square&logo=leaflet)](https://leafletjs.com)
[![Docker](https://img.shields.io/badge/Deploy-Docker_Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 📊 Performance Benchmark (Sample 100m × 100m Plot)

| Strategy | Trees Planted | Species Diversity | Annual Carbon | 20-Year Carbon | Canopy Coverage | Advantage |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Naive Monoculture Baseline** (e.g., Uniform Grid) | 16–49 | 1 species ($H'=0.0$) | ~560–882 kg/yr | ~11,200–17,640 kg | 45%–52% | Baseline (0%) |
| **Optimal Layout** (Simulated Annealing) | **156+** | **5+ species** ($H'=1.073+$) | **2,811.2 kg/yr** | **56,224 kg** | **83% (8,300 m²)** | **+402% Gain** 🚀 |

---

## 🌟 Key Features

### 1. 🌍 Interactive 3D World Globe & Cinematic Zoom
- Photorealistic **Three.js 3D spherical Earth** with stars, smooth momentum dragging, dynamic hover coordinates, and camera auto-rotation.
- Selecting any location triggers a **cinematic camera dive transition** smoothly converting from the 3D globe directly into a 2D high-resolution satellite plot.

### 2. 🔍 Worldwide Multi-Tier Location Search Engine
- High-speed, rate-limit-resistant geocoding engine indexing **11M+ settlements, towns, and villages** worldwide (e.g. *Ingalagondi*, Karnataka, rural hamlets, and global metropolitan centers).
- Powered by a multi-tier fallback hierarchy: **Open-Meteo Geocoding API + Nominatim (OpenStreetMap) + Photon API**.

### 3. 🛰️ High-Resolution 2D Satellite Plotting (Clean & Grid-Free)
- Multi-provider aerial imagery: **Google Satellite HD Hybrid**, **Esri World Imagery**, and **OpenStreetMap**.
- **Organic Canopy Circle-Packing**: Optimal trees are plotted with subtle natural physics dispersion (`±1.1m` micro-offsets) rather than an artificial chessboard grid, mimicking natural forest growth.
- Completely clean satellite view with zero intrusive box boundaries or tinted grid washes.

### 4. ⚡ Live Simulated Annealing Visualizer (WebSocket Streaming)
- Fluid real-time streaming at ~60fps via FastAPI WebSockets.
- Visualizes tree additions, removals, and species swaps as the temperature cools according to the annealing schedule ($T_{k+1} = T_k \times \alpha$).
- Real-time convergence curves tracking score, temperature, acceptance rate, and carbon yield.

### 5. ⚖️ Head-to-Head Naive vs. Optimal Comparison
- **Configurable Naive Baseline**:
  - **Auto-Selection**: Dynamically calculates area-normalized carbon density ($\text{kg/m}^2$) weighted by climate suitability for local soil pH, rainfall, and sunlight.
  - **Manual Species Selector**: Dropdown to benchmark against 100% monocultures of any species (*Teak*, *Neem*, *Sal*, *Bamboo*, *Shisham*, *Banyan*, etc.).
- Side-by-side interactive comparison canvases with Shannon-Wiener biodiversity entropy ($H'$) and species distribution tables.

### 6. 📄 Professional PDF Reforestation Plan Export
- One-click export producing a multi-page **Reforestation Plan PDF Report** formatted for forestry teams, containing:
  - Geographic coordinates & bounding box dimensions.
  - Site telemetry (soil pH, precipitation, sunlight hours, elevation).
  - Target species breakdown with mature canopy radii and carbon sequestration rates.
  - Performance scorecard and carbon gain metrics.

---

## 📐 How the Physics & Optimization Model Works

Traditional naive reforestation often packs a single high-carbon species into uniform grid cells, ignoring the fact that mature tree canopies overlap and compete for light and soil nutrients.

This platform formulates reforestation as a **multi-objective spatial circle-packing problem**:

$$\text{Score} = w_c \cdot C_{\text{carbon}} + w_b \cdot B_{\text{biodiversity}} - w_s \cdot P_{\text{spacing}}$$

1. **Carbon Sequestration ($C_{\text{carbon}}$)**: 
   $$\sum_{i} \text{CarbonRate}_i \times \text{SuitabilityScore}_i$$
   Evaluates each candidate species' biological compatibility with the plot's soil pH, rainfall, and sunlight.
2. **Biodiversity Bonus ($B_{\text{biodiversity}}$)**:
   Rewards heterogeneous neighborhood distributions within a 4-cell radius to prevent monoculture clustering.
3. **Canopy Spacing Penalty ($P_{\text{spacing}}$)**:
   For every pair of trees $(i, j)$ with mature radii $r_i, r_j$ separated by distance $d_{ij}$:
   $$P_{\text{overlap}} = \begin{cases} \left(\frac{r_i + r_j - d_{ij}}{r_i + r_j}\right)^2 & \text{if } d_{ij} < r_i + r_j \\ 0 & \text{otherwise} \end{cases}$$
4. **Metropolis Acceptance Criterion**:
   Unfavorable moves ($\Delta E < 0$) are accepted with probability $P = \exp(\Delta E / T)$, enabling the optimizer to escape local optima and discover optimal polyculture canopy arrangements.

---

## 🏗️ Architecture & Project Structure

The project is structured as a unified full-stack application where the **FastAPI backend mounts and serves the production React build** as static files on port 8000:

```text
Reforestation-Planner/
├── backend/
│   └── app/
│       ├── main.py                 # FastAPI application & static build mount
│       ├── config.py               # Application settings & paths
│       ├── schemas.py              # Pydantic data models & requests
│       ├── routers/
│       │   ├── optimizer.py        # Simulated annealing sync & WebSocket stream
│       │   ├── sites.py            # Autocomplete geocoding & climate telemetry
│       │   ├── species.py          # Species library & suitability API
│       │   └── analytics.py        # Projections & comparative metrics
│       └── services/
│           ├── optimizer_service.py # Core simulated annealing engine & physics
│           ├── baseline_service.py  # Spacing-respecting monoculture baseline
│           ├── autocomplete_service.py # Multi-tier global geocoder
│           ├── data_service.py      # Soil/climate fetchers & suitability scoring
│           └── geo_service.py       # Lat/Lon to metric coordinate projections
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WorldGlobe.tsx       # 3D Three.js Earth sphere
│   │   │   ├── SatelliteMap.tsx     # 2D Leaflet GIS map with tree canopies
│   │   │   ├── AnnealingCanvas.tsx  # High-performance 2D canvas layout
│   │   │   ├── ConvergenceChart.tsx # Live SVG convergence curve
│   │   │   ├── ControlPanel.tsx     # Tuning parameters & species selector
│   │   │   ├── MetricsDashboard.tsx # Comparative analytics & species table
│   │   │   └── Header.tsx           # 3-tab navigation bar & actions
│   │   ├── hooks/
│   │   │   └── useAnnealingStream.ts # WebSocket streaming hook
│   │   └── services/
│   │       ├── api.ts              # REST client with offline fallback
│   │       └── pdfExporter.ts      # Multi-page PDF plan generator
│   └── package.json
├── data/
│   └── species_db.json             # Botanical database (18 curated species)
├── Dockerfile                      # Multi-stage production container
├── render.yaml                     # Render.com turnkey deployment blueprint
├── Procfile                        # Cloud process definition (Railway, Heroku)
├── requirements.txt                # Python backend dependencies
└── run_platform.bat                # Windows 1-click startup script
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+ (for building the frontend)

### 1. Clone the Repository
```bash
git clone https://github.com/Rahul-Suttakoti/Reforestation-Planner.git
cd Reforestation-Planner
```

### 2. Setup Python Virtual Environment
```bash
python -m venv .venv

# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Build & Run the Full-Stack App
```bash
# Build the React frontend
npm --prefix frontend install
npm --prefix frontend run build

# Start the unified FastAPI server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Open your browser and navigate to **`http://localhost:8000`**.

---

## ☁️ Deployment

### One-Click Deploy on Render (Free Tier)
1. Fork or push this repository to your GitHub account.
2. Sign in to **[Render.com](https://render.com)**.
3. Click **New +** &rarr; **Web Service** &rarr; select **`Reforestation-Planner`**.
4. Choose **Environment: Docker** (Render will automatically detect the included `Dockerfile` and build both frontend and backend).
5. Select **Free** instance type and click **Deploy Web Service**.
6. Render will assign you a live public HTTPS URL (e.g., `https://reforestation-planner.onrender.com`).

### Deploy via Docker
```bash
docker build -t reforestation-planner .
docker run -d -p 8000:8000 reforestation-planner
```

---

## 🌿 Botanical Species Database

The included database (`data/species_db.json`) features 18 curated species with verified traits from botanical literature:

- **Teak** (*Tectona grandis*)
- **Neem** (*Azadirachta indica*)
- **Sal** (*Shorea robusta*)
- **Indian Rosewood / Sheesham** (*Dalbergia sissoo*)
- **Whistling Pine** (*Casuarina equisetifolia*)
- **Banyan** (*Ficus benghalensis*)
- **Sacred Fig / Peepal** (*Ficus religiosa*)
- **Mango** (*Mangifera indica*)
- **Indian Mahogany** (*Toona ciliata*)
- **Bamboo** (*Bambusa vulgaris*)
- ... and more.

Each species defines mature canopy radius, optimal soil pH range, annual rainfall tolerance (mm), minimum daily sunlight hours, and average annual carbon sequestration rate (kg CO₂/year).

---

## 📜 License

This project is licensed under the **MIT License** &mdash; see the [LICENSE](LICENSE) file for details.
