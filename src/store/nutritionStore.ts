import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
// import type { Meal, NewMeal } from '@/types'; // Removed NewMeal import
import type { Meal } from '@/types'; // Correct Meal import
import { createIdbStorage } from '@/lib/idbStorage';
import dayjs from 'dayjs';
import { useOfflineQueueStore, QueuedAction } from './offlineQueueStore'; // Import queue store and QueuedAction type

// TODO: Add actual server sync logic when online.
// TODO: Implement optimistic updates for better offline UX.

// Define the shape of the meal data before it's added (no id/timestamp)
type NewMealData = Omit<Meal, 'id' | 'timestamp'>;

// Represents the state managed by this store
interface NutritionState {
  meals: Meal[];
  // Actions now potentially queue if offline
  addMeal: (mealData: NewMealData, isOnline: boolean) => void;
  updateMeal: (updatedMeal: Meal) => void; // TODO: Implement offline for this if needed
  removeMeal: (mealId: string, isOnline: boolean) => void;
  // Read actions don't need offline handling
  getMealsForDate: (date: string) => Meal[];
  getTotalCaloriesForDate: (date: string) => number;
  // Internal function for offline queue processing
  _applyQueuedUpdate: (action: QueuedAction, syncSuccess: boolean, serverResponse?: any) => void;
  getMealById: (id: string) => Meal | undefined;
}

// Define the persistence options separately for clarity
const persistOptions: PersistOptions<NutritionState> = {
  name: 'nutrition-storage', // unique name for this store's data in IDB
  storage: createIdbStorage<NutritionState>(), // Correctly call with 0 arguments
};

// Create the store with persistence and offline logic
export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      meals: [],

      // Getters
      getMealsForDate: (date) => {
        const startOfDay = dayjs(date).startOf('day');
        const endOfDay = dayjs(date).endOf('day');
        return get().meals
          .filter(meal => {
            const mealDate = dayjs(meal.timestamp);
            return mealDate.isAfter(startOfDay) && mealDate.isBefore(endOfDay);
          })
          .sort((a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf());
      },
      getTotalCaloriesForDate: (date) => {
        return get().getMealsForDate(date).reduce((total, meal) => total + meal.kcal, 0);
      },

      // Actions
      addMeal: (mealData: NewMealData, isOnline: boolean) => {
        const tempId = uuidv4(); // Generate ID locally for optimistic update
        const timestamp = new Date().toISOString();

        const optimisticMeal: Meal = {
            ...mealData,
            id: tempId,
            timestamp: timestamp,
            syncStatus: isOnline ? 'synced' : 'pending',
        };

        // Optimistically add to state immediately
        set((state) => ({ meals: [...state.meals, optimisticMeal] }));

        if (isOnline) {
          console.log('[NutritionStore] Adding meal directly (online):', tempId);
          // TODO: Trigger API call to sync backend
          // On success, update syncStatus to 'synced' (already set)
          // On failure, update syncStatus to 'error' and notify user
          // Example potential update on success/fail:
          // set((state) => ({ meals: state.meals.map(m => m.id === tempId ? { ...m, syncStatus: 'synced' } : m) }));
        } else {
          console.log('[NutritionStore] Queuing meal addition (offline):', tempId);
          // Add action to queue, payload is the original data *without* temp ID/timestamp
          useOfflineQueueStore.getState().addAction({
            type: 'nutrition/addMeal',
            payload: mealData,
            // Add metadata if needed by processor, e.g., the temp ID used locally
            metadata: { tempId: tempId, timestamp: timestamp },
          });
        }
      },

      updateMeal: (updatedMeal) => {
        console.warn('[Nutrition Store] updateMeal - Offline queue not implemented yet.');
        // TODO: Implement offline queuing & optimistic update for updateMeal
        set((state) => ({
          meals: state.meals.map(meal => meal.id === updatedMeal.id ? { ...updatedMeal, syncStatus: 'pending' } : meal) // Assume update needs sync
        }));
        // TODO: API call if online / queue if offline
      },

      removeMeal: (mealId: string, isOnline: boolean) => {
        // Optimistic removal / status update
        const mealToRemove = get().meals.find((meal) => meal.id === mealId);
        if (!mealToRemove) {
            console.warn(`[NutritionStore] removeMeal: Meal with id ${mealId} not found locally.`);
            return; // Exit if meal doesn't exist locally
        }

        // Handle pending add action first if offline
        if (!isOnline) {
            const pendingActions = useOfflineQueueStore.getState().getActions();
            // Check if the meal being removed was added optimistically and is still pending sync
            const correspondingAddAction = pendingActions.find(
                action => action.type === 'nutrition/addMeal' && action.metadata?.tempId === mealId
            );

            if (correspondingAddAction) {
                console.log(`[NutritionStore] Meal ${mealId} was added offline and not synced. Removing add action ${correspondingAddAction.id} instead of queueing removal.`);
                useOfflineQueueStore.getState().removeAction(correspondingAddAction.id);
                // Just remove locally, no need to queue a delete
                set((state) => ({
                    meals: state.meals.filter((meal) => meal.id !== mealId),
                }));
                return; // Exit early
            }
        }

        // If online, or offline but meal was already synced (or existed before offline)
        set((state) => ({
            meals: state.meals.map((meal) =>
                meal.id === mealId
                    ? { ...meal, syncStatus: 'deleting' as const } // Mark for deletion optimistically
                    : meal
            ),
            // Alternatively, filter immediately:
            // meals: state.meals.filter((meal) => meal.id !== mealId),
        }));

        if (isOnline) {
          console.log(`[NutritionStore] Removing meal directly (online): ${mealId}`);
          // TODO: Trigger API call to sync backend
          // On success, confirm removal by filtering from state (if not done optimistically)
           set((state) => ({ meals: state.meals.filter((meal) => meal.id !== mealId) }));
          // On failure, revert syncStatus to 'synced' or 'error' and notify user
          // Example revert on failure:
          // set((state) => ({ meals: state.meals.map(m => m.id === mealId ? { ...m, syncStatus: 'synced' } : m) }));
        } else {
          console.log(`[NutritionStore] Queuing meal removal (offline): ${mealId}`);
          // Add the remove action to the offline queue
          useOfflineQueueStore.getState().addAction({
            type: 'nutrition/removeMeal',
            payload: { id: mealId },
          });
          // Optimistic removal was already handled above (marked as deleting or filtered)
        }
      },

      getMealById: (id: string) => {
        return get().meals.find((meal) => meal.id === id);
      },

      // Internal function called by OfflineQueueProcessor AFTER server sync attempt
      _applyQueuedUpdate: (action: QueuedAction, syncSuccess: boolean, serverResponse?: any) => {
        console.log(`[NutritionStore] Applying result for action: ${action.type} (${action.id}), Success: ${syncSuccess}`);
        
        try {
          switch (action.type) {
            case 'nutrition/addMeal': {
              const tempId = action.metadata?.tempId;
              if (!tempId) {
                  console.error('[NutritionStore] addMeal action missing tempId in metadata');
                  // Decide how to handle this - maybe try adding based on payload?
                  return; 
              }

              if (syncSuccess) {
                // Find the optimistically added meal
                const mealIndex = get().meals.findIndex(m => m.id === tempId);
                if (mealIndex !== -1) {
                    // Update its status to synced
                    // Optionally update ID if backend provides a permanent one
                    const permanentId = serverResponse?.id || tempId;
                    const finalTimestamp = serverResponse?.timestamp || action.timestamp;

                    set((state) => {
                        const newMeals = [...state.meals];
                        newMeals[mealIndex] = {
                            ...newMeals[mealIndex],
                            id: permanentId, // Update ID if necessary
                            timestamp: finalTimestamp, // Update timestamp if necessary
                            syncStatus: 'synced',
                        };
                        // If ID changed, potentially update other references if needed
                        return { meals: newMeals };
                    });
                    console.log(`[NutritionStore] Confirmed sync for added meal, final ID: ${permanentId}`);
                } else {
                   console.warn(`[NutritionStore] addMeal sync success, but meal with tempId ${tempId} not found locally.`);
                   // Might need to add it now if it was somehow removed?
                }
              } else {
                 // Sync failed - mark the meal as error or remove it
                 console.error(`[NutritionStore] Failed to sync addMeal action ${action.id}`);
                 set((state) => ({ 
                    meals: state.meals.map(m => 
                        m.id === tempId ? { ...m, syncStatus: 'error' } : m
                    )
                    // OR remove it completely:
                    // meals: state.meals.filter(m => m.id !== tempId)
                 }));
                 // TODO: Notify user about the failure
              }
              break;
            }
            case 'nutrition/removeMeal': {
               const { id: mealIdToRemove } = action.payload as { id: string };
               if (!mealIdToRemove) throw new Error('Missing id in payload for removeMeal');

               if (syncSuccess) {
                  // Confirm removal - ensure it's filtered out
                  set((state) => ({
                    meals: state.meals.filter((meal) => meal.id !== mealIdToRemove),
                  }));
                  console.log(`[NutritionStore] Confirmed sync for removed meal: ${mealIdToRemove}`);
               } else {
                  // Sync failed - revert optimistic removal
                  console.error(`[NutritionStore] Failed to sync removeMeal action ${action.id}`);
                  set((state) => ({ 
                     meals: state.meals.map(m => 
                         m.id === mealIdToRemove ? { ...m, syncStatus: 'synced' } : m // Revert status
                         // Note: If it was filtered optimistically, we might need to re-add it here
                         // This depends on the chosen optimistic strategy in removeMeal
                     )
                  }));
                  // TODO: Notify user about the failure
               }
              break;
            }
            // TODO: Add case for 'nutrition/updateMeal' when implemented
            default:
              console.warn(`[NutritionStore] Unknown action type in queue: ${action.type}`);
          }
        } catch (error) {
           console.error(`[NutritionStore] Error applying result for action ${action.id} (${action.type}):`, error);
           // This is an internal error in applying the result, not a sync error
        }
        // The OfflineQueueProcessor should remove the action from the queue regardless of
        // syncSuccess, as the attempt was made and processed here.
        // If sync failed, the state reflects 'error', requiring user action or maybe auto-retry later.
      },
    }),
    // Pass the pre-defined persist options
    persistOptions
  )
);

// Function to link this store's update logic to the central processor (Commented out for now)
/*
export function registerNutritionStoreProcessor() {
  const processor = useOfflineQueueStore.getState().processor; // Assuming processor is exposed or accessible
  if (processor) {
     processor.registerDomain('nutrition', useNutritionStore.getState()._applyQueuedUpdate);
     console.log('[NutritionStore] Registered with OfflineQueueProcessor');
  } else {
     console.warn('[NutritionStore] OfflineQueueProcessor not available for registration.');
     // Maybe retry registration later?
  }
}
*/

// Initial registration attempt - might need to be called after store initialization
// Consider calling this from an effect in your main App component or similar
// registerNutritionStoreProcessor(); // Commented out call

// Selectors
export const selectAllMeals = (state: NutritionState) => state.meals; 