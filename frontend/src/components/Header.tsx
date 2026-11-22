import React, { useState } from 'react';
import { Trees, Activity, RefreshCw, Globe, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import type { OptimizationResult, OptimizeRequest, Species, PlantedTree } from '../types';
import { exportReforestationPlanPdf } from '../services/pdfExporter';

interface HeaderProps {
  isStreaming: boolean;
  iteration: number;
  totalIterations: number;
  hasResult: boolean;
  result: OptimizationResult | null;
  activeTab: 'satellite' | 'annealing' | 'comparison';
  setActiveTab: (tab: 'satellite' | 'annealing' | 'comparison') => void;
  onReset: () => void;
  request: OptimizeRequest;
  speciesList: Species[];
  locationName: string;
  trees?: PlantedTree[];
}

export const Header: React.FC<HeaderProps> = ({
  isStreaming,
  iteration,
  totalIterations,
  hasResult,
  result,
  activeTab,
  setActiveTab,
  onReset,
  request,
  speciesList,
  locationName,
  trees = [],
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const activeTrees = trees.length > 0 ? trees : (result?.trees || []);
      await exportReforestationPlanPdf({
        result,
        request,
        speciesList,
        locationName,
        trees: activeTrees,
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export PDF report:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-800 text-emerald-100 shadow-md shadow-emerald-950/60 border border-emerald-500/30">
          <Trees className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-white">Algorithmic Reforestation Planner</h1>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Simulated annealing with mature canopy spacing physics & satellite telemetry
          </p>
        </div>
      </div>

      {/* Center Tab Navigation (Inorder: 1. 3D Globe & Satellite -> 2. Live Annealing -> 3. Naive vs Optimal) */}
      <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('satellite')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'satellite'
              ? 'bg-emerald-600 text-white font-semibold shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="3D Globe and High-Resolution Satellite Map"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>3D Globe & Satellite</span>
        </button>
        <button
          onClick={() => setActiveTab('annealing')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'annealing'
              ? 'bg-emerald-600 text-white font-semibold shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Annealing</span>
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'comparison'
              ? 'bg-emerald-600 text-white font-semibold shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trees className="w-3.5 h-3.5" />
          <span>Naive vs Optimal</span>
        </button>
      </div>

      {/* Right Action Bar & Status */}
      <div className="flex items-center gap-3">
        {/* Status Pill */}
        {isStreaming ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>
              Annealing: {iteration} / {totalIterations}
            </span>
          </div>
        ) : hasResult ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Optimal Layout Ready</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>System Standby</span>
          </div>
        )}

        {(hasResult || trees.length > 0) && (
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm active:scale-95 ${
              exportSuccess
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border-emerald-500/40 hover:border-emerald-500/60 shadow-emerald-500/10'
            }`}
            title="Export high-resolution reforestation plan, species inventory, and metrics report as PDF"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Generating PDF...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>PDF Downloaded!</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export PDF Plan</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onReset}
          className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700/60"
          title="Reset to default settings"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
