from pathlib import Path
from pydantic import BaseModel

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
SPECIES_DB_PATH = DATA_DIR / "species_db.json"
SITE_DATA_PATH = DATA_DIR / "site_data.json"
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

class Settings(BaseModel):
    app_name: str = "Algorithmic Reforestation Planner API"
    app_version: str = "1.0.0"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    default_cell_size_m: float = 5.0
    default_plot_width_m: float = 100.0
    default_plot_height_m: float = 100.0
    default_years_horizon: int = 20

settings = Settings()
