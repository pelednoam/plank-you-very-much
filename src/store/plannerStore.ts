import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import type { Workout, WorkoutType, UserProfile } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage'; // Added
import { generateWeeklyPlan } from '@/lib/plannerUtils'; // Import plan generation utility
import dayjs from 'dayjs'; // Import for date handling
import { useOfflineQueueStore } from './offlineQueueStore'; // Import queue store

interface PlannerState {
  workouts: Workout[];
  addWorkout: (workoutData: Omit<Workout, 'id'>, isOnline: boolean) => Promise<Workout | null>; // Return null if queued
  updateWorkout: (id: string, updates: Partial<Omit<Workout, 'id'>>, isOnline: boolean) => Promise<boolean>; // Return false if queued
  toggleWorkoutComplete: (id: string, isOnline: boolean) => Promise<boolean>; // Return false if queued
  removeWorkout: (id: string, isOnline: boolean) => Promise<boolean>; // Return false if queued
  getWorkoutsForDate: (date: string) => Workout[]; // date in ISO YYYY-MM-DD format
  generatePlan: (startDate: string | Date, userProfile: Partial<UserProfile>) => Promise<Workout[]>; // Make async if addWorkout is
  clearPlanForWeek: (startDate: string | Date) => void; // Clear all workouts for a given week
  _applyQueuedUpdate: (actionType: string, payload: any) => void; // Internal action to apply updates from queue (not exposed via hook typically)
}

export const usePlannerStore = create(
  persist<PlannerState>(
    (set, get) => ({
      workouts: [], // Start with an empty list

      addWorkout: async (workoutData, isOnline) => {
        if (isOnline) {
          const newWorkout: Workout = {
            ...workoutData,
            id: uuidv4(), // Assign a unique ID
          };
          set((state) => ({ workouts: [...state.workouts, newWorkout] }));
          // TODO: Call server sync function here
          // await syncAddWorkoutToServer(newWorkout);
          console.log(`[Planner Online] Workout added: ${newWorkout.id}`);
          return newWorkout;
        } else {
          useOfflineQueueStore.getState().addAction({
            type: 'planner/addWorkout',
            payload: workoutData, // Queue the data needed to create the workout later
          });
          console.log(`[Planner Offline] Add workout action queued.`);
          // Indicate the action was queued, not immediately performed
          return null; 
        }
      },

      updateWorkout: async (id, updates, isOnline) => {
        if (isOnline) {
          const originalWorkout = get().workouts.find(w => w.id === id);
          if (!originalWorkout) return false; // Or throw error?
          set((state) => ({
            workouts: state.workouts.map(w => w.id === id ? { ...w, ...updates } : w)
          }));
          // TODO: Call server sync function here
          // await syncUpdateWorkoutToServer(id, updates);
          console.log(`[Planner Online] Workout updated: ${id}`);
          return true;
        } else {
           useOfflineQueueStore.getState().addAction({
            type: 'planner/updateWorkout',
            payload: { id, updates }, 
          });
          console.log(`[Planner Offline] Update workout action queued for: ${id}`);
          return false; // Indicate queued
        }
      },

      toggleWorkoutComplete: async (id, isOnline) => {
         if (isOnline) {
            const originalWorkout = get().workouts.find(w => w.id === id);
            if (!originalWorkout) return false;
            const completedAt = originalWorkout.completedAt ? undefined : new Date().toISOString();
            set((state) => ({
              workouts: state.workouts.map(w =>
                w.id === id
                  ? { ...w, completedAt }
                  : w
              )
            }));
             // TODO: Call server sync function here
             // await syncToggleWorkoutCompleteToServer(id, completedAt);
             console.log(`[Planner Online] Workout completion toggled: ${id}`);
             return true;
         } else {
             useOfflineQueueStore.getState().addAction({
                type: 'planner/toggleWorkoutComplete',
                payload: { id }, // We can recalculate completedAt when processing queue
            });
             console.log(`[Planner Offline] Toggle completion action queued for: ${id}`);
            return false; // Indicate queued
         }
      },

      removeWorkout: async (id, isOnline) => {
         if (isOnline) {
            const originalWorkout = get().workouts.find(w => w.id === id);
            if (!originalWorkout) return false;
            set((state) => ({ workouts: state.workouts.filter(w => w.id !== id) }));
             // TODO: Call server sync function here
             // await syncRemoveWorkoutToServer(id);
            console.log(`[Planner Online] Workout removed: ${id}`);
            return true;
         } else {
             useOfflineQueueStore.getState().addAction({
                type: 'planner/removeWorkout',
                payload: { id },
            });
            console.log(`[Planner Offline] Remove workout action queued for: ${id}`);
            return false; // Indicate queued
         }
      },

      getWorkoutsForDate: (date) => {
        // Basic date matching (assumes plannedAt is full ISO string)
        // More robust date comparison might be needed
        return get().workouts.filter(w => w.plannedAt.startsWith(date));
      },

      /**
       * Generates a weekly workout plan starting from the specified date,
       * adds all generated workouts to the store, and returns them.
       */
      generatePlan: async (startDate, userProfile) => {
        // If generation involves adding multiple workouts, it should handle online/offline status
        // For simplicity now, assume generation happens online or is queued as one meta-action.
        // A more robust approach might generate the plan locally and queue individual add actions if offline.
        console.warn("generatePlan offline queuing not fully implemented yet.");
        
        const dateObj = dayjs(startDate).startOf('week');
        const existingWorkouts = get().workouts; 
        const generatedPlan = generateWeeklyPlan({
          startDate: dateObj,
          userProfile,
          existingWorkouts,
        });
        
        const addedWorkouts: Workout[] = [];
        // Assume online for now for generation bulk add
        // TODO: Refactor this loop to check online status per workout add?
        for (const workoutData of generatedPlan) {
             const newWorkout = await get().addWorkout(workoutData, true); // Assuming online for now
             if (newWorkout) addedWorkouts.push(newWorkout);
        }
        return addedWorkouts;
      },
      
      /**
       * Removes all workouts that fall within the specified week.
       * Useful before regenerating a plan for a given week.
       */
      clearPlanForWeek: (startDate) => {
        const weekStart = dayjs(startDate).startOf('week');
        const weekEnd = weekStart.add(6, 'day').endOf('day');
        
        // Remove workouts that fall within the week
        set((state) => ({
          workouts: state.workouts.filter(workout => {
            const workoutDate = dayjs(workout.plannedAt);
            return !workoutDate.isAfter(weekStart) || !workoutDate.isBefore(weekEnd);
          })
        }));
      },

      // --- Internal action to apply updates --- 
      _applyQueuedUpdate: (actionType, payload) => {
         console.log(`[Planner Queue Apply] Applying action: ${actionType}`, payload);
         try {
            switch (actionType) {
                case 'planner/addWorkout': {
                    const newWorkout: Workout = {
                        ...(payload as Omit<Workout, 'id'>),
                        id: uuidv4(), // Generate ID now
                    };
                    set((state) => ({ workouts: [...state.workouts, newWorkout] }));
                    // TODO: Sync to server needed here after applying locally
                    break;
                }
                 case 'planner/updateWorkout': {
                    const { id, updates } = payload as { id: string; updates: Partial<Omit<Workout, 'id'>> };
                    set((state) => ({
                        workouts: state.workouts.map(w => w.id === id ? { ...w, ...updates } : w)
                    }));
                     // TODO: Sync to server needed here after applying locally
                    break;
                }
                case 'planner/toggleWorkoutComplete': {
                     const { id } = payload as { id: string };
                     const originalWorkout = get().workouts.find(w => w.id === id);
                     if (!originalWorkout) break; // Skip if workout was deleted?
                     const completedAt = originalWorkout.completedAt ? undefined : new Date().toISOString();
                     set((state) => ({
                         workouts: state.workouts.map(w => w.id === id ? { ...w, completedAt } : w)
                     }));
                      // TODO: Sync to server needed here after applying locally
                    break;
                }
                 case 'planner/removeWorkout': {
                    const { id } = payload as { id: string };
                    set((state) => ({ workouts: state.workouts.filter(w => w.id !== id) }));
                     // TODO: Sync to server needed here after applying locally
                    break;
                }
                default:
                    console.warn(`[Planner Queue Apply] Unknown action type: ${actionType}`);
            }
         } catch (error) {
             console.error(`[Planner Queue Apply] Error applying action ${actionType} for ID ${payload?.id}:`, error);
             // Decide how to handle failed application (e.g., keep in queue? move to failed queue?)
         }
      },

    }),
    {
      name: 'planner-storage', // Unique name for this store
      storage: createIdbStorage<PlannerState>(), // Use IDB storage
    }
  )
);

// Example Selectors
export const selectAllWorkouts = (state: PlannerState) => state.workouts;
export const selectCompletedWorkouts = (state: PlannerState) => state.workouts.filter(w => w.completedAt);
export const selectPendingWorkouts = (state: PlannerState) => state.workouts.filter(w => !w.completedAt); 