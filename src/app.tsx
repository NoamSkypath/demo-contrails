import React, { useState, useEffect } from 'react';
import Sidebar from './sidebar';
import type { Filters } from './types';
import MapView from './map-view';
import { fetchContrailsData } from './api';
import type { RegionFeatureCollection } from './types';
import type { RequestMetadata } from './api/regions';
import FeatureTable from './feature-table';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const App: React.FC = () => {
  const [geojson, setGeojson] = useState<RegionFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<RequestMetadata | null>(null);
  const [tab, setTab] = useState<'map' | 'data'>('map');
  // Shared filter state
  const [filters, setFilters] = useState<Filters>(() => {
    // Next full hour in UTC
    let d = dayjs.utc();
    if (d.minute() > 0 || d.second() > 0 || d.millisecond() > 0) {
      d = d.add(1, 'hour');
    }
    d = d.set('minute', 0).set('second', 0).set('millisecond', 0);
    return {
      time: d.toISOString(),
      flightLevel: '',
      threshold: '',
      aircraftClass: '',
    };
  });

  const handleApplyFilters = async (newFilters: Filters) => {
    setFilters(newFilters);
    setLoading(true);
    setError(null);
    setGeojson(null);
    setMeta(null);
    try {
      const { data, meta } = await fetchContrailsData('regions', newFilters);
      setGeojson(data);
      setMeta(meta);
      setLoading(false);
      if (!data.features || data.features.length === 0) {
        setError('No regions found for the selected filters.');
      }
    } catch (err: any) {
      setGeojson(null);
      setMeta(null);
      setLoading(false);
      setError(err?.message || 'Unknown error');
    }
  };

  // On mount, trigger initial request with default filters
  useEffect(() => {
    handleApplyFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <aside
        style={{
          width: 300,
          borderRight: '1px solid #eee',
          padding: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Sidebar
          filters={filters}
          setFilters={setFilters}
          onApplyFilters={handleApplyFilters}
          meta={meta}
          geojson={geojson}
        />
      </aside>
      <main
        style={{
          flex: 1,
          padding: 0,
          height: '100%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #222',
            background: '#23272f',
            zIndex: 10,
          }}
        >
          <button
            style={{
              flex: 1,
              padding: '12px 0',
              background: tab === 'map' ? '#181a20' : 'transparent',
              color: tab === 'map' ? '#fff' : '#aaa',
              border: 'none',
              borderBottom:
                tab === 'map' ? '2px solid #4fc3f7' : '2px solid transparent',
              fontWeight: 600,
              fontSize: 16,
              cursor: tab === 'map' ? 'default' : 'pointer',
              outline: 'none',
              transition: 'background 0.2s',
            }}
            onClick={() => setTab('map')}
            disabled={tab === 'map'}
          >
            Map
          </button>
          <button
            style={{
              flex: 1,
              padding: '12px 0',
              background: tab === 'data' ? '#181a20' : 'transparent',
              color: tab === 'data' ? '#fff' : '#aaa',
              border: 'none',
              borderBottom:
                tab === 'data' ? '2px solid #4fc3f7' : '2px solid transparent',
              fontWeight: 600,
              fontSize: 16,
              cursor: tab === 'data' ? 'default' : 'pointer',
              outline: 'none',
              transition: 'background 0.2s',
            }}
            onClick={() => setTab('data')}
            disabled={tab === 'data'}
          >
            Data
          </button>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            background: '#181a20',
          }}
        >
          {tab === 'map' ? (
            <MapView geojson={geojson} loading={loading} error={error} />
          ) : (
            <FeatureTable
              geojson={geojson}
              filters={filters}
              setFilters={setFilters}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
