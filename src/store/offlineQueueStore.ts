import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createIdbStorage } from '@/lib/idbStorage';
import type { Workout, Meal } from '@/types'; // Assuming these might be payloads

/**
 * Represents a single action that needs to be synced when the app comes back online.
 */
export interface QueuedAction<T = any> {
  id: string; // Unique ID for the queued item
  timestamp: string; // ISO timestamp when the action was queued
  type: string; // Identifier for the action (e.g., 'planner/addWorkout', 'nutrition/addMeal')
  payload: T; // Data associated with the action
  metadata?: Record<string, any>; // Optional additional data (e.g., temp IDs for optimistic UI)
}

// Interface for the state managed by this store
interface OfflineQueueState {
  pendingActions: QueuedAction[];
  addAction: (actionData: Omit<QueuedAction, 'id' | 'timestamp'>) => void;
  getActions: () => QueuedAction[];
  removeAction: (id: string) => void;
  updateActionMetadata: (id: string, metadata: Record<string, any>) => void;
  clearQueue: () => void;
  // Potentially add processor registration later
  // processor?: { registerDomain: (domain: string, handler: (action: QueuedAction) => void) => void };
}

// Create the IDB storage instance, typed for the PARTIAL state we persist
const idbStorage = createIdbStorage<{ pendingActions: QueuedAction[] }>();

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      pendingActions: [],

      addAction: (actionData) => {
        const newAction: QueuedAction = {
          ...actionData,
          id: crypto.randomUUID(), // Generate a unique ID for the queued action
          timestamp: new Date().toISOString(),
        };
        set((state) => ({ 
          pendingActions: [...state.pendingActions, newAction] 
        }));
        console.log("[Offline Queue] Action added:", newAction);
      },

      getActions: () => get().pendingActions,

      removeAction: (id) => {
        set((state) => ({
          pendingActions: state.pendingActions.filter(action => action.id !== id)
        }));
        console.log(`[Offline Queue] Action removed: ${id}`);
      },

      updateActionMetadata: (id, metadata) => {
        set((state) => ({
          pendingActions: state.pendingActions.map(action => 
            action.id === id 
              ? { ...action, metadata: { ...(action.metadata || {}), ...metadata } } 
              : action
          )
        }));
         console.log(`[Offline Queue] Updated metadata for action: ${id}`, metadata);
      },

      clearQueue: () => {
        set({ pendingActions: [] });
        console.log("[Offline Queue] Queue cleared.");
      },
    }),
    {
      name: 'offline-action-queue',
      storage: idbStorage,
      // Only persist the pendingActions array
      partialize: (state) => ({ pendingActions: state.pendingActions }),
    }
  )
); 