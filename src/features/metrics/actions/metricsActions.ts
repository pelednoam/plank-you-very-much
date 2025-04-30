'use server';

import type { BodyMetrics } from '@/types';

/**
 * Server Action to save new body metrics.
 * Called by the offline sync manager.
 * Replace with actual database update logic.
 */
export const addMetricServer = async (
    metricData: BodyMetrics
): Promise<{ success: boolean; error?: string }> => {
    console.log(`[Server Action Placeholder] addMetricServer called for date: ${metricData.date}`);
    // TODO: Implement actual database/KV insert logic here
    // Example: await db.addMetric(userId, metricData);
    await new Promise(resolve => setTimeout(resolve, 50)); 

    // Simulate potential failure for testing retries
    if (metricData.notes === 'fail-metric-server') {
         console.warn('[Server Action Placeholder] Simulating addMetric failure.');
         return { success: false, error: 'Simulated addMetric server failure' };
    }
    
    return { success: true };
}; 