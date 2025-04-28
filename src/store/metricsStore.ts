import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BodyMetrics } from '@/types';
import dayjs from 'dayjs'; // For date sorting
import { createIdbStorage } from '@/lib/idbStorage';

interface MetricsState {
  metrics: BodyMetrics[];
  addMetric: (metricData: BodyMetrics) => void;
  // Maybe add update/delete if needed, but often metrics are append-only
  getLatestMetric: () => BodyMetrics | undefined;
  getMetricsSortedByDate: (order?: 'asc' | 'desc') => BodyMetrics[];
}

export const useMetricsStore = create(
  persist<MetricsState>(
    (set, get) => ({
      metrics: [], // Start with empty historical data

      addMetric: (metricData) => {
        // Optional: Prevent duplicates for the exact same date/time if necessary
        set((state) => ({ metrics: [...state.metrics, metricData] }));
        // Consider sorting after adding, or sort when retrieving
      },

      getMetricsSortedByDate: (order = 'desc') => {
        const sorted = [...get().metrics].sort((a, b) => {
          const dateA = dayjs(a.date);
          const dateB = dayjs(b.date);
          return order === 'desc' ? dateB.diff(dateA) : dateA.diff(dateB);
        });
        return sorted;
      },

      getLatestMetric: () => {
        const sortedMetrics = get().getMetricsSortedByDate('desc');
        return sortedMetrics.length > 0 ? sortedMetrics[0] : undefined;
      },

      // TODO: Add persistence logic

    }),
    {
      name: 'metrics-storage', // Unique name for this store
      storage: createIdbStorage<MetricsState>(), // Use IDB storage
    }
  )
);

// Selectors
export const selectAllMetrics = (state: MetricsState) => state.metrics;
export const selectLatestWeight = (state: MetricsState) => state.getLatestMetric()?.weightKg;
export const selectLatestBodyFat = (state: MetricsState) => state.getLatestMetric()?.bodyFatPct; 