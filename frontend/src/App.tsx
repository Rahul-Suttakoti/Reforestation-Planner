import React, { useState, useEffect, useRef } from 'react';
import type {
  Species,
  OptimizeRequest,
  PlantedTree,
  BaselineResult,
  GeoBoundingBox,
} from './types';
import {
  fetchSpeciesList,
  fetchEnvironmentConditions,
  createBboxFromCenter,
  getLocationSuggestions,
  runBaselineSync,
} from './services/api';
import { useAnnealingStream } from './hooks/useAnnealingStream';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { AnnealingCanvas } from './components/AnnealingCanvas';
import { SatelliteMap } from './components/SatelliteMap';
import { ConvergenceChart } from './components/ConvergenceChart';
import { MetricsDashboard } from './components/MetricsDashboard';
import { TreeInspectorModal } from './components/TreeInspectorModal';
import { exportReforestationPlanPdf } from './services/pdfExporter';

export const App: React.FC = () => {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [locationName, setLocationName] = useState<string>('');
  const [isFetchingEnv, setIsFetchingEnv] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'satellite' | 'annealing' | 'comparison'>('satellite');
  const [satelliteViewMode, setSatelliteViewMode] = useState<'globe' | 'map'>('globe');
  const [selectedTree, setSelectedTree] = useState<PlantedTree | null>(null);
  const [standaloneBaseline, setStandaloneBaseline] = useState<BaselineResult | null>(null);

  // Core Request State (Starts with no land selected)
  const [request, setRequest] = useState<OptimizeRequest>({
    plot_width_m: 100.0,
    plot_height_m: 100.0,
    cell_size_m: 5.0,
    bounding_box: undefined,
    environment: {
      soil_ph: 7.1,
      annual_rainfall_mm: 1365.0,
      sunlight_hours: 6.2,
      avg_temperature_c: 24.9,
      elevation_m: 586.0,
    },
    suitability_weights: {
      soil: 0.4,
      rainfall: 0.35,
      sunlight: 0.25,
    },
    optimization_weights: {
      carbon: 1.0,
      biodiversity: 0.15,
      spacing: 1.0,
    },
    iterations: 25000,
    start_temp: 50.0,
    cooling_rate: 0.9995,
    seed: 42,
    years_horizon: 20,
    stream_interval: 200,
  });

  const hasSelectedLand = Boolean(locationName && locationName.trim() && request.bounding_box);

  // Annealing Streaming Hook
  const {
    isStreaming,
    currentFrame,
    finalResult,
    setFinalResult,
    liveTrees,
    setLiveTrees,
    history,
    error,
    startStream,
    stopStream,
  } = useAnnealingStream();

  // Load initial species
  useEffect(() => {
    async function init() {
      try {
        const loadedSpecies = await fetchSpeciesList(request.environment);
        setSpeciesList(loadedSpecies);
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  // Update species suitability whenever environmental variables change
  useEffect(() => {
    fetchSpeciesList(request.environment)
      .then((res) => setSpeciesList(res))
      .catch((err) => console.error(err));
  }, [request.environment.soil_ph, request.environment.annual_rainfall_mm, request.environment.sunlight_hours]);

  // Handle location update from SatelliteMap or ControlPanel
  const handleLocationChange = async (
    name: string,
    lat: number,
    lon: number,
    newBbox: GeoBoundingBox
  ) => {
    setLocationName(name);
    setSatelliteViewMode('map');
    setRequest((prev) => ({
      ...prev,
      bounding_box: newBbox,
    }));

    setIsFetchingEnv(true);
    try {
      const fetchedEnv = await fetchEnvironmentConditions(lat, lon);
      setRequest((prev) => ({
        ...prev,
        environment: fetchedEnv,
      }));
    } catch (e) {
      console.error('Failed to fetch environment at coords', e);
    } finally {
      setIsFetchingEnv(false);
    }
  };

  // Search trigger from ControlPanel
  const handleSearchFromControlPanel = async (query: string) => {
    try {
      const results = await getLocationSuggestions(query, 1);
      if (results.length > 0) {
        const first = results[0];
        const newBbox = await createBboxFromCenter(first.lat, first.lon, request.plot_width_m, request.plot_height_m);
        const displayName = first.name || first.display_name.split(',')[0];
        handleLocationChange(displayName, first.lat, first.lon, newBbox);
        setActiveTab('satellite'); // switch to satellite view so user can see their selected region!
      } else {
        alert(`Location "${query}" was not found. Please try another place name.`);
      }
    } catch (err: any) {
      alert(`Search failed: ${err.message}`);
    }
  };

  const prevStreamingRef = useRef(false);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  // When live annealing completes, smoothly delay and transition to 'comparison' (Naive vs Optimal)
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && finalResult) {
      setCompletionNotice('Optimization Complete! Transitioning to Naive vs. Optimal Comparison...');
      const timer = setTimeout(() => {
        setCompletionNotice(null);
        setActiveTab('comparison');
      }, 950);
      return () => clearTimeout(timer);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, finalResult]);

  const handleStartLiveStream = () => {
    if (!hasSelectedLand) return;
    // 1. Immediately switch to Live Annealing tab
    if (activeTab !== 'annealing') {
      setActiveTab('annealing');
    }
    // 2. Introduce brief 220ms delay for buttery smooth transition without lag
    setTimeout(() => {
      startStream(request);
    }, 220);
  };

  const handleRunBaseline = async () => {
    if (!hasSelectedLand) return;
    stopStream();
    try {
      const res = await runBaselineSync(request);
      setStandaloneBaseline(res);
      setLiveTrees(res.trees);
    } catch (err: any) {
      alert(`Baseline failed: ${err.message}`);
    }
  };

  const handleClearLand = () => {
    setLocationName('');
    setSatelliteViewMode('globe');
    setRequest((prev) => ({
      ...prev,
      bounding_box: undefined,
    }));
    setFinalResult(null);
    setStandaloneBaseline(null);
    setLiveTrees([]);
  };

  const handleReset = () => {
    stopStream();
    handleClearLand();
  };

  const handleExportPdf = async () => {
    try {
      await exportReforestationPlanPdf({
        result: finalResult,
        request,
        speciesList,
        locationName,
        trees: displayedTrees,
      });
      setCompletionNotice('Reforestation Plan PDF Downloaded Successfully!');
      setTimeout(() => setCompletionNotice(null), 3000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  const displayedTrees = liveTrees.length > 0 ? liveTrees : finalResult?.trees || standaloneBaseline?.trees || [];

  return (
    <div
      className={`flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 ${
        activeTab === 'satellite' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Top Header */}
      <Header
        isStreaming={isStreaming}
        iteration={currentFrame?.iteration || 0}
        totalIterations={request.iterations}
        hasResult={!!finalResult}
        result={finalResult}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleReset}
        request={request}
        speciesList={speciesList}
        locationName={locationName}
        trees={displayedTrees}
      />


      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-6 py-2 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => window.location.reload()} className="underline font-semibold ml-4">
            Reload
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main
        className={`flex-1 min-h-0 px-3 py-2.5 lg:px-5 lg:py-2.5 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1720px] mx-auto w-full ${
          activeTab === 'satellite' ? 'overflow-hidden' : ''
        }`}
      >
        {/* Left Column: Control & Tuning Panel */}
        <aside className="lg:col-span-4 xl:col-span-3 h-full min-h-0 flex flex-col overflow-y-auto">
          <ControlPanel
            request={request}
            onChangeRequest={(updated) => setRequest((prev) => ({ ...prev, ...updated }))}
            speciesList={speciesList}
            locationName={locationName}
            hasSelectedLand={hasSelectedLand}
            onClearLand={handleClearLand}
            onSearchLocation={handleSearchFromControlPanel}
            isStreaming={isStreaming}
            onStartLiveStream={handleStartLiveStream}
            onStopLiveStream={stopStream}
            onRunBaseline={handleRunBaseline}
          />
        </aside>

        {/* Completion Toast Notification */}
        {completionNotice && (
          <div className="fixed top-20 right-6 z-[2000] bg-emerald-950/95 border border-emerald-500/50 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 text-sm text-emerald-200 animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold">{completionNotice}</span>
          </div>
        )}

        {/* Center / Right Column: Visualization & Analytics */}
        <section className="lg:col-span-8 xl:col-span-9 h-full min-h-0 flex flex-col">
          {/* Tab 1 (Inorder): 3D Globe & 2D Satellite Mapping (Persistently mounted so zoom, tiles & 2D map mode never reset) */}
          <div
            className={`h-full min-h-0 w-full animate-in fade-in duration-300 ease-out ${
              activeTab === 'satellite' ? 'flex flex-col' : 'hidden'
            }`}
          >
            <SatelliteMap
              locationName={locationName}
              hasSelectedLand={hasSelectedLand}
              onLocationChange={handleLocationChange}
              boundingBox={request.bounding_box}
              trees={displayedTrees}
              onSelectTree={(tree) => setSelectedTree(tree)}
              environment={request.environment}
              plotWidthM={request.plot_width_m}
              plotHeightM={request.plot_height_m}
              isFetchingEnv={isFetchingEnv}
              isStreaming={isStreaming}
              onStartLiveStream={handleStartLiveStream}
              onStopLiveStream={stopStream}
              viewMode={satelliteViewMode}
              onViewModeChange={setSatelliteViewMode}
            />
          </div>

          {/* Tab 2 (Inorder): Live Simulated Annealing Stream */}
          {activeTab === 'annealing' && (
            <div className="space-y-4 animate-in fade-in duration-300 ease-out">
              <div className="h-[calc(100vh-320px)] min-h-[460px]">
                <AnnealingCanvas
                  plotWidthM={request.plot_width_m}
                  plotHeightM={request.plot_height_m}
                  cellSizeM={request.cell_size_m}
                  trees={displayedTrees}
                  hasSelectedLand={hasSelectedLand}
                  speciesList={speciesList}
                  recentMoveRow={currentFrame?.move_row}
                  recentMoveCol={currentFrame?.move_col}
                  isStreaming={isStreaming}
                  onSelectTree={(tree) => setSelectedTree(tree)}
                />
              </div>

              {/* Real-time Convergence Curve */}
              <ConvergenceChart
                history={history}
                currentIteration={currentFrame?.iteration || 0}
                totalIterations={request.iterations}
                temperature={currentFrame?.temperature || request.start_temp}
                currentScore={currentFrame?.current_score || 0}
              />
            </div>
          )}

          {/* Tab 3 (Inorder): Head-to-Head Naive vs Optimal Comparison & Comprehensive Analytics */}
          {activeTab === 'comparison' && (
            <div className="space-y-6 animate-in fade-in duration-300 ease-out">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Baseline Canvas */}
                <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      Naive Baseline ({finalResult?.baseline.chosen_species_common || standaloneBaseline?.chosen_species_common || 'Monoculture'})
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Trees: {finalResult?.baseline.trees_planted || standaloneBaseline?.trees_planted || '0'}
                    </span>
                  </div>
                  <div className="h-[520px]">
                    <AnnealingCanvas
                      plotWidthM={request.plot_width_m}
                      plotHeightM={request.plot_height_m}
                      cellSizeM={request.cell_size_m}
                      trees={finalResult?.baseline.trees || standaloneBaseline?.trees || []}
                      speciesList={speciesList}
                      onSelectTree={(tree) => setSelectedTree(tree)}
                    />
                  </div>
                </div>

                {/* Right: Optimized Layout Canvas */}
                <div className="flex flex-col bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-4 shadow-xl shadow-emerald-500/5">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <span className="font-bold text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Optimal Layout
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      Trees: {finalResult?.metrics.trees_planted || '0'} (+
                      {finalResult?.comparison.carbon_increase_pct || 0}% vs Naive)
                    </span>
                  </div>
                  <div className="h-[520px]">
                    <AnnealingCanvas
                      plotWidthM={request.plot_width_m}
                      plotHeightM={request.plot_height_m}
                      cellSizeM={request.cell_size_m}
                      trees={finalResult?.trees || []}
                      speciesList={speciesList}
                      onSelectTree={(tree) => setSelectedTree(tree)}
                    />
                  </div>
                </div>
              </div>

              {/* Attached Metrics Dashboard: Performance Evaluation & Species Distribution (Visible while scrolling down) */}
              <MetricsDashboard
                result={finalResult}
                baseline={standaloneBaseline}
                onExportPdf={handleExportPdf}
              />
            </div>
          )}
        </section>
      </main>

      {/* Tree Inspector Modal */}
      <TreeInspectorModal tree={selectedTree} onClose={() => setSelectedTree(null)} />
    </div>
  );
};

export default App;
