import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createIdbStorage } from '@/lib/idbStorage';

/**
 * Represents a single action queued for later execution when online.
 */
export interface QueuedAction {
  id: string; // Unique ID for the queued item
  timestamp: number; // When the action was originally attempted
  type: string; // Identifier for the action (e.g., 'planner/addWorkout', 'nutrition/addMeal')
  payload: any; // Data associated with the action
  // Optional: Add metadata like retry count?
}

interface OfflineQueueState {
  pendingActions: QueuedAction[];
  addAction: (action: Omit<QueuedAction, 'id' | 'timestamp'>) => void;
  getActions: () => QueuedAction[];
  removeAction: (id: string) => void;
  clearQueue: () => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      pendingActions: [],

      addAction: (actionData) => {
        const newAction: QueuedAction = {
          ...actionData,
          id: crypto.randomUUID(), // Generate a unique ID for the queued action
          timestamp: Date.now(),
        };
        set((state) => ({ 
          pendingActions: [...state.pendingActions, newAction].sort((a, b) => a.timestamp - b.timestamp) // Keep sorted by time?
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