import type { Filters, RegionFeatureCollection } from '../types';

const API_KEY = import.meta.env.VITE_CONTRAILS_API_KEY;
const BASE_URL = 'https://contrails.googleapis.com/v2/regions';

export interface RequestMetadata {
  url: string;
  status: number;
  requestSize: number;
  responseSize: number;
  duration: number;
}

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  params.append('key', API_KEY);
  console.log('time', filters.time);
  if (filters.time) params.append('time', filters.time);
  if (filters.flightLevel) {
    filters.flightLevel
      .split(',')
      .map((f) => f.trim())
      .forEach((level) => {
        if (level) params.append('flightLevel', level);
      });
  }
  if (filters.threshold) params.append('threshold', filters.threshold);
  if (filters.aircraftClass && filters.aircraftClass !== 'default')
    params.append('aircraftClass', filters.aircraftClass);
  return params.toString();
}

export async function getRegions(
  filters: Filters
): Promise<{ data: RegionFeatureCollection; meta: RequestMetadata }> {
  if (!API_KEY)
    throw new Error(
      'Contrails API key missing. Set VITE_CONTRAILS_API_KEY in your .env file.'
    );
  const url = `${BASE_URL}?${buildQuery(filters)}`;
  // Remove key param for display in meta
  const urlForMeta = url.replace(/([&?])key=[^&]+&?/, (m, sep) =>
    sep === '?' ? '?' : ''
  );
  console.log('url', url);
  const requestSize = url.length;
  const start = performance.now();
  const res = await fetch(url);
  const duration = performance.now() - start;
  const status = res.status;
  const responseText = await res.text();
  const responseSize = responseText.length;
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error('Invalid JSON response from Contrails API');
  }
  // Basic validation
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('Invalid GeoJSON response from Contrails API');
  }
  return {
    data: data as RegionFeatureCollection,
    meta: {
      url: urlForMeta,
      status,
      requestSize,
      responseSize,
      duration: Math.round(duration),
    },
  };
}
