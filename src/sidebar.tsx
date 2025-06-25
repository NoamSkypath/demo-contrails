import React, { useCallback } from 'react';
import type { RequestMetadata } from './api/regions';
import type { RegionFeatureCollection, Filters } from './types';
import { area } from '@turf/turf';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const FLIGHT_LEVELS = Array.from({ length: 18 }, (_, i) => 270 + i * 10);

const Sidebar: React.FC<{
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onApplyFilters?: (filters: Filters) => void;
  meta?: RequestMetadata | null;
  geojson?: RegionFeatureCollection | null;
}> = ({ filters, setFilters, onApplyFilters, meta, geojson }) => {
  // Helper to build the filters object for request (omit aircraftClass if not selected)
  const getRequestFilters = useCallback(
    (f: Filters) => {
      const req: any = { ...f };
      if (!req.aircraftClass) req.aircraftClass = undefined;
      // Convert selectedFlightLevels to comma-separated string
      req.flightLevel = f.flightLevel.length > 0 ? f.flightLevel : '';
      return req;
    },
    [filters.flightLevel]
  );

  // Call API onBlur/onChange
  const handleInputBlur = useCallback(
    (overrideFilters?: Filters) => {
      const useFilters = overrideFilters || filters;
      if (!useFilters.time) return;
      const reqFilters = getRequestFilters(useFilters);
      console.debug('Sending filters to API:', reqFilters);
      onApplyFilters?.(reqFilters);
    },
    [filters, getRequestFilters, onApplyFilters]
  );
  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFilters((prev) => {
        const next = { ...prev, [name]: value };
        setTimeout(() => {
          const reqFilters = getRequestFilters(next);
          console.debug('Sending filters to API:', reqFilters);
          onApplyFilters?.(reqFilters);
        }, 0);
        return next;
      });
    },
    [getRequestFilters, onApplyFilters]
  );
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, multiple, options } = e.target as HTMLSelectElement;
      if (name === 'time') {
        setFilters((prev) => ({ ...prev, [name]: value }));
      } else if (name === 'flightLevel' && multiple) {
        // Multi-select for flight levels
        const selected: string[] = [];
        for (let i = 0; i < options.length; i++) {
          if (options[i].selected) selected.push(options[i].value);
        }
        setFilters((prev) => ({ ...prev, flightLevel: selected.join(',') }));
      } else {
        setFilters((prev) => ({ ...prev, [name]: value }));
      }
    },
    []
  );

  // Feature stats
  const featureCount = geojson?.features.length ?? 0;
  const flightLevels = geojson
    ? Array.from(
        new Set(geojson.features.map((f) => f.properties.flight_level))
      ).filter(Boolean)
    : [];
  const aircraftClasses = geojson
    ? Array.from(
        new Set(geojson.features.map((f) => f.properties.aircraft_class))
      ).filter(Boolean)
    : [];

  // Format date as UTC for sidebar stats using dayjs
  function formatUtc(val: string): string {
    if (!val) return '-';
    const d = dayjs.utc(val);
    if (!d.isValid()) return val;
    return d.format('YYYY-MM-DD HH:mm [UTC]');
  }

  // Min/max for forecast_reference_time and time
  function getMinMax(values: string[]) {
    if (!values.length) return { min: '-', max: '-' };
    const sorted = values.slice().sort();
    return {
      min: formatUtc(sorted[0]),
      max: formatUtc(sorted[sorted.length - 1]),
    };
  }
  const forecastTimes = geojson
    ? geojson.features
        .map((f) => f.properties.forecast_reference_time)
        .filter(Boolean)
    : [];
  const times = geojson
    ? geojson.features.map((f) => f.properties.time).filter(Boolean)
    : [];
  const forecastRefStats = getMinMax(forecastTimes);
  const timeStats = getMinMax(times);

  function formatBytes(bytes: number) {
    if (!bytes && bytes !== 0) return '-';
    const mb = bytes / 1024 / 1024;
    return `${bytes} bytes (${mb.toFixed(2)} MB)`;
  }

  const EARTH_SURFACE_KM2 = 510072000; // km²
  // Calculate total area in m²
  const totalAreaM2 = geojson
    ? geojson.features.reduce((sum, f) => sum + area(f), 0)
    : 0;
  // Convert to km²
  const totalAreaKm2 = totalAreaM2 / 1e6;
  // Calculate percentage
  const coveragePercent = (totalAreaKm2 / EARTH_SURFACE_KM2) * 100;

  // Helper to decode the time param in a URL for display
  function decodeTimeInUrl(url: string): string {
    return url.replace(
      /([?&]time=)([^&]+)/,
      (match, p1, p2) => p1 + decodeURIComponent(p2)
    );
  }

  // Helper to extract date and hour from filters.time (in UTC)
  const getDateFromTime = (time: string) => {
    if (!time) return '';
    const d = dayjs.utc(time);
    return d.isValid() ? d.format('YYYY-MM-DD') : '';
  };
  const getHourFromTime = (time: string) => {
    if (!time) return '';
    const d = dayjs.utc(time);
    return d.isValid() ? d.format('HH') : '';
  };
  const date = getDateFromTime(filters.time);
  const hour = getHourFromTime(filters.time);

  // Handler for date/hour change
  const handleDateHourChange = (which: 'date' | 'hour', value: string) => {
    let newDate = which === 'date' ? value : date;
    let newHour = which === 'hour' ? value : hour;
    let newTime = '';
    if (newDate && newHour) {
      const d = dayjs.utc(`${newDate}T${newHour}:00:00Z`);
      newTime = d.isValid() ? d.toISOString() : '';
    }
    const newFilters = { ...filters, time: newTime };
    setFilters(newFilters);
    if (newDate && newHour && newTime && onApplyFilters) {
      onApplyFilters(newFilters);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#23272f',
        borderRadius: 0,
        boxShadow: 'none',
        padding: 0,
      }}
    >
      <div
        style={{
          padding: '14px 10px 8px 10px',
          borderBottom: '1px solid #333',
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            margin: 0,
            marginBottom: 8,
            letterSpacing: 0.2,
            color: '#fff',
          }}
        >
          Filters
        </h2>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          autoComplete='off'
          onSubmit={(e) => e.preventDefault()}
        >
          <label
            style={{
              fontWeight: 500,
              color: '#eee',
              fontSize: 13,
              marginBottom: 2,
            }}
          >
            Time <span style={{ color: '#ff6b6b' }}>*</span>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginTop: 2,
              }}
            >
              <input
                type='date'
                name='date'
                value={date}
                onChange={(e) => handleDateHourChange('date', e.target.value)}
                required
                style={{
                  padding: 5,
                  borderRadius: 3,
                  border: '1px solid #444',
                  fontSize: 13,
                  background: '#181a20',
                  color: '#fff',
                }}
              />
              <select
                name='hour'
                value={hour}
                onChange={(e) => handleDateHourChange('hour', e.target.value)}
                style={{
                  padding: 5,
                  borderRadius: 3,
                  border: '1px solid #444',
                  fontSize: 13,
                  background: '#181a20',
                  color: '#fff',
                }}
              >
                <option value=''>--</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={String(i).padStart(2, '0')}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <span style={{ color: '#aaa', fontSize: 13 }}>UTC</span>
            </div>
            <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
              Value must be a full hour (minutes 00), interpreted as UTC.
            </div>
            {filters.time && (
              <div style={{ color: '#4fc3f7', fontSize: 12, marginTop: 2 }}>
                Selected time in UTC:{' '}
                {dayjs.utc(filters.time).format('YYYY-MM-DD HH:mm [UTC]')}
              </div>
            )}
          </label>
          <label
            style={{
              fontWeight: 500,
              color: '#eee',
              fontSize: 13,
              marginBottom: 2,
            }}
          >
            Flight Level (multi-select)
            <select
              name='flightLevel'
              multiple
              value={filters.flightLevel.split(',')}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: 5,
                borderRadius: 3,
                border: '1px solid #444',
                marginTop: 2,
                fontSize: 13,
                background: '#181a20',
                color: '#fff',
                minHeight: 80,
              }}
            >
              {FLIGHT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
              Hold Cmd (Mac) or Ctrl (Windows) to select multiple flight levels.
            </div>
          </label>
          <label
            style={{
              fontWeight: 500,
              color: '#eee',
              fontSize: 13,
              marginBottom: 2,
            }}
          >
            Threshold
            <select
              name='threshold'
              value={filters.threshold}
              onChange={handleSelectChange}
              style={{
                width: '100%',
                padding: 5,
                borderRadius: 3,
                border: '1px solid #444',
                marginTop: 2,
                fontSize: 13,
                background: '#181a20',
                color: '#fff',
              }}
            >
              <option value=''>Any</option>
              <option value='1'>1 (least severe)</option>
              <option value='2'>2</option>
              <option value='3'>3</option>
              <option value='4'>4 (most severe)</option>
            </select>
            <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
              Minimum severity to display.
            </div>
          </label>
          <label
            style={{
              fontWeight: 500,
              color: '#eee',
              fontSize: 13,
              marginBottom: 2,
            }}
          >
            Aircraft Class
            <select
              name='aircraftClass'
              value='default'
              disabled
              style={{
                width: '100%',
                padding: 5,
                borderRadius: 3,
                border: '1px solid #444',
                marginTop: 2,
                fontSize: 13,
                background: '#181a20',
                color: '#fff',
              }}
            >
              <option value='default'>Default</option>
            </select>
            <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
              Only the Default class is currently supported by the API.
            </div>
          </label>
        </form>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 0 10px' }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            margin: '0 0 6px 0',
            letterSpacing: 0.1,
            color: '#fff',
          }}
        >
          Request & Data Info
        </h3>
        {meta && (
          <div
            style={{
              background: '#23272f',
              border: '1px solid #333',
              borderRadius: 4,
              fontSize: 12,
              color: '#eee',
              padding: '7px 8px',
              marginBottom: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              wordBreak: 'break-all',
            }}
          >
            <div>
              <strong>Status:</strong> {meta.status}
            </div>
            <div>
              <strong>Duration:</strong> {meta.duration} ms
            </div>
            <div>
              <strong>Request size:</strong> {formatBytes(meta.requestSize)}
            </div>
            <div>
              <strong>Response size:</strong> {formatBytes(meta.responseSize)}
            </div>
            <div>
              <strong>URL:</strong> {decodeTimeInUrl(meta.url)}
            </div>
          </div>
        )}
        <div
          style={{
            fontSize: 12,
            color: '#eee',
            background: '#181a20',
            border: '1px solid #333',
            borderRadius: 4,
            padding: '7px 8px',
            marginBottom: 6,
          }}
        >
          <div>
            <strong>Features:</strong> {featureCount}
          </div>
          <div>
            <strong>Coverage:</strong> {coveragePercent.toFixed(2)}% of Earth's
            surface
          </div>
          <div>
            <strong>Flight Levels:</strong> {flightLevels.join(', ') || '-'}
          </div>
          <div>
            <strong>Aircraft Classes:</strong>{' '}
            {aircraftClasses.join(', ') || '-'}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Forecast Ref Time:</strong>
            <br />
            min {forecastRefStats.min}
            <br />
            max {forecastRefStats.max}
          </div>
          <div>
            <strong>Feature Time:</strong>
            <br />
            min {timeStats.min}
            <br />
            max {timeStats.max}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Sidebar);
