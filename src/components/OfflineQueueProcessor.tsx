"use client";

import { useEffect, useState, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineQueueStore, QueuedAction } from '@/store/offlineQueueStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useNutritionStore } from '@/store/nutritionStore'; // Import nutrition store
import { toast } from 'sonner';

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
    const plannerApplyUpdate = usePlannerStore((state) => state._applyQueuedUpdate);
    const nutritionApplyUpdate = useNutritionStore((state) => state._applyQueuedUpdate); // Get nutrition apply action
    
    const [isProcessing, setIsProcessing] = useState(false);

    const processQueue = useCallback(async () => {
        if (isProcessing) {
            console.log('[Queue Processor] Already processing.');
            return; 
        }

        const actionsToProcess = getActions();
        if (actionsToProcess.length === 0) {
            // console.log('[Queue Processor] Queue is empty.'); // Reduce console noise
            return;
        }

        console.log(`[Queue Processor] Starting processing for ${actionsToProcess.length} actions.`);
        setIsProcessing(true);
        toast.info('Syncing offline changes...');
        
        let successCount = 0;
        let failureCount = 0;

        for (const action of actionsToProcess) {
            console.log(`[Queue Processor] Processing action: ${action.type} (${action.id})`);
            let appliedLocally = false;
            let syncedToServer = false;

            try {
                // 1. Apply action locally using the appropriate store
                const storeDomain = action.type.split('/')[0];
                switch (storeDomain) {
                    case 'planner':
                        plannerApplyUpdate(action.type, action.payload);
                        appliedLocally = true;
                        break;
                    case 'nutrition': // Add case for nutrition
                        nutritionApplyUpdate(action.type, action.payload);
                        appliedLocally = true;
                        break;
                    default:
                        console.warn(`[Queue Processor] Unknown action domain: ${storeDomain} for type: ${action.type}`);
                        failureCount++;
                        removeAction(action.id); 
                        continue; 
                }

                // 2. TODO: Sync action to server (Placeholder)
                console.log(`[Queue Processor] Placeholder: Syncing ${action.type} (${action.id}) to server...`);
                // Example: const syncResult = await syncActionToServer(action.type, action.payload, action.timestamp);
                // if (!syncResult.success) throw new Error('Server sync failed');
                syncedToServer = true; // Assume success for now

                // 3. If both steps successful, remove from queue
                if (appliedLocally && syncedToServer) {
                     removeAction(action.id);
                     successCount++;
                     console.log(`[Queue Processor] Action ${action.id} processed successfully.`);
                }

            } catch (error) {
                console.error(`[Queue Processor] Failed to process action ${action.id} (${action.type}):`, error);
                failureCount++;
                 toast.error("Sync Error", { description: `Failed to sync action: ${action.type}. It will be retried.` });
                 break; // Stop processing queue on first error to retry later
            }
        }

        setIsProcessing(false);
         // Update toast summary
         if (failureCount > 0) {
            toast.warning("Partial Sync", { description: `${successCount} changes synced, ${failureCount} failed and will be retried.` });
         } else if (successCount > 0) {
             toast.success("Offline changes synced successfully!");
         } else {
             // No successes or failures usually means queue was empty or only contained unknown actions
             console.log("[Queue Processor] Sync process finished.");
         }

    }, [isProcessing, getActions, removeAction, plannerApplyUpdate, nutritionApplyUpdate]); // Add nutritionApplyUpdate to deps

    useEffect(() => {
        if (isOnline) {
            // console.log('[Queue Processor] App is online, checking queue...'); // Reduce noise
            // Add a small delay before processing to allow network to stabilize?
            const timer = setTimeout(() => processQueue(), 2000); // e.g., 2 seconds
            return () => clearTimeout(timer);
        } else {
            console.log('[Queue Processor] App is offline.');
        }
    }, [isOnline, processQueue]); 

    return null;
} 