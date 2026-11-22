import React from 'react';
import type { OptimizationResult, BaselineResult } from '../types';
import { Trees, Leaf, TrendingUp, Sparkles, BarChart3, CheckCircle2, FileText } from 'lucide-react';

interface MetricsDashboardProps {
  result: OptimizationResult | null;
  baseline: BaselineResult | null;
  yearsHorizon?: number;
  onExportPdf?: () => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  result,
  baseline,
  onExportPdf,
}) => {
  const effectiveBaseline = result?.baseline || baseline;
  const metrics = result?.metrics;
  const comparison = result?.comparison;

  return (
    <div className="space-y-4">
      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Naive vs Optimal Carbon */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Carbon (Naive vs Optimal)</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics ? `${metrics.annual_carbon_kg.toLocaleString()} kg/yr` : effectiveBaseline ? `${effectiveBaseline.annual_carbon_kg.toLocaleString()} kg/yr` : '—'}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {comparison ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <TrendingUp className="w-3.5 h-3.5" />
                +{comparison.carbon_increase_pct}% vs. Naive ({effectiveBaseline?.annual_carbon_kg.toLocaleString()} kg/yr)
              </span>
            ) : (
              <span className="text-slate-500">Run annealing to compare</span>
            )}
          </div>
        </div>

        {/* Card 2: Trees Planted */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Trees Planted</span>
            <Trees className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics ? `${metrics.trees_planted} trees` : effectiveBaseline ? `${effectiveBaseline.trees_planted} trees` : '0'}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {metrics && effectiveBaseline ? (
              <span className="text-emerald-400">
                Optimal: {metrics.trees_planted} vs. Naive: {effectiveBaseline.trees_planted}
              </span>
            ) : effectiveBaseline ? (
              <span>Naive baseline: {effectiveBaseline.trees_planted} trees</span>
            ) : (
              <span>Awaiting simulation</span>
            )}
          </div>
        </div>

        {/* Card 3: Species Diversity & Shannon Index */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Species Diversity</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics ? `${metrics.species_diversity_count} Species` : '1 Species'}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {metrics ? (
              <span className="font-mono text-amber-400">Optimal Shannon: {metrics.shannon_diversity_index} (vs Naive 0.0)</span>
            ) : (
              <span>Naive monoculture: 0.0</span>
            )}
          </div>
        </div>

        {/* Card 4: Canopy Coverage */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Canopy Coverage</span>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics ? `${metrics.canopy_coverage_pct}%` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {metrics ? (
              <span>{metrics.canopy_coverage_m2.toLocaleString()} m² shaded</span>
            ) : (
              <span>Spacing constrained</span>
            )}
          </div>
        </div>
      </div>

      {/* Head-to-Head Comparative Card: Naive vs Optimal */}
      {result && effectiveBaseline && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Performance Evaluation: Naive vs. Optimal
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                +{result.comparison.carbon_increase_pct}% Optimal Gain over Naive
              </span>
              {onExportPdf && (
                <button
                  onClick={onExportPdf}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-semibold transition-all shadow-sm active:scale-95"
                  title="Export this plan and performance report as PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export PDF Plan</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3">Trees Planted</th>
                  <th className="py-2.5 px-3">Diversity & Shannon</th>
                  <th className="py-2.5 px-3">Annual Carbon</th>
                  <th className="py-2.5 px-3">Canopy Coverage</th>
                  <th className="py-2.5 px-3 text-right">Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                <tr className="text-slate-300">
                  <td className="py-3 px-3">
                    <span className="font-semibold text-white">Naive Monoculture Baseline</span>
                    <span className="block text-[11px] text-slate-400 italic">
                      Uniform planting of {effectiveBaseline.chosen_species_common}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">{effectiveBaseline.trees_planted}</td>
                  <td className="py-3 px-3 font-mono">1 species (H'=0.0)</td>
                  <td className="py-3 px-3 font-mono">{effectiveBaseline.annual_carbon_kg.toLocaleString()} kg/yr</td>
                  <td className="py-3 px-3 font-mono text-slate-400">Regular grid</td>
                  <td className="py-3 px-3 text-right text-slate-500 font-mono">Naive Baseline (0%)</td>
                </tr>

                <tr className="text-emerald-400 bg-emerald-500/5">
                  <td className="py-3 px-3">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Optimal (Simulated Annealing)
                    </span>
                    <span className="block text-[11px] text-emerald-400/80">
                      Physics circle-packing with biodiversity bonus
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">{metrics?.trees_planted}</td>
                  <td className="py-3 px-3 font-mono font-bold">
                    {metrics?.species_diversity_count} species (H'={metrics?.shannon_diversity_index})
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">{metrics?.annual_carbon_kg.toLocaleString()} kg/yr</td>
                  <td className="py-3 px-3 font-mono font-bold text-white">
                    {metrics?.canopy_coverage_pct}% ({metrics?.canopy_coverage_m2.toLocaleString()} m²)
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                    +{result.comparison.carbon_increase_pct}% Optimal
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Species Distribution Breakdown */}
      {metrics && Object.keys(metrics.species_distribution).length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
            Optimal Canopy Species Distribution
          </h3>

          <div className="space-y-3">
            {Object.entries(metrics.species_distribution).map(([name, dist]) => (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dist.color }} />
                    <span className="font-semibold text-white">{dist.common_name}</span>
                    <span className="text-[11px] text-slate-400 italic font-normal">({name})</span>
                  </div>
                  <div className="font-mono text-slate-300">
                    <strong>{dist.count} trees</strong> ({dist.percentage}%) &bull;{' '}
                    <span className="text-emerald-400 font-semibold">{dist.annual_carbon_kg.toLocaleString()} kg/yr CO₂</span>
                  </div>
                </div>
                {/* Visual bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${dist.percentage}%`,
                      backgroundColor: dist.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
