import React, { useRef, useEffect } from 'react';
import { Activity, Flame } from 'lucide-react';

interface ConvergenceChartProps {
  history: { iteration: number; score: number; temperature: number; trees: number; carbon: number }[];
  currentIteration: number;
  totalIterations: number;
  temperature: number;
  currentScore: number;
}

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({
  history,
  currentIteration,
  totalIterations,
  temperature,
  currentScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (history.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Convergence chart streams live as simulated annealing runs...', w / 2, h / 2);
      return;
    }

    const padLeft = 45;
    const padRight = 45;
    const padTop = 15;
    const padBottom = 25;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Determine min/max for score and temperature
    const scores = history.map((d) => d.score);
    const temps = history.map((d) => d.temperature);
    const minScore = Math.min(...scores, 0);
    const maxScore = Math.max(...scores, 10);
    const maxTemp = Math.max(...temps, 1);

    // Draw horizontal grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
    }
    ctx.stroke();

    // Map functions
    const getX = (iter: number) => padLeft + (iter / Math.max(totalIterations, 1)) * plotW;
    const getYScore = (score: number) =>
      padTop + plotH - ((score - minScore) / Math.max(maxScore - minScore, 1e-4)) * plotH;
    const getYTemp = (temp: number) => padTop + plotH - (temp / Math.max(maxTemp, 1e-4)) * plotH;

    // Draw Temperature curve (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((d, i) => {
      const x = getX(d.iteration);
      const y = getYTemp(d.temperature);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Score curve (Emerald)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    history.forEach((d, i) => {
      const x = getX(d.iteration);
      const y = getYScore(d.score);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Y Axis Labels
    ctx.font = '10px monospace';
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'right';
    ctx.fillText(`${maxScore.toFixed(0)}`, padLeft - 6, padTop + 10);
    ctx.fillText(`${minScore.toFixed(0)}`, padLeft - 6, padTop + plotH);

    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'left';
    ctx.fillText(`${maxTemp.toFixed(1)}°`, padLeft + plotW + 6, padTop + 10);
    ctx.fillText('0°', padLeft + plotW + 6, padTop + plotH);

    // X Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('0', padLeft, h - 8);
    ctx.fillText(`${(totalIterations / 2).toLocaleString()}`, padLeft + plotW / 2, h - 8);
    ctx.fillText(`${totalIterations.toLocaleString()}`, padLeft + plotW, h - 8);
  }, [history, currentIteration, totalIterations]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Annealing Convergence Real-Time</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Score: {currentScore.toFixed(1)}
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <Flame className="w-3 h-3 text-amber-400" />
            Temp: {temperature.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="w-full h-36">
        <canvas ref={canvasRef} width={600} height={144} className="w-full h-full block" />
      </div>
    </div>
  );
};
