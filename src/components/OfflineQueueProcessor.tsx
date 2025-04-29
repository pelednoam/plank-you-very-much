"use client";

import { useEffect, useState, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineQueueStore, QueuedAction } from '@/store/offlineQueueStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useNutritionStore } from '@/store/nutritionStore'; // Import nutrition store
import { toast } from 'sonner';

// Placeholder for actual API calls - replace with real implementation
async function syncActionToServer(action: QueuedAction): Promise<{ success: boolean; response?: any }> {
    console.log(`[API Placeholder] Attempting to sync ${action.type} (${action.id})...`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

    // Simulate random success/failure (e.g., 80% success rate)
    const success = Math.random() < 0.8;

    if (success) {
        console.log(`[API Placeholder] Sync SUCCESS for ${action.type} (${action.id})`);
        // Simulate a potential server response (e.g., returning a permanent ID)
        if (action.type === 'nutrition/addMeal') {
            return { success: true, response: { id: `server-${action.metadata?.tempId || action.id}`, timestamp: new Date().toISOString() } };
        }
        return { success: true };
    } else {
        console.error(`[API Placeholder] Sync FAILED for ${action.type} (${action.id})`);
        return { success: false, response: { error: 'Simulated network error' } };
    }
}

/**
 * This component handles processing the offline action queue when the app comes back online.
 * It runs in the background and doesn't render anything itself.
 */
export function OfflineQueueProcessor() {
    const isOnline = useOnlineStatus();
    const { getActions, removeAction } = useOfflineQueueStore((state) => ({
        getActions: state.getActions,
        removeAction: state.removeAction,
    }));
    // Get the specific update functions from each store
    const plannerApplyResult = usePlannerStore((state) => state._applyQueuedUpdate);
    const nutritionApplyResult = useNutritionStore((state) => state._applyQueuedUpdate);

    const [isProcessing, setIsProcessing] = useState(false);

    const processQueue = useCallback(async () => {
        if (isProcessing || !isOnline) {
            // console.log('[Queue Processor] Skipping processing (already processing or offline).');
            return;
        }

        const actionsToProcess = getActions();
        if (actionsToProcess.length === 0) {
            return;
        }

        console.log(`[Queue Processor] Starting processing for ${actionsToProcess.length} actions.`);
        setIsProcessing(true);
        toast.info('Syncing offline changes...');

        let totalSuccessCount = 0;
        let totalFailureCount = 0;

        // Process actions one by one
        for (const action of actionsToProcess) {
            console.log(`[Queue Processor] Processing action: ${action.type} (${action.id})`);
            let syncSuccess = false;
            let serverResponse: any = null;

            try {
                // 1. Attempt to sync action to server
                const syncResult = await syncActionToServer(action);
                syncSuccess = syncResult.success;
                serverResponse = syncResult.response;

                // 2. Apply the result to the relevant local store
                const storeDomain = action.type.split('/')[0];
                switch (storeDomain) {
                    case 'planner':
                        // TODO: Update plannerStore's _applyQueuedUpdate signature similarly
                        // plannerApplyResult(action, syncSuccess, serverResponse);
                        console.warn('[Queue Processor] Planner store integration needs update for sync results.');
                        break;
                    case 'nutrition':
                        nutritionApplyResult(action, syncSuccess, serverResponse);
                        break;
                    default:
                        console.warn(`[Queue Processor] Unknown action domain: ${storeDomain} for type: ${action.type}`);
                        // Don't count as failure, just skip applying result
                        break;
                }

                // 3. Remove action from queue AFTER attempt & applying result
                removeAction(action.id);
                
                if (syncSuccess) {
                    totalSuccessCount++;
                    console.log(`[Queue Processor] Action ${action.id} processed successfully.`);
                } else {
                    totalFailureCount++;
                    console.log(`[Queue Processor] Action ${action.id} failed to sync.`);
                     toast.error("Sync Error", { description: `Failed to sync action: ${action.type}. State updated to reflect error.` });
                    // Decide on retry strategy later? For now, it's removed but marked as error in the store.
                }

            } catch (error) {
                // This catches errors in the processor logic itself or the applyResult functions
                console.error(`[Queue Processor] Internal error processing action ${action.id} (${action.type}):`, error);
                totalFailureCount++; // Count internal errors as failures too
                // Do NOT remove the action from the queue if the processor itself failed
                // It will be retried next time.
                toast.error("Processing Error", { description: `Internal error processing action: ${action.type}. It will be retried.` });
                break; // Stop processing queue on internal error to retry later
            }
        }

        setIsProcessing(false);
        // Update toast summary
        if (totalFailureCount > 0) {
            toast.warning("Sync Complete (with errors)", { description: `${totalSuccessCount} changes synced, ${totalFailureCount} failed.` });
        } else if (totalSuccessCount > 0) {
            toast.success("Offline changes synced successfully!");
        } else {
            console.log("[Queue Processor] Sync process finished (no user actions or only unknown actions).");
        }

    }, [isProcessing, isOnline, getActions, removeAction, plannerApplyResult, nutritionApplyResult]);

    useEffect(() => {
        // Trigger processing when coming online
        if (isOnline && !isProcessing && getActions().length > 0) {
            console.log('[Queue Processor] App is online, processing queue...');
            const timer = setTimeout(() => processQueue(), 1000); // Short delay
            return () => clearTimeout(timer);
        }
    }, [isOnline, isProcessing, getActions, processQueue]);

    // This component doesn't render anything
    return null;
} 