import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BodyMetrics } from '@/types';
import dayjs from 'dayjs'; // For date sorting
import { createIdbStorage } from '@/lib/idbStorage';

interface MetricsState {
  metrics: BodyMetrics[];
  _hasHydrated: boolean; // <-- Add hydration status flag
  addMetric: (metricData: BodyMetrics) => void;
  importMetrics: (importedMetrics: BodyMetrics[]) => { added: number; duplicates: number };
  // Maybe add update/delete if needed, but often metrics are append-only
  getLatestMetric: () => BodyMetrics | undefined;
  getMetricsSortedByDate: (order?: 'asc' | 'desc') => BodyMetrics[];
}

export const useMetricsStore = create(
  persist<MetricsState>(
    (set, get) => ({
      metrics: [], // Start with empty historical data
      _hasHydrated: false, // <-- Initialize hydration flag

      addMetric: (metricData) => {
        // Optional: Prevent duplicates for the exact same date/time if necessary
        set((state) => ({ metrics: [...state.metrics, metricData] }));
        // Consider sorting after adding, or sort when retrieving
      },

      importMetrics: (importedMetrics) => {
        const currentMetrics = get().metrics;
        const metricsMap = new Map<string, BodyMetrics>(); // Use date string as key for deduplication

        // Populate map with existing metrics, keeping the latest entry per date
        currentMetrics.forEach(m => {
            // Normalize date to YYYY-MM-DD for accurate daily comparison
            const dateKey = dayjs(m.date).format('YYYY-MM-DD'); 
            const existing = metricsMap.get(dateKey);
            // Keep the one with the latest timestamp for that specific day
            if (!existing || dayjs(m.date).isAfter(dayjs(existing.date))) {
                metricsMap.set(dateKey, m);
            }
        });

        let addedCount = 0;
        let duplicateCount = 0;

        // Process imported metrics
        importedMetrics.forEach(m => {
            const dateKey = dayjs(m.date).format('YYYY-MM-DD'); 
            const existing = metricsMap.get(dateKey);

            if (!existing) {
                // Definitely new date, add it and count as added
                metricsMap.set(dateKey, m);
                addedCount++;
            } else if (dayjs(m.date).isAfter(dayjs(existing.date))) {
                // Same date exists, but this one is newer, replace it
                // Do NOT count as added
                metricsMap.set(dateKey, m);
            } else {
                // Same date exists, and this one is older or same time, count as duplicate/ignored
                duplicateCount++;
            }
        });

        // Convert map back to array and sort by full timestamp
        const updatedMetrics = Array.from(metricsMap.values()).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

        set({ metrics: updatedMetrics });
        console.log(`[Metrics Import] Added: ${addedCount}, Duplicates/Older Ignored: ${duplicateCount}`);
        return { added: addedCount, duplicates: duplicateCount };
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
      // Add partialize to only store the 'metrics' array, use 'as any' to bypass strict type check
      partialize: (state) => ({ 
          metrics: state.metrics 
      }) as any, 
      // Add onRehydrateStorage to set the flag
      onRehydrateStorage: () => {
        useMetricsStore.setState({ _hasHydrated: true });
        console.log("MetricsStore: Rehydration process finished.");
      },
      skipHydration: typeof window === 'undefined', // Skip hydration on server
    }
  )
);

// Selector for hydration status
export const selectMetricsHasHydrated = (state: MetricsState) => state._hasHydrated;

// Selectors
export const selectAllMetrics = (state: MetricsState) => state.metrics;
export const selectLatestWeight = (state: MetricsState) => state.getLatestMetric()?.weightKg;
export const selectLatestBodyFat = (state: MetricsState) => state.getLatestMetric()?.bodyFatPct; 