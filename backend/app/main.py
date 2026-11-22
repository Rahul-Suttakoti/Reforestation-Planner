import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings, FRONTEND_DIST
from backend.app.routers import species, sites, optimizer, analytics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Interactive Web Platform API for Algorithmic Reforestation Planning using Simulated Annealing.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for Vite frontend and local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(species.router)
app.include_router(sites.router)
app.include_router(optimizer.router)
app.include_router(analytics.router)

@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version
    }

# Mount frontend production build if available
if FRONTEND_DIST.exists():
    logger.info(f"Mounting production frontend build from {FRONTEND_DIST}")
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
else:
    @app.get("/", tags=["Root"])
    def root():
        """Root redirect / welcome information."""
        return {
            "message": "Algorithmic Reforestation Planner API is running.",
            "docs": "/docs",
            "endpoints": [
                "/api/health",
                "/api/species",
                "/api/sites/presets",
                "/api/sites/dimensions",
                "/api/sites/fetch-env",
                "/api/optimize/run",
                "/api/optimize/baseline",
                "/api/optimize/stream (WebSocket)",
                "/api/analytics/projections",
                "/api/analytics/info"
            ]
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
