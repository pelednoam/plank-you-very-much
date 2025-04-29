import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Meal, NewMeal } from '@/types';
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
  _applyQueuedUpdate: (action: QueuedAction) => void;
  getMealById: (id: string) => Meal | undefined;
}

const idbStorage = createIdbStorage({ name: 'nutrition-storage', storeName: 'nutrition' });

// Define the persistence options separately for clarity
const persistOptions: PersistOptions<NutritionState> = {
  name: 'nutrition-storage', // unique name
  // Provide the custom storage directly
  storage: createIdbStorage<NutritionState>(),
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
        if (isOnline) {
          console.log('[NutritionStore] Adding meal directly (online)');
          const newMeal: Meal = {
            ...mealData,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
          };
          set((state) => ({ meals: [...state.meals, newMeal] }));
          // TODO: Trigger API call to sync backend
        } else {
          console.log('[NutritionStore] Queuing meal addition (offline)');
          // Add to the offline queue, WITHOUT id and timestamp
          useOfflineQueueStore.getState().addAction({
            type: 'nutrition/addMeal',
            payload: mealData, // Pass the original data without id/timestamp
          });
          // Optionally add optimistic update here (add locally, revert if sync fails)
          // For simplicity, we'll wait for sync for now
        }
      },

      updateMeal: (updatedMeal) => {
        console.warn('[Nutrition Store] updateMeal - Offline queue not implemented yet.');
        // TODO: Implement offline queuing for updateMeal similar to addMeal/removeMeal
        set((state) => ({
          meals: state.meals.map(meal => meal.id === updatedMeal.id ? updatedMeal : meal)
        }));
        // TODO: API call if online
      },

      removeMeal: (mealId: string, isOnline: boolean) => {
        if (isOnline) {
          console.log(`[NutritionStore] Removing meal ${mealId} directly (online)`);
          set((state) => ({
            meals: state.meals.filter((meal) => meal.id !== mealId),
          }));
          // TODO: Trigger API call to sync backend
        } else {
          console.log(`[NutritionStore] Queuing meal removal ${mealId} (offline)`);
          // Check if the meal to be removed was added offline and is still queued
          const pendingActions = useOfflineQueueStore.getState().getActions();
          const correspondingAddAction = pendingActions.find(
            action => action.type === 'nutrition/addMeal' && action.payload?.id === mealId // Adjust payload check if ID isn't in payload
            // OR, if meals added offline get temporary IDs, check against those.
            // This logic needs refinement based on how optimistic updates vs. queueing works.
            // For now, assume we queue the removal regardless.
          );

          // If the corresponding 'add' action is still in the queue, remove it instead of adding a 'remove' action.
          if (correspondingAddAction) {
             console.log(`[NutritionStore] Found corresponding add action ${correspondingAddAction.id} in queue. Removing it.`);
             useOfflineQueueStore.getState().removeAction(correspondingAddAction.id);
          } else {
            // Add the remove action to the offline queue
            useOfflineQueueStore.getState().addAction({
              type: 'nutrition/removeMeal',
              payload: { id: mealId }, // Pass the ID needed for removal
            });
          }
          // Optionally add optimistic update here (remove locally)
           set((state) => ({
             meals: state.meals.filter((meal) => meal.id !== mealId),
           }));
        }
      },

      getMealById: (id: string) => {
        return get().meals.find((meal) => meal.id === id);
      },

      // Internal function called by OfflineQueueProcessor
      _applyQueuedUpdate: (action: QueuedAction) => {
        console.log(`[NutritionStore] Applying queued action: ${action.type}`);
        try {
          switch (action.type) {
            case 'nutrition/addMeal': {
              // Payload should be NewMealData
              const mealData = action.payload as NewMealData;
               if (!mealData) throw new Error('Missing payload for addMeal');
               // Generate ID and timestamp upon successful application
               const newMeal: Meal = {
                 ...mealData,
                 id: uuidv4(), // Or use an ID from backend response if available
                 timestamp: new Date(action.timestamp).toISOString(), // Use queue timestamp? Or sync timestamp?
               };
              set((state) => ({ meals: [...state.meals, newMeal] }));
              console.log(`[NutritionStore] Applied queued addMeal: ${newMeal.id}`);
              break;
            }
            case 'nutrition/removeMeal': {
               // Payload should contain the ID: { id: string }
               const { id } = action.payload as { id: string };
               if (!id) throw new Error('Missing id in payload for removeMeal');
              set((state) => ({
                meals: state.meals.filter((meal) => meal.id !== id),
              }));
              console.log(`[NutritionStore] Applied queued removeMeal: ${id}`);
              break;
            }
            default:
              console.warn(`[NutritionStore] Unknown action type in queue: ${action.type}`);
          }
           // On successful application, the OfflineQueueProcessor should remove the action.
        } catch (error) {
           console.error(`[NutritionStore] Error applying queued action ${action.id} (${action.type}):`, error);
           // Decide on error handling: retry? move to failed queue? notify user?
           // For now, the processor might keep it for retry based on its logic.
        }
      },
    }),
    // Pass the pre-defined persist options
    persistOptions
  )
);

// Function to link this store's update logic to the central processor
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

// Initial registration attempt - might need to be called after store initialization
// Consider calling this from an effect in your main App component or similar
// registerNutritionStoreProcessor();

// Selectors
export const selectAllMeals = (state: NutritionState) => state.meals; 