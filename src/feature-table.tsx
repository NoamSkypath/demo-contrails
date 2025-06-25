import React, { useState } from 'react';
import type { RegionFeatureCollection, Filters } from './types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

interface FeatureTableProps {
  geojson: RegionFeatureCollection | null;
  filters: Filters;
  setFilters: (f: Filters) => void;
}

function getAllPropertyKeys(geojson: RegionFeatureCollection | null): string[] {
  if (!geojson || !geojson.features.length) return [];
  const keys = new Set<string>();
  geojson.features.forEach((f) => {
    Object.keys(f.properties).forEach((k) => keys.add(k));
  });
  return Array.from(keys);
}

function toCSV(rows: any[], columns: string[]): string {
  const header = [...columns, 'polygon_count'];
  const csvRows = [header.join(',')];
  for (const row of rows) {
    const vals = columns.map((col) => JSON.stringify((row as any)[col] ?? ''));
    vals.push(row.polygon_count);
    csvRows.push(vals.join(','));
  }
  return csvRows.join('\n');
}

function compare(a: any, b: any) {
  // Try number comparison first
  const aNum = Number(a),
    bNum = Number(b);
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
  // Fallback to string
  return String(a).localeCompare(String(b));
}

function isIsoDateString(val: any): boolean {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val);
}

function formatDate(val: string): string {
  if (!isIsoDateString(val)) return val;
  const d = dayjs.utc(val);
  if (!d.isValid()) return val;
  return d.format('YYYY-MM-DD HH:mm [UTC]');
}

const FeatureTable: React.FC<FeatureTableProps> = ({
  geojson,
  filters,
  setFilters,
}) => {
  const columns = getAllPropertyKeys(geojson);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const rows = geojson
    ? geojson.features.map((f) => ({
        ...f.properties,
        polygon_count: Array.isArray(f.geometry.coordinates)
          ? f.geometry.coordinates.length
          : 0,
      }))
    : [];

  const sortedRows = React.useMemo(() => {
    if (!sortColumn) return rows;
    return [...rows].sort((a, b) => {
      const cmp = compare((a as any)[sortColumn], (b as any)[sortColumn]);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const handleDownloadCSV = () => {
    const csv = toCSV(sortedRows, columns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contrails-data.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  if (!geojson || !geojson.features.length) {
    return (
      <div style={{ color: '#aaa', padding: 32, textAlign: 'center' }}>
        No data to display.
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '12px 16px',
          background: '#23272f',
          borderBottom: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <button
          onClick={handleDownloadCSV}
          style={{
            background: '#4fc3f7',
            color: '#181a20',
            border: 'none',
            borderRadius: 4,
            padding: '6px 18px',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          Download CSV
        </button>
        <span style={{ color: '#aaa', fontSize: 13 }}>
          Showing {sortedRows.length} features
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#181a20' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            color: '#eee',
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: '#23272f',
                    borderBottom: '1px solid #333',
                    padding: '6px 8px',
                    fontWeight: 600,
                    zIndex: 1,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {col}
                  {sortColumn === col && (
                    <span style={{ marginLeft: 4, fontSize: 11 }}>
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
              ))}
              <th
                onClick={() => handleSort('polygon_count')}
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#23272f',
                  borderBottom: '1px solid #333',
                  padding: '6px 8px',
                  fontWeight: 600,
                  zIndex: 1,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Polygon Count
                {sortColumn === 'polygon_count' && (
                  <span style={{ marginLeft: 4, fontSize: 11 }}>
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? '#181a20' : '#23272f' }}
              >
                {columns.map((col) => {
                  const raw = (row as any)[col];
                  // If column name includes 'time' or 'date' and value is ISO, format it
                  const isDateCol =
                    /time|date/i.test(col) && isIsoDateString(raw);
                  return (
                    <td
                      key={col}
                      style={{
                        padding: '6px 8px',
                        borderBottom: '1px solid #222',
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={String(raw ?? '')}
                    >
                      {isDateCol ? formatDate(raw) : String(raw ?? '')}
                    </td>
                  );
                })}
                <td
                  style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid #222',
                    textAlign: 'center',
                  }}
                >
                  {row.polygon_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeatureTable;
