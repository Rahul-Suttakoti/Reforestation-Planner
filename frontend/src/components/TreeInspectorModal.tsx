import React from 'react';
import type { PlantedTree } from '../types';
import { X, Trees, Leaf, Sparkles, MapPin } from 'lucide-react';

interface TreeInspectorModalProps {
  tree: PlantedTree | null;
  onClose: () => void;
}

export const TreeInspectorModal: React.FC<TreeInspectorModalProps> = ({ tree, onClose }) => {
  if (!tree) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tree.color }} />
            <div>
              <h3 className="font-bold text-white text-base leading-tight">{tree.common_name}</h3>
              <p className="text-xs text-slate-400 italic">{tree.species_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Botanical & Spatial Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
              <Trees className="w-3.5 h-3.5 text-teal-400" /> Canopy Radius
            </span>
            <span className="text-base font-bold text-white font-mono">{tree.canopy_radius_m} m</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Annual Carbon
            </span>
            <span className="text-base font-bold text-emerald-400 font-mono">{tree.carbon_kg_per_year} kg/yr</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Plot Suitability
            </span>
            <span className="text-base font-bold text-amber-400 font-mono">
              {(tree.suitability_score * 100).toFixed(0)}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Plot Position
            </span>
            <span className="text-sm font-bold text-white font-mono">
              X: {tree.x}m, Y: {tree.y}m
            </span>
          </div>
        </div>

        {tree.lat !== undefined && tree.lon !== undefined && (
          <div className="text-[11px] text-slate-400 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">
            Satellite Coordinate: {tree.lat.toFixed(6)}, {tree.lon.toFixed(6)}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Close Inspector
        </button>
      </div>
    </div>
  );
};
