'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';

// Helper function to get the latest metric
const getLatestMetric = (metrics: import('@/lib/types').BodyMetrics[]) => {
  if (!metrics || metrics.length === 0) return null;
  // Sort by date descending and return the first element
  return [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

export const MetricCards = () => {
  const { bodyMetrics, isHydrated } = useAppStore((state) => ({
    bodyMetrics: state.bodyMetrics,
    isHydrated: state.isHydrated,
  }));

  const renderLoadingCard = () => (
    <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 mb-1">Loading...</h3>
      <div className="text-2xl font-bold text-gray-400 animate-pulse">...</div>
    </div>
  );

  if (!isHydrated) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {renderLoadingCard()}
        {renderLoadingCard()}
      </div>
    );
  }

  const latestMetric = getLatestMetric(bodyMetrics);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Weight Card */}
      <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Weight</h3>
        <div className="text-2xl font-bold">
          {latestMetric ? `${latestMetric.weightKg.toFixed(1)} kg` : 'N/A'}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Latest measurement
        </p>
      </div>

      {/* Body Fat Card */}
      <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Body Fat</h3>
        <div className="text-2xl font-bold">
          {latestMetric ? `${latestMetric.bodyFatPct.toFixed(1)} %` : 'N/A'}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Latest measurement
        </p>
      </div>

      {/* TODO: Add cards for Muscle Mass, Visceral Fat, Workout Adherence etc. */}
    </div>
  );
}; 