import { useOfflineQueueStore, type QueuedAction } from "@/store/offlineQueueStore";
import { usePlannerStore } from "@/store/plannerStore";
// Import the placeholder server actions
import { updateWorkoutCompletionServer } from "@/features/planner/actions/plannerActions";
import { addMealServer, deleteMealServer } from "@/features/nutrition/actions/nutritionActions";
import { addMetricServer } from "@/features/metrics/actions/metricsActions";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000 * 10; // 10 seconds delay before retrying (can be adjusted)

/**
 * Processes the offline action queue, attempting to sync actions with the backend.
 */
export const processOfflineQueue = async () => {
    // Get actions AND the setter to update metadata
    const { pendingActions, removeAction, updateActionMetadata } = useOfflineQueueStore.getState();
    
    // Use pendingActions directly instead of getActions()
    if (pendingActions.length === 0) {
        console.log("[Sync Manager] No actions in queue to process.");
        return;
    }

    console.log(`[Sync Manager] Processing ${pendingActions.length} actions...`);
    const now = Date.now(); // Define now here

    for (const action of pendingActions) {
        // Define variables inside the loop scope
        const retryCount = action.metadata?.retryCount ?? 0;
        const lastAttempt = action.metadata?.lastAttemptTimestamp ?? 0;
        const failed = action.metadata?.failed ?? false;

        // Skip actions marked as permanently failed or if retrying too soon
        if (failed) {
             console.log(`[Sync Manager] Skipping permanently failed action: ${action.type} (ID: ${action.id})`);
             continue;
        }
        if (now < lastAttempt + RETRY_DELAY_MS && retryCount > 0) {
            console.log(`[Sync Manager] Delaying retry for action ${action.id} (${action.type}). Last attempt: ${new Date(lastAttempt).toISOString()}`);
            continue;
        }

        console.log(`[Sync Manager] Processing action: ${action.type} (ID: ${action.id}), Retry: ${retryCount}`);
        let syncResult: { success: boolean; error?: string } = { success: false, error: 'processing_not_attempted' }; // Default result

        try {
            // Ensure payload exists and is an object for actions that need it
            const payload = (action.payload && typeof action.payload === 'object') ? action.payload : {};
            
            switch (action.type) {
                case 'planner/markComplete': {
                    // Validate payload structure
                    const { workoutId, isComplete, completedAt } = payload as { workoutId?: string; isComplete?: boolean; completedAt?: string | null };
                    if (typeof workoutId !== 'string' || typeof isComplete !== 'boolean') {
                        throw new Error('Invalid payload for planner/markComplete');
                    }
                    console.log(`[Sync Manager] Calling server action updateWorkoutCompletionServer for ${workoutId}`);
                    syncResult = await updateWorkoutCompletionServer(workoutId, isComplete, completedAt);
                    break;
                }
                case 'nutrition/addMeal': {
                    // Assume payload is Meal data (without ID)
                    // Add validation if necessary
                    const mealData = payload as any; // Cast for now, add type check later
                     if (!mealData || typeof mealData !== 'object') {
                         throw new Error('Invalid payload for nutrition/addMeal');
                     }
                    console.log(`[Sync Manager] Calling server action addMealServer`);
                    // We don't strictly need the returned mealId here, just success/fail
                    syncResult = await addMealServer(mealData);
                    break;
                }
                case 'nutrition/deleteMeal': {
                    const { mealId } = payload as { mealId?: string };
                     if (typeof mealId !== 'string') {
                         throw new Error('Invalid payload for nutrition/deleteMeal');
                     }
                    console.log(`[Sync Manager] Calling server action deleteMealServer for ${mealId}`);
                    syncResult = await deleteMealServer(mealId);
                    break;
                }
                 case 'metrics/addMetric': {
                     // Assume payload is BodyMetrics data
                     const metricData = payload as any; // Cast for now, add type check later
                     if (!metricData || typeof metricData !== 'object' || !metricData.date) {
                         throw new Error('Invalid payload for metrics/addMetric');
                     }
                     console.log(`[Sync Manager] Calling server action addMetricServer for ${metricData.date}`);
                     syncResult = await addMetricServer(metricData);
                     break;
                 }
                default:
                    console.warn(`[Sync Manager] Unknown action type: ${action.type}. Marking as failed.`);
                    // Set syncResult to failure for unknown types - Match test expectation
                    syncResult = { success: false, error: `Unknown Action Type: ${action.type}` }; 
            }

            // Check the result from the server action
            if (syncResult.success) {
                removeAction(action.id);
                console.log(`[Sync Manager] Successfully processed and removed action ${action.id} (${action.type}) from queue.`);
            } else {
                 // Throw the error received from the server action (or the default error)
                 throw new Error(syncResult.error || 'Sync action failed for unknown reason'); 
            }
        } catch (error) {
            // This catch block now has access to retryCount, now, MAX_RETRIES, updateActionMetadata
            console.error(`[Sync Manager] Failed to process action ${action.id} (${action.type}), Retry: ${retryCount}. Error:`, error);
            const nextRetryCount = retryCount + 1;
            const isPermanentFailure = nextRetryCount > MAX_RETRIES;
            
            // Determine the error message to store
            let errorMessage: string;
            if (error instanceof Error) {
                 errorMessage = error.message;
            } else {
                 errorMessage = String(error);
            }
            
            // Call updateActionMetadata (which is now in scope)
            updateActionMetadata(action.id, {
                 ...action.metadata,
                 retryCount: nextRetryCount,
                 lastAttemptTimestamp: now,
                 failed: isPermanentFailure,
                 error: errorMessage, 
            });

            if (isPermanentFailure) {
                console.error(`[Sync Manager] Action ${action.id} (${action.type}) has failed permanently after ${MAX_RETRIES} retries.`);
            } else {
                 console.log(`[Sync Manager] Action ${action.id} (${action.type}) scheduled for retry ${nextRetryCount}/${MAX_RETRIES}.`);
            }
        }
    }

     console.log("[Sync Manager] Finished processing queue run.");
     // Use pendingActions directly
     const remainingActions = useOfflineQueueStore.getState().pendingActions; 
     console.log(`[Sync Manager] Actions remaining in queue: ${remainingActions.length}`);
};

let isSyncing = false; // Prevent concurrent sync runs

/**
 * Wrapper to ensure processOfflineQueue doesn't run multiple times concurrently.
 */
const triggerSync = async () => {
    if (isSyncing) {
        console.log("[Sync Manager] Sync already in progress. Skipping trigger.");
        return;
    }
    isSyncing = true;
    try {
        await processOfflineQueue();
    } catch(error) {
        console.error("[Sync Manager] Error during triggerSync:", error);
    } finally {
        isSyncing = false;
    }
};

/**
 * Sets up listeners and triggers the initial sync.
 * Call this once when the application initializes.
 */
export const initializeSyncManager = () => {
    // Listen for online event
    window.addEventListener('online', () => {
        console.log("[Sync Manager] Application came online. Triggering queue processing.");
        triggerSync(); 
    });

    // Listen for offline event (optional, for logging)
    window.addEventListener('offline', () => {
        console.log("[Sync Manager] Application went offline.");
    });

    // Initial check and sync if online
    if (navigator.onLine) {
        console.log("[Sync Manager] Application is online. Triggering initial queue check.");
        triggerSync();
    } else {
         console.log("[Sync Manager] Application is offline. Sync will be attempted when connection returns.");
    }

    // Subscribe to changes in the offline queue store
    // If an action is added while online, process it immediately (optional)
    // useOfflineQueueStore.subscribe(
    //     (state, prevState) => {
    //         if (navigator.onLine && state.pendingActions.length > prevState.pendingActions.length) {
    //             console.log("[Sync Manager] Action added while online. Triggering sync.");
    //             triggerSync();
    //         }
    //     }
    // );
}; 