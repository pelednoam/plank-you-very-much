import { useMetricsStore } from '@/store/metricsStore';
import type { BodyMetrics } from '@/types';
import dayjs from 'dayjs';

// Helper to reset store before each test
const resetStore = () => useMetricsStore.setState({
    metrics: [],
    // Explicitly provide all functions from the state interface
    addMetric: useMetricsStore.getState().addMetric,
    importMetrics: useMetricsStore.getState().importMetrics,
    getLatestMetric: useMetricsStore.getState().getLatestMetric,
    getMetricsSortedByDate: useMetricsStore.getState().getMetricsSortedByDate,
});

describe('useMetricsStore', () => {
    beforeEach(() => {
        resetStore();
    });

    it('should initialize with empty metrics', () => {
        const { metrics } = useMetricsStore.getState();
        expect(metrics).toEqual([]);
    });

    describe('addMetric', () => {
        it('should add a single metric', () => {
            const newMetric: BodyMetrics = {
                date: dayjs().toISOString(),
                weightKg: 75,
                source: 'MANUAL',
            };
            useMetricsStore.getState().addMetric(newMetric);
            const { metrics } = useMetricsStore.getState();
            expect(metrics).toHaveLength(1);
            expect(metrics[0]).toEqual(newMetric);
        });
    });

    describe('importMetrics', () => {
        const metric1: BodyMetrics = { date: '2024-01-10T10:00:00Z', weightKg: 75, source: 'WYZE' };
        const metric2: BodyMetrics = { date: '2024-01-11T10:00:00Z', weightKg: 74.8, source: 'WYZE' };
        const metric3_later: BodyMetrics = { date: '2024-01-10T12:00:00Z', weightKg: 75.1, source: 'WYZE' }; // Same date, later time
        const metric4: BodyMetrics = { date: '2024-01-12T10:00:00Z', weightKg: 74.5, source: 'WYZE' };

        it('should add new metrics to an empty store', () => {
            const { added, duplicates } = useMetricsStore.getState().importMetrics([metric1, metric2]);
            const { metrics } = useMetricsStore.getState();
            expect(added).toBe(2);
            expect(duplicates).toBe(0);
            expect(metrics).toHaveLength(2);
            expect(metrics).toEqual([metric1, metric2]); // Should be sorted by date asc
        });

        it('should add new metrics and ignore older duplicates for the same date', () => {
            // Pre-populate with metric1
            useMetricsStore.setState({ metrics: [metric1] });
            
            // Import metric2 (new) and metric1 again (duplicate)
            const { added, duplicates } = useMetricsStore.getState().importMetrics([metric1, metric2]);
            const { metrics } = useMetricsStore.getState();

            expect(added).toBe(1); // Only metric2 should be counted as added
            expect(duplicates).toBe(1); // metric1 is a duplicate
            expect(metrics).toHaveLength(2);
            expect(metrics).toEqual([metric1, metric2]);
        });

        it('should add new metrics and replace older entries with newer ones for the same date', () => {
            // Pre-populate with metric1 (earlier time)
            useMetricsStore.setState({ metrics: [metric1] });

            // Import metric3_later (same date, later time) and metric4 (new date)
            const { added, duplicates } = useMetricsStore.getState().importMetrics([metric3_later, metric4]);
            const { metrics } = useMetricsStore.getState();

            expect(added).toBe(1); // metric4 is added
            expect(duplicates).toBe(0); // metric3_later replaces metric1, not counted as duplicate
            expect(metrics).toHaveLength(2); // Replaced metric1, added metric4
            // Expect the store to contain the later metric for 2024-01-10
            expect(metrics).toEqual([metric3_later, metric4]); 
        });

        it('should correctly handle mixed import with existing data, new data, duplicates, and replacements', () => {
            // Pre-populate with metric1 and metric4
            useMetricsStore.setState({ metrics: [metric1, metric4] });

            // Import metric1 (duplicate), metric2 (new), metric3_later (replacement)
            const { added, duplicates } = useMetricsStore.getState().importMetrics([
                metric1, // Duplicate of existing
                metric2, // New date
                metric3_later, // Same date as metric1, but later -> replaces metric1
            ]);
            const { metrics } = useMetricsStore.getState();

            expect(added).toBe(1); // metric2 added
            expect(duplicates).toBe(1); // metric1 duplicate
            expect(metrics).toHaveLength(3); // metric1 replaced by metric3, metric2 added, metric4 kept
            // Expected final sorted state: metric3_later, metric2, metric4
            expect(metrics).toEqual([metric3_later, metric2, metric4]); 
        });
    });
}); 