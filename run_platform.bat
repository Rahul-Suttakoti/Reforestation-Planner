@echo off
echo ========================================================
echo  Launching Algorithmic Reforestation Planner Web Platform
echo ========================================================
echo.
echo Starting FastAPI Backend + React Web UI on http://localhost:8000 ...
.\.venv\Scripts\python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
pause
