// API client entry point (method selection abstraction)

import type { Filters } from '../types';
import { getRegions, type RequestMetadata } from './regions';

type FetchContrailsDataMethod = 'regions';

export async function fetchContrailsData(
  method: FetchContrailsDataMethod,
  filters: Filters
): Promise<any> {
  return getRegions(filters);
}
// In the future, add support for more methods here
