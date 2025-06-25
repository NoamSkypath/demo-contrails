import React from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

interface FeatureTooltipProps {
  properties: {
    flight_level?: number;
    threshold?: number;
    time?: string;
    forecast_reference_time?: string;
    aircraft_class?: string;
    [key: string]: any;
  };
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

const FeatureTooltip: React.FC<FeatureTooltipProps> = ({ properties }) => {
  if (!properties) return null;
  return (
    <div
      style={{
        color: 'black',
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: 8,
        fontSize: 13,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div>
        <strong>Flight Level:</strong> {properties.flight_level}
      </div>
      <div>
        <strong>Threshold:</strong> {properties.threshold}
      </div>
      <div>
        <strong>Time:</strong> {formatDate(properties.time || '')}
      </div>
      <div>
        <strong>Forecast Ref Time:</strong>{' '}
        {formatDate(properties.forecast_reference_time || '')}
      </div>
      <div>
        <strong>Aircraft Class:</strong> {properties.aircraft_class}
      </div>
    </div>
  );
};

export default FeatureTooltip;
