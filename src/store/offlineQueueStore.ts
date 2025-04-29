import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createIdbStorage } from '@/lib/idbStorage';

/**
 * Represents a single action that needs to be synced when the app comes back online.
 */
export interface QueuedAction {
  id: string; // Unique ID for the queued item
  timestamp: string; // ISO timestamp when the action was queued
  type: string; // Identifier for the action (e.g., 'planner/addWorkout', 'nutrition/addMeal')
  payload: any; // Data associated with the action
  metadata?: Record<string, any>; // Optional additional data (e.g., temp IDs for optimistic UI)
}

// Interface for the state managed by this store
interface OfflineQueueState {
  pendingActions: QueuedAction[];
  addAction: (actionData: Omit<QueuedAction, 'id' | 'timestamp'>) => void;
  getActions: () => QueuedAction[];
  removeAction: (id: string) => void;
  clearQueue: () => void;
  // Potentially add processor registration later
  // processor?: { registerDomain: (domain: string, handler: (action: QueuedAction) => void) => void };
}

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
          pendingActions: [...state.pendingActions, newAction].sort((a, b) => a.timestamp.localeCompare(b.timestamp)) // Keep sorted by time?
        }));
        console.log(`[Offline Queue] Action added: ${newAction.type}, ID: ${newAction.id}`);
      },

      getActions: () => {
        // Return a copy to prevent direct mutation?
        return [...get().pendingActions]; 
      },

      removeAction: (id) => {
        set((state) => ({
          pendingActions: state.pendingActions.filter(action => action.id !== id)
        }));
         console.log(`[Offline Queue] Action removed: ID: ${id}`);
      },

      clearQueue: () => {
        set({ pendingActions: [] });
        console.log('[Offline Queue] Queue cleared.');
      },
    }),
    {
      name: 'offline-action-queue', // Unique name for storage
      storage: createIdbStorage<OfflineQueueState>(), // Store the full state type
    }
  )
); 