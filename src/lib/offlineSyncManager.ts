import { useOfflineQueueStore } from "@/store/offlineQueueStore";
import { usePlannerStore } from "@/store/plannerStore";

/**
 * Processes the offline action queue, attempting to sync actions with the backend.
 */
export const processOfflineQueue = async () => {
    const { getActions, removeAction } = useOfflineQueueStore.getState();
    const actions = getActions();

    if (actions.length === 0) {
        console.log("[Sync Manager] No actions in queue to process.");
        return;
    }

    console.log(`[Sync Manager] Processing ${actions.length} actions...`);

    for (const action of actions) {
        console.log(`[Sync Manager] Processing action: ${action.type} (ID: ${action.id})`);
        let success = false;

        try {
            switch (action.type) {
                case 'planner/markComplete':
                    // --- Backend Sync Placeholder --- 
                    // In a real app, this would be an API call.
                    // We simulate success/failure randomly for testing.
                    // const response = await fetch('/api/planner/workout/complete', { 
                    //     method: 'POST', 
                    //     body: JSON.stringify(action.payload) // payload is { workoutId, completionData }
                    // });
                    // if (!response.ok) throw new Error('Backend sync failed for markComplete');
                    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
                    if (Math.random() > 0.1) { // Simulate 90% success rate
                        console.log(`[Sync Manager] Successfully synced action: ${action.type} (ID: ${action.id})`);
                        success = true;
                    } else {
                         throw new Error('Simulated backend sync failure');
                    }
                    // --- End Backend Sync Placeholder ---
                    break;
                // Add cases for other action types here (e.g., 'nutrition/addMeal')
                default:
                    console.warn(`[Sync Manager] Unknown action type: ${action.type}`);
                    // Should we remove unknown actions? For now, let's leave them.
                    // success = true; // Or mark as failed?
            }

            if (success) {
                removeAction(action.id);
                console.log(`[Sync Manager] Removed action ${action.id} from queue.`);
            }
        } catch (error) {
            console.error(`[Sync Manager] Failed to process action ${action.id} (${action.type}):`, error);
            // TODO: Implement retry logic or notify user
            // For now, we just leave it in the queue for the next attempt.
        }
    }

     console.log("[Sync Manager] Finished processing queue.");
     // Check if queue is empty now
     const remainingActions = useOfflineQueueStore.getState().getActions();
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