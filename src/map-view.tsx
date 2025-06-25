import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { RegionFeatureCollection } from './types';
import FeatureTooltip from './feature-tooltip';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapViewProps {
  geojson: RegionFeatureCollection | null;
  loading?: boolean;
  error?: string | null;
}

const SOURCE_ID = 'contrails-regions';
const LAYER_ID = 'contrails-regions-fill';

const MapView: React.FC<MapViewProps> = ({ geojson, loading, error }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    properties: any;
  } | null>(null);

  // Initialize map
  useEffect(() => {
    let removed = false;
    if (!MAPBOX_TOKEN || !mapContainer.current) return;
    if (mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-98.5795, 39.8283],
      zoom: 3.5,
    });
    mapRef.current = map;
    map.on('remove', () => {
      removed = true;
    });
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      removed = true;
    };
  }, []);

  // Add/update GeoJSON source/layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Defensive: don't operate on a removed map
    if ((map as any)._removed) return;
    // Remove previous source/layer if present
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    if (geojson) {
      try {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
        });
        map.addLayer({
          id: LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': '#8f1f29',
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'threshold'],
              1,
              0.3,
              2,
              0.4,
              3,
              0.6,
              4,
              0.8,
            ],
            'fill-outline-color': '#000000',
          },
        });
      } catch (e) {
        // Ignore errors if map is removed
      }

      // Tooltip events
      const mouseMove = (e: any) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const { x, y } = e.point;
          setTooltip({
            x,
            y,
            properties: feature.properties,
          });
        }
      };
      const mouseLeave = () => setTooltip(null);
      map.on('mousemove', LAYER_ID, mouseMove);
      map.on('mouseleave', LAYER_ID, mouseLeave);
      // Cleanup events on geojson change
      return () => {
        if (!map) return;
        try {
          map.off('mousemove', LAYER_ID, mouseMove);
          map.off('mouseleave', LAYER_ID, mouseLeave);
        } catch (e) {}
      };
    }
  }, [geojson]);

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{ color: 'red' }}>
        Mapbox token missing. Set VITE_MAPBOX_TOKEN in your .env file.
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100%', flex: 1, position: 'relative' }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.95)',
            padding: '12px 24px',
            borderRadius: 8,
            zIndex: 20,
            fontWeight: 500,
            fontSize: 16,
            color: '#333',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}
        >
          Loading...
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,230,230,0.98)',
            padding: '12px 24px',
            borderRadius: 8,
            zIndex: 20,
            fontWeight: 500,
            fontSize: 16,
            color: '#a00',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}
        >
          {error}
        </div>
      )}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <FeatureTooltip properties={tooltip.properties} />
        </div>
      )}
    </div>
  );
};

export default MapView;
