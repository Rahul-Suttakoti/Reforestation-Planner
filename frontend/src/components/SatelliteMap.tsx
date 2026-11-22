import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { GeoBoundingBox, PlantedTree, EnvironmentConditions, LocationSearchResult } from '../types';
import {
  Globe,
  Layers,
  MapPin,
  Eye,
  Info,
  Search,
  Crosshair,
  Navigation,
  CheckCircle2,
  Loader2,
  Building,
  Building2,
  Route,
  Train,
  Trees,
  Compass,
  Home,
  Sparkles,
  Square,
} from 'lucide-react';
import { getLocationSuggestions, computeBboxFromCenter } from '../services/api';
import { WorldGlobe } from './WorldGlobe';

interface SatelliteMapProps {
  locationName: string;
  hasSelectedLand?: boolean;
  onLocationChange: (name: string, lat: number, lon: number, newBbox: GeoBoundingBox) => void;
  boundingBox?: GeoBoundingBox | null;
  trees: PlantedTree[];
  onSelectTree?: (tree: PlantedTree) => void;
  environment: EnvironmentConditions;
  plotWidthM: number;
  plotHeightM: number;
  isFetchingEnv?: boolean;
  isStreaming?: boolean;
  onStartLiveStream?: () => void;
  onStopLiveStream?: () => void;
  viewMode?: 'globe' | 'map';
  onViewModeChange?: (mode: 'globe' | 'map') => void;
  onSwitchToGlobeTab?: () => void;
}

export const SatelliteMap: React.FC<SatelliteMapProps> = ({
  locationName,
  hasSelectedLand = true,
  onLocationChange,
  boundingBox,
  trees,
  onSelectTree,
  environment,
  plotWidthM,
  plotHeightM,
  isFetchingEnv,
  isStreaming,
  onStartLiveStream,
  onStopLiveStream,
  viewMode: propViewMode,
  onViewModeChange,
  onSwitchToGlobeTab,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const bboxLayerRef = useRef<L.Polygon | null>(null);
  const treesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  // View mode: 'globe' (Single 3D World Globe) vs 'map' (2D High-Resolution Satellite Map)
  const [internalViewMode, setInternalViewMode] = useState<'globe' | 'map'>(
    propViewMode !== undefined ? propViewMode : (hasSelectedLand || boundingBox ? 'map' : 'globe')
  );
  const viewMode = propViewMode !== undefined ? propViewMode : internalViewMode;

  const setViewMode = (mode: 'globe' | 'map') => {
    setInternalViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  const [isFadingToMap, setIsFadingToMap] = useState<boolean>(false);
  const [diveTarget, setDiveTarget] = useState<{ lat: number; lon: number; id: number; name?: string } | null>(null);

  // Persistent plot center state to avoid defaulting to placeholder coords
  const [selectedCenter, setSelectedCenter] = useState<{ lat: number; lon: number } | null>(
    boundingBox
      ? {
          lat: (boundingBox.lat_min + boundingBox.lat_max) / 2,
          lon: (boundingBox.lon_min + boundingBox.lon_max) / 2,
        }
      : null
  );

  const [activeTileLayer, setActiveTileLayer] = useState<'google' | 'esri' | 'street'>('google');
  const [showTreesOnSatellite, setShowTreesOnSatellite] = useState<boolean>(true);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState(locationName || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const debounceTimerRef = useRef<number | null>(null);

  // Manual Coordinates inputs
  const [customLat, setCustomLat] = useState<string>('');
  const [customLon, setCustomLon] = useState<string>('');

  // Keep selectedCenter updated whenever boundingBox prop changes
  useEffect(() => {
    if (boundingBox) {
      setSelectedCenter({
        lat: (boundingBox.lat_min + boundingBox.lat_max) / 2,
        lon: (boundingBox.lon_min + boundingBox.lon_max) / 2,
      });
    }
  }, [boundingBox]);

  const centerLat = selectedCenter
    ? selectedCenter.lat
    : boundingBox
    ? (boundingBox.lat_min + boundingBox.lat_max) / 2
    : 14.432;
  const centerLon = selectedCenter
    ? selectedCenter.lon
    : boundingBox
    ? (boundingBox.lon_min + boundingBox.lon_max) / 2
    : 75.439;

  // Keep search input synced with locationName
  useEffect(() => {
    if (locationName && !searchQuery) {
      setSearchQuery(locationName);
    }
  }, [locationName]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Initialize Leaflet map on mount (permanently active underneath 3D globe so tiles are preloaded)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = selectedCenter
      ? selectedCenter.lat
      : boundingBox
      ? (boundingBox.lat_min + boundingBox.lat_max) / 2
      : 14.432;
    const initialLon = selectedCenter
      ? selectedCenter.lon
      : boundingBox
      ? (boundingBox.lon_min + boundingBox.lon_max) / 2
      : 75.439;
    const initialZoom = selectedCenter || boundingBox ? 16 : 3;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      minZoom: 2,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
      zoomControl: true,
    });

    // 1. Google Satellite Hybrid: globally ultra-high resolution down to zoom 20 with roads, labels, and NO missing data watermark
    const googleLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps',
      maxZoom: 20,
      maxNativeZoom: 20,
      noWrap: true,
      bounds: [
        [-85, -180],
        [85, 180],
      ],
    });

    // 2. Esri World Imagery (capped with maxNativeZoom: 17 so "Map data not available" tile is NEVER requested)
    const esriLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 20,
        maxNativeZoom: 17,
        noWrap: true,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      }
    );

    // 3. OpenStreetMap standard street map
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      maxNativeZoom: 19,
      noWrap: true,
      bounds: [
        [-85, -180],
        [85, 180],
      ],
    });

    if (activeTileLayer === 'google') googleLayer.addTo(map);
    else if (activeTileLayer === 'esri') esriLayer.addTo(map);
    else if (activeTileLayer === 'street') streetLayer.addTo(map);

    (map as any)._googleLayer = googleLayer;
    (map as any)._esriLayer = esriLayer;
    (map as any)._streetLayer = streetLayer;

    // Clean satellite view: do not show intrusive grid / bounding box polygons over aerial photography
    bboxLayerRef.current = null;

    // Tree Markers
    const treeGroup = L.layerGroup().addTo(map);
    treesLayerGroupRef.current = treeGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lon = parseFloat(e.latlng.lng.toFixed(6));
      setClickedCoords({ lat, lon });
      setCustomLat(lat.toString());
      setCustomLon(lon.toString());

      if (clickMarkerRef.current) {
        clickMarkerRef.current.setLatLng([lat, lon]);
      } else {
        const marker = L.marker([lat, lon], {
          icon: L.divIcon({
            className: 'custom-pin',
            html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
            iconSize: [14, 14],
          }),
        }).addTo(map);
        clickMarkerRef.current = marker;
      }
    });

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      bboxLayerRef.current = null;
      treesLayerGroupRef.current = null;
      clickMarkerRef.current = null;
    };
  }, []);

  // Invalidate map size when switching to 2D map view so Leaflet renders seamlessly
  useEffect(() => {
    if (viewMode === 'map' && mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // Update Tile Layer switch
  useEffect(() => {
    const map = mapInstanceRef.current as any;
    if (!map) return;

    if (map._googleLayer) map.removeLayer(map._googleLayer);
    if (map._esriLayer) map.removeLayer(map._esriLayer);
    if (map._streetLayer) map.removeLayer(map._streetLayer);

    if (activeTileLayer === 'google' && map._googleLayer) {
      map.addLayer(map._googleLayer);
    } else if (activeTileLayer === 'esri' && map._esriLayer) {
      map.addLayer(map._esriLayer);
    } else if (activeTileLayer === 'street' && map._streetLayer) {
      map.addLayer(map._streetLayer);
    }
  }, [activeTileLayer]);

  // Clean satellite view: ensure no grid or bounding box polygons are drawn on the map
  useEffect(() => {
    if (bboxLayerRef.current) {
      bboxLayerRef.current.remove();
      bboxLayerRef.current = null;
    }
  }, [boundingBox]);

  // Update Tree markers on Satellite
  useEffect(() => {
    const group = treesLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (!showTreesOnSatellite || !trees.length) return;

    trees.forEach((tree) => {
      if (tree.lat === undefined || tree.lon === undefined) return;

      const circle = L.circle([tree.lat, tree.lon], {
        radius: tree.canopy_radius_m,
        color: '#0f172a',
        weight: 1.2,
        fillColor: tree.color || '#10b981',
        fillOpacity: 0.65,
      });

      circle.bindTooltip(
        `<strong>${tree.common_name}</strong><br/><em>${tree.species_name}</em><br/>Canopy: ${tree.canopy_radius_m}m | Carbon: ${tree.carbon_kg_per_year}kg/yr`,
        { direction: 'top', className: 'text-xs bg-slate-900 border border-slate-700 text-white rounded p-1' }
      );

      circle.on('click', () => {
        if (onSelectTree) onSelectTree(tree);
      });

      circle.addTo(group);
    });
  }, [trees, showTreesOnSatellite, onSelectTree]);

  // Relocate plot center to coordinates synchronously with zero network delay
  const handleRelocatePlotToCoords = (lat: number, lon: number, customName?: string) => {
    setSelectedCenter({ lat, lon });
    const newBbox = computeBboxFromCenter(lat, lon, plotWidthM, plotHeightM);
    const name = customName || (locationName && locationName !== 'Plot Site' ? locationName : `Site (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`);
    onLocationChange(name, lat, lon, newBbox);
    setClickedCoords(null);
    if (clickMarkerRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }
    const map = mapInstanceRef.current;
    if (map) {
      map.invalidateSize();
      map.setView([lat, lon], 17);

      if (bboxLayerRef.current) {
        bboxLayerRef.current.remove();
        bboxLayerRef.current = null;
      }
    }
  };

  const handleGlobeDiveFinished = () => {
    setIsFadingToMap(true);
    setTimeout(() => {
      setViewMode('map');
      setIsFadingToMap(false);
      setDiveTarget(null);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        if (selectedCenter) {
          mapInstanceRef.current.setView([selectedCenter.lat, selectedCenter.lon], 17);
        }
      }
    }, 350);
  };

  // Search execution with rapid 120ms debounce
  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (val.trim().length >= 1) {
      setIsSearching(true);
      debounceTimerRef.current = window.setTimeout(async () => {
        try {
          const suggestions = await getLocationSuggestions(val, 10, centerLat, centerLon);
          setSearchResults(suggestions);
        } catch (e) {
          console.error('Failed to get suggestions', e);
        } finally {
          setIsSearching(false);
        }
      }, 120);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (searchResults.length > 0) {
      handleSelectSearchResult(searchResults[0]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await getLocationSuggestions(searchQuery, 10, centerLat, centerLon);
      setSearchResults(results);
      if (results.length > 0) {
        handleSelectSearchResult(results[0]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: LocationSearchResult) => {
    const targetName = result.disambiguated_name || result.name || result.display_name.split(',')[0];
    setSearchResults([]);
    setSearchQuery(targetName);

    // Immediately update coordinates synchronously so there is zero lag or wrong placement
    handleRelocatePlotToCoords(result.lat, result.lon, targetName);

    if (viewMode === 'globe') {
      // Smoothly zoom on 3D globe down into the target coordinates, then auto-convert to 2D satellite
      setDiveTarget({ lat: result.lat, lon: result.lon, id: Date.now(), name: targetName });
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([result.lat, result.lon], 17, { duration: 1.2 });
      }
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Search Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/90 space-y-2 flex-shrink-0">
        {/* Main Search Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <form onSubmit={handleSearch} className="flex items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search street, road, metro, building, or address..."
                  value={searchQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 1 && searchResults.length === 0) {
                      handleQueryChange(searchQuery);
                    }
                  }}
                  className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 shadow-inner"
                />
                <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3 top-2.5" />
                )}
              </div>
            </form>

            {/* Recommendations Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-[1100] bg-slate-950/98 backdrop-blur-xl border border-emerald-500/40 rounded-xl shadow-2xl overflow-hidden text-xs divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-900/95 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                  <span>Recommended Locations, Streets & Transit</span>
                  <span className="text-slate-500 font-normal">Click any place to plot</span>
                </div>
                {searchResults.map((res, i) => {
                  const cat = res.category || 'Place';
                  let icon = <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                  let badgeStyle = "bg-slate-900 text-slate-300 border-slate-700";

                  if (cat.includes('Metro') || cat.includes('Station') || cat.includes('Transit')) {
                    icon = <Train className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                    badgeStyle = "bg-indigo-950/80 text-indigo-300 border-indigo-500/40";
                  } else if (cat.includes('Street') || cat.includes('Road')) {
                    icon = <Route className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                    badgeStyle = "bg-teal-950/80 text-teal-300 border-teal-500/40";
                  } else if (cat.includes('Building')) {
                    icon = <Building2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                    badgeStyle = "bg-amber-950/80 text-amber-300 border-amber-500/40";
                  } else if (cat === 'City') {
                    icon = <Building className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                    badgeStyle = "bg-purple-950/70 text-purple-300 border-purple-500/30";
                  } else if (cat === 'Village' || cat === 'Hamlet') {
                    icon = <Home className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                    badgeStyle = "bg-cyan-950/70 text-cyan-300 border-cyan-500/30";
                  } else if (cat.includes('Forest') || cat.includes('Reserve')) {
                    icon = <Trees className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                    badgeStyle = "bg-emerald-950/70 text-emerald-300 border-emerald-500/30";
                  } else if (cat.includes('Landmark') || cat.includes('POI')) {
                    icon = <Compass className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                    badgeStyle = "bg-amber-950/70 text-amber-300 border-amber-500/30";
                  } else if (cat === 'Town') {
                    icon = <Building className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                    badgeStyle = "bg-amber-950/70 text-amber-300 border-amber-500/30";
                  } else if (cat === 'Locality' || cat === 'District') {
                    icon = <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 group-hover:scale-110 transition-transform" />;
                    badgeStyle = "bg-sky-950/70 text-sky-300 border-sky-500/30";
                  }

                  return (
                    <div
                      key={i}
                      onClick={() => handleSelectSearchResult(res)}
                      className="p-2.5 hover:bg-emerald-500/10 hover:border-l-2 hover:border-l-emerald-400 cursor-pointer text-slate-200 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {icon}
                        <div className="truncate">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-xs group-hover:text-emerald-300">
                              {res.name}
                            </span>
                            {res.near && (
                              <span className="text-[11px] font-normal text-emerald-300/95 italic">
                                (near {res.near})
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded tracking-wide border flex-shrink-0 ${badgeStyle}`}
                            >
                              {cat}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                            {res.near && (
                              <span className="text-teal-400 font-medium">near {res.near} &bull;</span>
                            )}
                            <span>{res.region ? `${res.region}, ${res.country}` : res.country || res.display_name}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap group-hover:text-emerald-400 group-hover:border-emerald-500/30 flex-shrink-0">
                        {res.lat.toFixed(3)}, {res.lon.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Manual Lat/Lon */}
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="number"
              step="0.0001"
              placeholder="Lat"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="w-20 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <input
              type="number"
              step="0.0001"
              placeholder="Lon"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              className="w-20 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => {
                const la = parseFloat(customLat);
                const lo = parseFloat(customLon);
                if (!isNaN(la) && !isNaN(lo)) {
                  if (viewMode === 'globe') {
                    setDiveTarget({ lat: la, lon: lo, id: Date.now() });
                    handleRelocatePlotToCoords(la, lo);
                  } else {
                    handleRelocatePlotToCoords(la, lo);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([la, lo], 17, { duration: 1.2 });
                    }
                  }
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
            >
              <Navigation className="w-3 h-3 text-emerald-400" />
              Go
            </button>
          </div>

          {/* Controls Right: Only show in 2D Satellite mode (3D Globe transitions automatically on search/click) */}
          {viewMode === 'map' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onSwitchToGlobeTab) {
                    onSwitchToGlobeTab();
                  } else {
                    setIsFadingToMap(false);
                    setDiveTarget(null);
                    setViewMode('globe');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 font-bold text-xs transition-all shadow-inner active:scale-95"
                title="Explore 3D World Globe"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>3D World Globe</span>
              </button>

              <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs">
                <span className="pl-2 pr-1 text-slate-500 hidden sm:inline-flex">
                  <Layers className="w-3.5 h-3.5" />
                </span>
                <button
                  onClick={() => setActiveTileLayer('google')}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    activeTileLayer === 'google'
                      ? 'bg-emerald-600 text-white font-bold shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Google Satellite Hybrid"
                >
                  Google HD
                </button>
                <button
                  onClick={() => setActiveTileLayer('esri')}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    activeTileLayer === 'esri'
                      ? 'bg-emerald-600 text-white font-bold shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Esri Natural Terrain"
                >
                  Esri
                </button>
                <button
                  onClick={() => setActiveTileLayer('street')}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    activeTileLayer === 'street'
                      ? 'bg-emerald-600 text-white font-bold shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Street View"
                >
                  Street
                </button>
              </div>

              <button
                onClick={() => setShowTreesOnSatellite((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  showTreesOnSatellite
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Trees ({trees.length})
              </button>
            </div>
          )}
        </div>

        {/* Selected Region Info Strip */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-800/80 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Target Region:</span>
            <strong className="text-white text-sm font-semibold">{hasSelectedLand ? (locationName || 'Plot Site') : 'None selected'}</strong>
            {hasSelectedLand && (
              <span className="text-[11px] text-slate-400 font-mono">
                [Center: {centerLat.toFixed(5)}, {centerLon.toFixed(5)}]
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isFetchingEnv ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Fetching live climate...
              </span>
            ) : hasSelectedLand ? (
              <span className="flex items-center gap-1.5 text-emerald-400 hidden md:inline-flex">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Climate synced ({environment.annual_rainfall_mm}mm, pH {environment.soil_ph})
              </span>
            ) : (
              <span className="text-slate-400 text-[11px] hidden md:inline-flex">
                Select a land on the globe or search to sync climate
              </span>
            )}

            {onStartLiveStream &&
              (isStreaming ? (
                <button
                  onClick={onStopLiveStream}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/30 active:scale-95 animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop Annealing</span>
                </button>
              ) : (
                <button
                  disabled={!hasSelectedLand}
                  onClick={onStartLiveStream}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 group bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-teal-400 disabled:active:scale-100 disabled:shadow-none"
                  title={hasSelectedLand ? 'Run Live Annealing' : 'Select a land to run annealing'}
                >
                  <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                  <span>Run Live Annealing</span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-slate-950">
        {/* 2D Satellite Map Container (ALWAYS mounted underneath so Leaflet pre-loads tiles) */}
        <div
          ref={mapContainerRef}
          className="w-full h-full absolute inset-0 z-0"
        />

        {/* 3D World Globe Container (smoothly dissolves into 2D Satellite) */}
        {viewMode === 'globe' && (
          <div
            className={`w-full h-full absolute inset-0 z-10 transition-opacity duration-350 ease-out ${
              isFadingToMap ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <WorldGlobe
              lat={centerLat}
              lon={centerLon}
              locationName={locationName || ''}
              hasSelectedLand={hasSelectedLand}
              onSelectCoords={(lat, lon, customName) => handleRelocatePlotToCoords(lat, lon, customName)}
              onSwitchToSatellite={handleGlobeDiveFinished}
              diveTarget={diveTarget}
            />
          </div>
        )}

        {/* Floating Telemetry Box (Accessible in both modes) */}
        <div className="absolute bottom-5 left-5 z-[500] bg-slate-950/95 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl max-w-xs text-xs space-y-1.5 pointer-events-auto">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Info className="w-3.5 h-3.5" /> Regional Telemetry
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-slate-300">
            <div>
              <span className="text-slate-400">Soil pH:</span>{' '}
              <span className="font-semibold text-white">{hasSelectedLand ? environment.soil_ph : '-'}</span>
            </div>
            <div>
              <span className="text-slate-400">Rainfall:</span>{' '}
              <span className="font-semibold text-white">
                {hasSelectedLand ? `${environment.annual_rainfall_mm}mm` : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Sunlight:</span>{' '}
              <span className="font-semibold text-white">
                {hasSelectedLand ? `${environment.sunlight_hours}h/day` : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Elevation:</span>{' '}
              <span className="font-semibold text-white">
                {hasSelectedLand ? `${environment.elevation_m || 586}m` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Relocate Plot Banner when user clicks anywhere in 2D Satellite map */}
        {clickedCoords && viewMode === 'map' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[500] bg-slate-950/95 backdrop-blur-md border border-emerald-500/50 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 text-xs animate-in slide-in-from-top-3">
            <Crosshair className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="text-slate-200">
              Clicked:{' '}
              <strong className="text-white font-mono">
                {clickedCoords.lat}, {clickedCoords.lon}
              </strong>
            </span>
            <button
              onClick={() => handleRelocatePlotToCoords(clickedCoords.lat, clickedCoords.lon)}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20"
            >
              Plot in this Region
            </button>
            <button
              onClick={() => {
                setClickedCoords(null);
                if (clickMarkerRef.current) {
                  clickMarkerRef.current.remove();
                  clickMarkerRef.current = null;
                }
              }}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
