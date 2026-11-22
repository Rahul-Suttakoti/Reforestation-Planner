import React, { useState } from 'react';
import type {
  OptimizeRequest,
  EnvironmentConditions,
  OptimizationWeights,
  Species,
} from '../types';
import { Sliders, Sun, Droplets, FlaskConical, Trees } from 'lucide-react';

interface ControlPanelProps {
  request: OptimizeRequest;
  onChangeRequest: (updated: Partial<OptimizeRequest>) => void;
  speciesList: Species[];
  locationName: string;
  hasSelectedLand?: boolean;
  onClearLand?: () => void;
  onSearchLocation: (query: string) => void;
  isStreaming: boolean;
  onStartLiveStream: () => void;
  onStopLiveStream: () => void;
  onRunBaseline: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  request,
  onChangeRequest,
  speciesList,
  locationName: _locationName,
  hasSelectedLand = true,
  onClearLand: _onClearLand,
  onSearchLocation: _onSearchLocation,
  isStreaming,
  onStartLiveStream: _onStartLiveStream,
  onStopLiveStream: _onStopLiveStream,
  onRunBaseline,
}) => {
  const [activeTab, setActiveTab] = useState<'plot' | 'annealing' | 'weights' | 'env' | 'species'>('plot');
  const [speciesSearch, setSpeciesSearch] = useState('');

  const env = request.environment;
  const weights = request.optimization_weights || { carbon: 1.0, biodiversity: 0.15, spacing: 1.0 };
  const selectedSpecies = request.selected_species || speciesList.map((s) => s.name);

  const filteredSpecies = speciesList.filter(
    (s) =>
      s.name.toLowerCase().includes(speciesSearch.toLowerCase()) ||
      s.common_name.toLowerCase().includes(speciesSearch.toLowerCase())
  );

  const toggleSpecies = (name: string) => {
    let next: string[];
    if (selectedSpecies.includes(name)) {
      next = selectedSpecies.filter((s) => s !== name);
      if (next.length === 0) next = [name]; // keep at least 1
    } else {
      next = [...selectedSpecies, name];
    }
    onChangeRequest({ selected_species: next });
  };

  const handleEnvChange = (field: keyof EnvironmentConditions, value: number) => {
    onChangeRequest({
      environment: {
        ...env,
        [field]: value,
      },
    });
  };

  const handleWeightChange = (field: keyof OptimizationWeights, value: number) => {
    onChangeRequest({
      optimization_weights: {
        ...weights,
        [field]: value,
      },
    });
  };

  return (
    <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-full">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Planner Configuration</h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {request.plot_width_m}m &times; {request.plot_height_m}m
          </span>
        </div>

        {/* Sub-tabs */}
        <div className="grid grid-cols-5 gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('plot')}
            className={`py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'plot' ? 'bg-emerald-600 text-white font-semibold shadow-sm border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Plot
          </button>
          <button
            onClick={() => setActiveTab('annealing')}
            className={`py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'annealing' ? 'bg-emerald-600 text-white font-semibold shadow-sm border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Anneal
          </button>
          <button
            onClick={() => setActiveTab('weights')}
            className={`py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'weights' ? 'bg-emerald-600 text-white font-semibold shadow-sm border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Weights
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'env' ? 'bg-emerald-600 text-white font-semibold shadow-sm border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Climate
          </button>
          <button
            onClick={() => setActiveTab('species')}
            className={`py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'species' ? 'bg-emerald-600 text-white font-semibold shadow-sm border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Species
          </button>
        </div>
      </div>

      {/* Main Tab Content Scroll Area */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        {/* Tab 1: Plot Geometry & Dimensions */}
        {activeTab === 'plot' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Plot Width (meters)</label>
                <input
                  type="number"
                  min={20}
                  max={300}
                  step={5}
                  value={request.plot_width_m}
                  onChange={(e) => onChangeRequest({ plot_width_m: parseFloat(e.target.value) || 50 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Plot Height (meters)</label>
                <input
                  type="number"
                  min={20}
                  max={300}
                  step={5}
                  value={request.plot_height_m}
                  onChange={(e) => onChangeRequest({ plot_height_m: parseFloat(e.target.value) || 50 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-medium mb-1">
                <span>Cell Resolution: {request.cell_size_m}m</span>
                <span className="font-mono text-slate-300">
                  {Math.floor(request.plot_width_m / request.cell_size_m)} &times;{' '}
                  {Math.floor(request.plot_height_m / request.cell_size_m)} cells (
                  {Math.floor(request.plot_width_m / request.cell_size_m) *
                    Math.floor(request.plot_height_m / request.cell_size_m)}
                  )
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                step={1}
                value={request.cell_size_m}
                onChange={(e) => onChangeRequest({ cell_size_m: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Plot Area Summary */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Total Plot Area:</span>
                <span className="font-semibold text-white font-mono">
                  {(request.plot_width_m * request.plot_height_m).toLocaleString()} m² (
                  {((request.plot_width_m * request.plot_height_m) / 10000).toFixed(2)} ha)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cell Resolution:</span>
                <span className="font-semibold text-white font-mono">
                  {request.cell_size_m}m &times; {request.cell_size_m}m per cell
                </span>
              </div>
            </div>

            {/* Naive Baseline Species Selector */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Trees className="w-3.5 h-3.5 text-teal-400" />
                  Naive Baseline Species
                </span>
                <span className="text-[10px] text-teal-400 font-mono">Monoculture</span>
              </div>
              <select
                value={request.naive_species || 'auto'}
                onChange={(e) =>
                  onChangeRequest({
                    naive_species: e.target.value === 'auto' ? undefined : e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-400 shadow-inner"
              >
                <option value="auto">✨ Auto-Select (Climate & Yield Adapted)</option>
                {speciesList.map((sp) => (
                  <option key={sp.name} value={sp.name}>
                    {sp.common_name} ({sp.name}) &bull; r={sp.mature_canopy_radius_m}m &bull; {sp.carbon_sequestration_kg_per_year}kg/yr
                  </option>
                ))}
              </select>
            </div>

            {/* Naive Baseline Action */}
            <div className="pt-1">
              <button
                disabled={!hasSelectedLand || isStreaming}
                onClick={onRunBaseline}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm"
                title={hasSelectedLand ? 'Calculate naive monoculture spacing baseline' : 'Select a land on the globe to calculate baseline'}
              >
                <Trees className="w-3.5 h-3.5 text-teal-400" />
                <span>Calculate Naive Baseline</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Simulated Annealing Parameters */}
        {activeTab === 'annealing' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-slate-400 font-medium mb-1">
                <span>Optimization Iterations</span>
                <span className="font-mono text-emerald-400 font-bold">{request.iterations.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={2000}
                max={50000}
                step={1000}
                value={request.iterations}
                onChange={(e) => onChangeRequest({ iterations: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-medium mb-1">
                <span>Initial Temperature (T₀)</span>
                <span className="font-mono text-amber-400 font-bold">{request.start_temp}</span>
              </div>
              <input
                type="range"
                min={10}
                max={150}
                step={5}
                value={request.start_temp}
                onChange={(e) => onChangeRequest({ start_temp: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Higher start temperatures promote broad global exploration to break out of uniform monoculture local minima.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-medium mb-1">
                <span>Cooling Rate (α)</span>
                <span className="font-mono text-cyan-400 font-bold">{request.cooling_rate}</span>
              </div>
              <input
                type="range"
                min={0.998}
                max={0.9999}
                step={0.0001}
                value={request.cooling_rate}
                onChange={(e) => onChangeRequest({ cooling_rate: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Standard geometric cooling schedule: T_next = &alpha; &times; T_current. Values &ge; 0.9995 allow thorough convergence.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Objective Function Weights */}
        {activeTab === 'weights' && (
          <div className="space-y-4">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300">
              <strong>Metropolis Objective:</strong>
              <div className="font-mono text-emerald-400 mt-0.5">
                Score = w_c &times; Carbon + w_b &times; Diversity - w_s &times; SpacingPenalty
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-medium mb-1">
                <span>Carbon Capture Weight (w_c)</span>
                <span className="font-mono text-emerald-400 font-bold">{weights.carbon}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={3.0}
                step={0.1}
                value={weights.carbon}
                onChange={(e) => handleWeightChange('carbon', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-medium mb-1">
                <span>Biodiversity Bonus Weight (w_b)</span>
                <span className="font-mono text-teal-400 font-bold">{weights.biodiversity}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={weights.biodiversity}
                onChange={(e) => handleWeightChange('biodiversity', parseFloat(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-medium mb-1">
                <span>Canopy Spacing Penalty Weight (w_s)</span>
                <span className="font-mono text-rose-400 font-bold">{weights.spacing}</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.1}
                value={weights.spacing}
                onChange={(e) => handleWeightChange('spacing', parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Environmental & Soil Conditions */}
        {activeTab === 'env' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-slate-400 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-400" /> Soil pH Level
                </span>
                <span className="font-mono text-emerald-400 font-bold">{env.soil_ph}</span>
              </div>
              <input
                type="range"
                min={4.5}
                max={9.0}
                step={0.1}
                value={env.soil_ph}
                onChange={(e) => handleEnvChange('soil_ph', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Acidic (4.5)</span>
                <span>Neutral (7.0)</span>
                <span>Alkaline (9.0)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-400 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" /> Annual Precipitation
                </span>
                <span className="font-mono text-blue-400 font-bold">{env.annual_rainfall_mm} mm</span>
              </div>
              <input
                type="range"
                min={300}
                max={3500}
                step={50}
                value={env.annual_rainfall_mm}
                onChange={(e) => handleEnvChange('annual_rainfall_mm', parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-400 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Daily Direct Sunlight
                </span>
                <span className="font-mono text-amber-400 font-bold">{env.sunlight_hours} hours/day</span>
              </div>
              <input
                type="range"
                min={3.5}
                max={9.0}
                step={0.5}
                value={env.sunlight_hours}
                onChange={(e) => handleEnvChange('sunlight_hours', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 5: Species Pool */}
        {activeTab === 'species' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-slate-400 font-medium pb-1 border-b border-slate-800">
              <span>Candidate Pool ({selectedSpecies.length}/{speciesList.length})</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChangeRequest({ selected_species: speciesList.map((s) => s.name) })}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  All
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  onClick={() =>
                    onChangeRequest({
                      selected_species: speciesList.filter((s) => s.native).map((s) => s.name),
                    })
                  }
                  className="text-[11px] text-teal-400 hover:underline"
                >
                  Native Only
                </button>
              </div>
            </div>

            {/* Species Search Input */}
            <input
              type="text"
              placeholder="Filter 18 botanical species..."
              value={speciesSearch}
              onChange={(e) => setSpeciesSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredSpecies.map((sp) => {
                const isChecked = selectedSpecies.includes(sp.name);
                return (
                  <div
                    key={sp.name}
                    onClick={() => toggleSpecies(sp.name)}
                    className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-slate-950/80 border-slate-700/80'
                        : 'bg-slate-950/30 border-slate-800/40 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sp.color }} />
                      <div>
                        <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                          {sp.common_name}
                          {sp.native && (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/20">
                              Native
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 italic">{sp.name}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-emerald-400 text-xs font-bold">
                        {sp.carbon_sequestration_kg_per_year} kg/yr
                      </div>
                      <div className="text-[10px] text-slate-400">Canopy: {sp.mature_canopy_radius_m}m</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
