// Shared types for Contrails POC will go here

export type Filters = {
  time: string;
  flightLevel: string; // comma-separated string, e.g. '290,310'
  threshold: string;
  aircraftClass: string;
};

export type RegionFeature = {
  type: 'Feature';
  properties: {
    time: string;
    flightLevel?: number; // camelCase (for internal use)
    flight_level?: number; // snake_case (from API)
    threshold: number;
    forecast_reference_time: string;
    aircraft_class: string;
  };
  geometry: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
};

export type RegionFeatureCollection = {
  type: 'FeatureCollection';
  features: RegionFeature[];
};
