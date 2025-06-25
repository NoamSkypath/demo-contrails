// Intentionally left blank for future grid API logic.
// getGrids API logic (stub for v2)

import type { Filters } from '../types';
import type { RequestMetadata } from './regions';

const API_KEY = import.meta.env.VITE_CONTRAILS_API_KEY;
const BASE_URL = 'https://contrails.googleapis.com/v2/grid/ef';

export async function getGrids(
  filters: Filters
): Promise<{ blob: Blob; meta: RequestMetadata }> {
  if (!API_KEY)
    throw new Error(
      'Contrails API key missing. Set VITE_CONTRAILS_API_KEY in your .env file.'
    );
  const params = new URLSearchParams();
  params.append('key', API_KEY);
  if (filters.time) params.append('time', filters.time);
  if (filters.flightLevel) {
    filters.flightLevel
      .split(',')
      .map((f) => f.trim())
      .forEach((level) => {
        if (level) params.append('flightLevel', level);
      });
  }
  // For MVP, skip bbox, aircraftType, format, aircraftClass unless provided
  if (filters.aircraftClass)
    params.append('aircraftClass', filters.aircraftClass);
  // Always request netcdf4 format for now
  params.append('format', 'netcdf3');

  const url = `${BASE_URL}?${params.toString()}`;
  const requestSize = url.length;
  const start = performance.now();
  const res = await fetch(url);
  console.log('res', res);
  const duration = performance.now() - start;
  const status = res.status;
  const blob = await res.blob();
  const responseSize = blob.size;
  debugger;
  const meta: RequestMetadata = {
    url,
    status,
    requestSize,
    responseSize,
    duration: Math.round(duration),
  };
  console.log('getGrids NetCDF response:', { blob, meta });
  return { blob, meta };
}
