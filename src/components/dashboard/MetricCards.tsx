'use client'; // Needed for Zustand hook

import React from 'react';
import { useMetricsStore } from '@/store/metricsStore';
import type { BodyMetrics } from '@/types';

// Helper to format metric values
const formatMetric = (value: number | undefined, unit: string, precision = 1) => {
  return value !== undefined ? `${value.toFixed(precision)} ${unit}` : 'N/A';
};

// TODO: Fetch and display key metrics (Weight, BF%, Muscle Mass)
export default function MetricCards() {
  // Use shallow comparison for performance if selecting multiple values
  const latestMetric = useMetricsStore((state) => state.getLatestMetric());

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Weight Card */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-sm font-medium text-gray-500 truncate">Latest Weight</h3>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {formatMetric(latestMetric?.weightKg, 'kg')}
        </p>
        {/* Optional: Add date of last metric */}
        {latestMetric?.date && (
           <p className="text-xs text-gray-500 mt-1">As of {new Date(latestMetric.date).toLocaleDateString()}</p>
        )}
      </div>

      {/* Body Fat Card */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-sm font-medium text-gray-500 truncate">Body Fat %</h3>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {formatMetric(latestMetric?.bodyFatPct, '%')}
        </p>
         {latestMetric?.date && (
           <p className="text-xs text-gray-500 mt-1">As of {new Date(latestMetric.date).toLocaleDateString()}</p>
        )}
     </div>

      {/* Placeholder for Muscle Mass or other metric */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-sm font-medium text-gray-500 truncate">Muscle Mass</h3>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {formatMetric(latestMetric?.muscleMassKg, 'kg')}
        </p>
         {latestMetric?.date && (
           <p className="text-xs text-gray-500 mt-1">As of {new Date(latestMetric.date).toLocaleDateString()}</p>
        )}
     </div>
    </div>
  );
} 