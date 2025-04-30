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
    'use server';
    console.log(`[Server Action] Attempting to add metric for date ${metricData.date}...`);
    
    // --- Placeholder Logic --- 
    // const userId = await getCurrentUserId(); 
    // if (!userId) return { success: false, error: 'Unauthorized' };
    
    // Associate metricData with userId before saving
    // await db.metrics.create({ data: { ...metricData, userId } });
    
    await new Promise(resolve => setTimeout(resolve, 120)); 
    if (Math.random() < 0.15) { // 15% failure chance
         console.error(`[Server Action] Simulated failure adding metric for ${metricData.date}`);
         return { success: false, error: 'Simulated DB Error' };
    }
    // --- End Placeholder Logic --- 
    
    console.log(`[Server Action] Successfully added metric for ${metricData.date} (simulated).`);
    return { success: true };
}; 