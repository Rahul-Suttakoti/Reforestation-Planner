import type {
  Species,
  SitePreset,
  GeoBoundingBox,
  EnvironmentConditions,
  OptimizeRequest,
  OptimizationResult,
  BaselineResult,
  LocationSearchResult
} from '../types';

const API_BASE = '/api';

export async function fetchSpeciesList(env?: Partial<EnvironmentConditions>): Promise<Species[]> {
  const params = new URLSearchParams();
  if (env?.soil_ph !== undefined) params.append('soil_ph', env.soil_ph.toString());
  if (env?.annual_rainfall_mm !== undefined) params.append('rainfall_mm', env.annual_rainfall_mm.toString());
  if (env?.sunlight_hours !== undefined) params.append('sunlight_hours', env.sunlight_hours.toString());

  const url = `${API_BASE}/species${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load species: ${res.statusText}`);
  return res.json();
}

export async function fetchSitePresets(): Promise<SitePreset[]> {
  const res = await fetch(`${API_BASE}/sites/presets`);
  if (!res.ok) throw new Error(`Failed to load presets: ${res.statusText}`);
  return res.json();
}

export async function computePlotDimensions(bbox: GeoBoundingBox): Promise<{
  width_m: number;
  height_m: number;
  area_m2: number;
  area_hectares: number;
}> {
  const res = await fetch(`${API_BASE}/sites/dimensions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bbox),
  });
  if (!res.ok) throw new Error(`Failed to compute dimensions: ${res.statusText}`);
  return res.json();
}

export function computeBboxFromCenter(
  centerLat: number,
  centerLon: number,
  widthM: number = 100,
  heightM: number = 100
): GeoBoundingBox {
  const METERS_PER_DEGREE_LAT = 111132.95;
  const latRad = (centerLat * Math.PI) / 180.0;
  const deltaLat = (heightM / 2.0) / METERS_PER_DEGREE_LAT;
  const metersPerDegreeLon = Math.max(1.0, METERS_PER_DEGREE_LAT * Math.cos(latRad));
  const deltaLon = (widthM / 2.0) / metersPerDegreeLon;

  return {
    lat_min: parseFloat((centerLat - deltaLat).toFixed(6)),
    lon_min: parseFloat((centerLon - deltaLon).toFixed(6)),
    lat_max: parseFloat((centerLat + deltaLat).toFixed(6)),
    lon_max: parseFloat((centerLon + deltaLon).toFixed(6)),
  };
}

export async function createBboxFromCenter(
  centerLat: number,
  centerLon: number,
  widthM: number = 100,
  heightM: number = 100
): Promise<GeoBoundingBox> {
  return computeBboxFromCenter(centerLat, centerLon, widthM, heightM);
}

import { getLocalRecommendations } from './locationIndex';

// High-speed client cache for instant autocomplete responses (< 1ms)
const suggestionsCache = new Map<string, { time: number; data: LocationSearchResult[] }>();

export async function getLocationSuggestions(
  query: string,
  limit: number = 10,
  lat?: number,
  lon?: number
): Promise<LocationSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const latKey = lat !== undefined ? lat.toFixed(2) : '';
  const lonKey = lon !== undefined ? lon.toFixed(2) : '';
  const cacheKey = `${q.toLowerCase()}_${limit}_${latKey}_${lonKey}`;
  const cached = suggestionsCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 300000) {
    return cached.data;
  }

  try {
    let url = `${API_BASE}/sites/autocomplete?q=${encodeURIComponent(q)}&limit=${limit}`;
    if (lat !== undefined && lon !== undefined) {
      url += `&lat=${lat}&lon=${lon}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data: LocationSearchResult[] = await res.json();
      if (data && data.length > 0) {
        suggestionsCache.set(cacheKey, { time: Date.now(), data });
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend autocomplete unreachable, falling back to direct geocoder', err);
  }

  // Direct client fallback to Open-Meteo Global Geocoder (11M+ locations worldwide)
  try {
    const omRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${limit}&language=en&format=json`
    );
    if (omRes.ok) {
      const omData = await omRes.json();
      if (omData.results && omData.results.length > 0) {
        const clientResults: LocationSearchResult[] = omData.results.map((item: any) => {
          const hierarchy = [item.admin3, item.admin2, item.admin1, item.country].filter(Boolean);
          const near = [item.admin3, item.admin2].filter(Boolean).join(', ') || item.admin1 || item.country;
          return {
            name: item.name,
            near,
            disambiguated_name: near ? `${item.name} (near ${near})` : item.name,
            category: item.feature_code === 'PPL' ? 'Village' : 'City',
            region: item.admin1 || '',
            country: item.country || '',
            display_name: `${item.name}, ${hierarchy.join(', ')}`,
            lat: parseFloat(item.latitude.toFixed(6)),
            lon: parseFloat(item.longitude.toFixed(6)),
            source: 'open_meteo_client',
          };
        });
        suggestionsCache.set(cacheKey, { time: Date.now(), data: clientResults });
        return clientResults;
      }
    }
  } catch (_e) {
    // continue to local matches
  }

  // Fallback to local index if network or server error
  const localMatches = getLocalRecommendations(q, limit);
  const fallbackResults: LocationSearchResult[] = localMatches.map((loc) => ({
    name: loc.name,
    category: loc.region.includes('Park') || loc.name.includes('Reserve') ? 'Forest / Reserve' : 'City',
    region: loc.region,
    country: loc.country,
    display_name: `${loc.name}, ${loc.region}, ${loc.country}`,
    lat: loc.lat,
    lon: loc.lon,
    source: 'local_fallback',
  }));
  return fallbackResults;
}

export async function searchLocationNominatim(query: string): Promise<
  { display_name: string; lat: string; lon: string }[]
> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    console.error('Nominatim geocode failed', e);
    return [];
  }
}

export async function fetchEnvironmentConditions(lat: number, lon: number): Promise<EnvironmentConditions> {
  const res = await fetch(`${API_BASE}/sites/fetch-env?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error(`Failed to fetch environmental data: ${res.statusText}`);
  return res.json();
}

export async function runOptimizationSync(request: OptimizeRequest): Promise<OptimizationResult> {
  const res = await fetch(`${API_BASE}/optimize/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Optimization failed');
  }
  return res.json();
}

export async function runBaselineSync(request: OptimizeRequest): Promise<BaselineResult> {
  const res = await fetch(`${API_BASE}/optimize/baseline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Baseline calculation failed');
  }
  return res.json();
}

export async function fetchCarbonProjections(
  baselineAnnual: number,
  optimizedAnnual: number,
  maxYears = 30
): Promise<{ year: number; baseline_carbon_kg: number; optimized_carbon_kg: number; net_gain_kg: number }[]> {
  const res = await fetch(
    `${API_BASE}/analytics/projections?baseline_annual_kg=${baselineAnnual}&optimized_annual_kg=${optimizedAnnual}&max_years=${maxYears}`
  );
  if (!res.ok) throw new Error('Failed to fetch projections');
  return res.json();
}
