import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { PlantedTree, Species } from '../types';
import { ZoomIn, ZoomOut, Maximize2, ShieldAlert, Grid } from 'lucide-react';

interface AnnealingCanvasProps {
  plotWidthM: number;
  plotHeightM: number;
  cellSizeM: number;
  trees: PlantedTree[];
  hasSelectedLand?: boolean;
  speciesList?: Species[];
  recentMoveRow?: number;
  recentMoveCol?: number;
  isStreaming?: boolean;
  onSelectTree?: (tree: PlantedTree) => void;
}

export const AnnealingCanvas: React.FC<AnnealingCanvasProps> = ({
  plotWidthM,
  plotHeightM,
  cellSizeM,
  trees,
  hasSelectedLand: _hasSelectedLand = true,
  recentMoveRow,
  recentMoveCol,
  isStreaming,
  onSelectTree,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [hoveredTree, setHoveredTree] = useState<PlantedTree | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showCollisions, setShowCollisions] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Compute collisions (canopy overlaps)
  const collisions = useMemo(() => {
    if (!showCollisions || trees.length < 2) return [];
    const list: { t1: PlantedTree; t2: PlantedTree; overlap: number }[] = [];
    for (let i = 0; i < trees.length; i++) {
      for (let j = i + 1; j < trees.length; j++) {
        const t1 = trees[i];
        const t2 = trees[j];
        const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
        const combined = t1.canopy_radius_m + t2.canopy_radius_m;
        if (dist < combined) {
          list.push({ t1, t2, overlap: combined - dist });
        }
      }
    }
    return list;
  }, [trees, showCollisions]);

  // Redraw canvas whenever trees, zoom, or dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const width = dimensions.width || canvas.clientWidth || 600;
    const height = dimensions.height || canvas.clientHeight || 450;
    if (width === 0 || height === 0) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background - rich dark peat soil
    ctx.fillStyle = '#08100b';
    ctx.fillRect(0, 0, width, height);

    // Calculate scaling to fit plot inside canvas with padding
    const padding = 45;
    const availW = width - padding * 2;
    const availH = height - padding * 2;
    const scaleX = (availW / plotWidthM) * zoom;
    const scaleY = (availH / plotHeightM) * zoom;
    const scale = Math.min(scaleX, scaleY);

    const originX = (width - plotWidthM * scale) / 2;
    const originY = (height - plotHeightM * scale) / 2;

    // Draw Plot Boundary - dark loamy planting bed
    ctx.fillStyle = '#0d1b13';
    ctx.fillRect(originX, originY, plotWidthM * scale, plotHeightM * scale);

    const cols = Math.floor(plotWidthM / cellSizeM);
    const rows = Math.floor(plotHeightM / cellSizeM);

    // Draw Grid Lines (cell size) only if explicitly enabled
    if (showGrid) {
      ctx.strokeStyle = '#173022';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const gx = originX + c * cellSizeM * scale;
        ctx.moveTo(gx, originY);
        ctx.lineTo(gx, originY + plotHeightM * scale);
      }
      for (let r = 0; r <= rows; r++) {
        const gy = originY + r * cellSizeM * scale;
        ctx.moveTo(originX, gy);
        ctx.lineTo(originX + plotWidthM * scale, gy);
      }
      ctx.stroke();
    }

    // Plot Border
    ctx.strokeStyle = '#284d38';
    ctx.lineWidth = 2;
    ctx.strokeRect(originX, originY, plotWidthM * scale, plotHeightM * scale);

    // Metric Dimension Labels
    ctx.fillStyle = '#7da08b';
    ctx.font = '10px monospace';
    ctx.fillText('0m', originX - 10, originY + plotHeightM * scale + 15);
    ctx.fillText(`${plotWidthM}m`, originX + plotWidthM * scale - 15, originY + plotHeightM * scale + 15);
    ctx.fillText(`${plotHeightM}m`, originX - 30, originY + 10);

    // Highlight Recently Affected Cell during live streaming
    if (recentMoveRow !== undefined && recentMoveCol !== undefined && isStreaming) {
      const cellX = originX + recentMoveCol * cellSizeM * scale;
      const cellY = originY + (rows - 1 - recentMoveRow) * cellSizeM * scale;
      ctx.fillStyle = 'rgba(234, 179, 8, 0.35)';
      ctx.fillRect(cellX, cellY, cellSizeM * scale, cellSizeM * scale);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cellX, cellY, cellSizeM * scale, cellSizeM * scale);
    }

    // Draw Canopy Overlap / Collision Indicators
    if (showCollisions && collisions.length > 0) {
      collisions.forEach(({ t1, t2 }) => {
        const cx1 = originX + t1.x * scale;
        const cy1 = originY + (plotHeightM - t1.y) * scale;
        const cx2 = originX + t2.x * scale;
        const cy2 = originY + (plotHeightM - t2.y) * scale;

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Draw Planted Tree Canopy Circles
    trees.forEach((tree) => {
      const cx = originX + tree.x * scale;
      const cy = originY + (plotHeightM - tree.y) * scale;
      const radiusPx = tree.canopy_radius_m * scale;

      // Canopy circle gradient
      const grad = ctx.createRadialGradient(cx, cy, radiusPx * 0.1, cx, cy, radiusPx);
      grad.addColorStop(0, tree.color || '#10b981');
      grad.addColorStop(1, `${tree.color}88` || '#10b98188');

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(radiusPx, 3), 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Canopy Edge Outline
      ctx.strokeStyle = hoveredTree?.id === tree.id ? '#ffffff' : 'rgba(0,0,0,0.4)';
      ctx.lineWidth = hoveredTree?.id === tree.id ? 2.5 : 1;
      ctx.stroke();

      // Tree Trunk Point
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(scale * 0.4, 2), 0, Math.PI * 2);
      ctx.fillStyle = '#090d16';
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    ctx.restore();
  }, [plotWidthM, plotHeightM, cellSizeM, trees, zoom, recentMoveRow, recentMoveCol, isStreaming, hoveredTree, showCollisions, showGrid, collisions, dimensions]);

  // Handle canvas sizing with ResizeObserver to adapt to container/footer changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        setDimensions({ width: w, height: h });
      }
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Handle Hover detection on trees
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    const padding = 45;
    const availW = canvas.width - padding * 2;
    const availH = canvas.height - padding * 2;
    const scale = Math.min((availW / plotWidthM) * zoom, (availH / plotHeightM) * zoom);
    const originX = (canvas.width - plotWidthM * scale) / 2;
    const originY = (canvas.height - plotHeightM * scale) / 2;

    let found: PlantedTree | null = null;
    for (const tree of trees) {
      const cx = originX + tree.x * scale;
      const cy = originY + (plotHeightM - tree.y) * scale;
      const dist = Math.hypot(mx - cx, my - cy);
      if (dist <= tree.canopy_radius_m * scale) {
        found = tree;
        break;
      }
    }
    setHoveredTree(found);
  };

  const handleClick = () => {
    if (hoveredTree && onSelectTree) {
      onSelectTree(hoveredTree);
    }
  };

  // Group trees count by species
  const speciesCounts = useMemo(() => {
    const counts: Record<string, { count: number; color: string; common: string }> = {};
    trees.forEach((t) => {
      if (!counts[t.species_name]) {
        counts[t.species_name] = { count: 0, color: t.color, common: t.common_name };
      }
      counts[t.species_name].count += 1;
    });
    return counts;
  }, [trees]);

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Canvas Bar */}
      <div className="px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Canopy Layout & Spacing Physics</span>
          <span className="text-xs text-slate-400 font-mono">
            {plotWidthM}m &times; {plotHeightM}m (Cell: {cellSizeM}m)
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Live Annealing Updates
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Grid lines toggle */}
          <button
            onClick={() => setShowGrid((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              showGrid
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle cell grid lines"
          >
            <Grid className="w-3.5 h-3.5" />
            Grid
          </button>

          {/* Overlap / collision toggle */}
          <button
            onClick={() => setShowCollisions((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              showCollisions && collisions.length > 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Highlight spacing physics overlaps"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Overlaps ({collisions.length})
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-300">{(zoom * 100).toFixed(0)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded border-l border-slate-700 ml-0.5"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="relative flex-1 min-h-0 w-full cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredTree(null)}
          onClick={handleClick}
          className="w-full h-full block"
        />

        {/* Hover Tooltip */}
        {hoveredTree && mousePos && (
          <div
            className="fixed pointer-events-none z-50 bg-slate-950/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{ left: mousePos.x, top: mousePos.y - 10 }}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: hoveredTree.color }} />
              <span className="font-bold text-white text-sm">{hoveredTree.common_name}</span>
            </div>
            <div className="text-slate-400 italic text-[11px]">{hoveredTree.species_name}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5 border-t border-slate-800 text-slate-300">
              <div>
                Canopy Radius: <strong className="text-white">{hoveredTree.canopy_radius_m}m</strong>
              </div>
              <div>
                Position: <strong className="text-white">({hoveredTree.x}m, {hoveredTree.y}m)</strong>
              </div>
              <div>
                Sequestration: <strong className="text-emerald-400">{hoveredTree.carbon_kg_per_year} kg/yr</strong>
              </div>
              <div>
                Suitability: <strong className="text-emerald-400">{(hoveredTree.suitability_score * 100).toFixed(0)}%</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Species Legend Footer - completely separated below the canvas, never overlapping */}
      <div className="px-4 py-2.5 border-t border-slate-800/90 bg-slate-950/90 shrink-0 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Species Planted:</span>
        {Object.entries(speciesCounts).map(([name, data]) => (
          <div key={name} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="text-slate-200">{data.common}:</span>
            <strong className="text-white font-mono">{data.count}</strong>
          </div>
        ))}
        {trees.length === 0 && (
          <span className="text-slate-500 italic">
            No trees planted yet. Run annealing or calculate baseline to begin.
          </span>
        )}
      </div>
    </div>
  );
};
