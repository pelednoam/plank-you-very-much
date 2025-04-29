import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import type { Workout, WorkoutType, UserProfile } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage'; // Added
import { generateWeeklyPlan } from '@/lib/plannerUtils'; // Import plan generation utility
import dayjs from 'dayjs'; // Import for date handling
import { useOfflineQueueStore, QueuedAction } from './offlineQueueStore'; // Import queue store and action type
import { toast } from 'sonner'; // Correct import for toasts used in the project

interface PlannerState {
  workouts: Workout[];
  addWorkout: (workoutData: Omit<Workout, 'id' | 'startedAt' | 'completedAt' | 'syncStatus'>, isOnline: boolean) => Promise<Workout | null>; // Return null if queued
  updateWorkout: (id: string, updates: Partial<Omit<Workout, 'id'>>, isOnline: boolean) => Promise<boolean>; // Return false if queued
  logWorkoutStart: (id: string, isOnline: boolean) => Promise<boolean>; // NFC/QR Trigger
  toggleWorkoutComplete: (id: string, isOnline: boolean) => Promise<boolean>; // Return false if queued
  removeWorkout: (id: string, isOnline: boolean) => Promise<boolean>; // Return false if queued
  getWorkoutsForDate: (date: string) => Workout[]; // date in ISO YYYY-MM-DD format
  generatePlan: (startDate: string | Date, userProfile: Partial<UserProfile>) => Promise<Workout[]>; // Make async if addWorkout is
  clearPlanForWeek: (startDate: string | Date) => void; // Clear all workouts for a given week
  _applyQueuedUpdate: (action: QueuedAction, syncSuccess: boolean, serverResponse?: any) => void; // Corrected import used here
}

export const usePlannerStore = create(
  persist<PlannerState>(
    (set, get) => ({
      workouts: [], // Start with an empty list

      addWorkout: async (workoutData, isOnline) => {
        const tempId = uuidv4(); // Generate ID locally for optimistic update
        const optimisticWorkout: Workout = {
            ...workoutData,
            id: tempId,
            // Ensure plannedAt is present if not in workoutData (should be)
            plannedAt: workoutData.plannedAt || new Date().toISOString(),
            durationMin: workoutData.durationMin || 0,
            syncStatus: isOnline ? 'synced' : 'pending',
        };

        set((state) => ({ workouts: [...state.workouts, optimisticWorkout] }));

        if (isOnline) {
          console.log(`[Planner Online] Workout added: ${tempId}`);
          // TODO: Call server sync function here
          // await syncAddWorkoutToServer(optimisticWorkout);
          return optimisticWorkout;
        } else {
          useOfflineQueueStore.getState().addAction({
            type: 'planner/addWorkout',
            payload: workoutData,
            metadata: { tempId: tempId },
          });
          console.log(`[Planner Offline] Add workout action queued for: ${tempId}`);
          return null; 
        }
      },

      updateWorkout: async (id, updates, isOnline) => {
        const originalWorkout = get().workouts.find(w => w.id === id);
        if (!originalWorkout) return false;

        // Optimistic update
        set((state) => ({
            workouts: state.workouts.map(w => w.id === id ? { ...w, ...updates, syncStatus: isOnline ? 'synced' : 'pending' } : w)
        }));

        if (isOnline) {
          // TODO: Call server sync function here
          // await syncUpdateWorkoutToServer(id, updates);
          console.log(`[Planner Online] Workout updated: ${id}`);
          return true;
        } else {
           useOfflineQueueStore.getState().addAction({
            type: 'planner/updateWorkout',
            payload: { id, updates }, 
            metadata: { tempId: id }, // Use actual ID for updates
          });
          console.log(`[Planner Offline] Update workout action queued for: ${id}`);
          return false; // Indicate queued
        }
      },
      
      logWorkoutStart: async (id, isOnline) => {
          const startTime = new Date().toISOString();
          const updates = { startedAt: startTime };
          const originalWorkout = get().workouts.find(w => w.id === id);
          if (!originalWorkout) return false;

          // Optimistic update
          set((state) => ({
              workouts: state.workouts.map(w => w.id === id ? { ...w, startedAt: startTime, syncStatus: isOnline ? 'synced' : 'pending' } : w)
          }));

          if (isOnline) {
              // TODO: Call server sync function here for starting workout
              // await syncLogWorkoutStartToServer(id, startTime);
              console.log(`[Planner Online] Workout started: ${id}`);
              return true;
          } else {
              useOfflineQueueStore.getState().addAction({
                  type: 'planner/logWorkoutStart',
                  payload: { id, startedAt: startTime },
                  metadata: { tempId: id }, // Use actual ID
              });
              console.log(`[Planner Offline] Log workout start action queued for: ${id}`);
              return false; // Indicate queued
          }
      },

      toggleWorkoutComplete: async (id, isOnline) => {
         const originalWorkout = get().workouts.find(w => w.id === id);
         if (!originalWorkout) return false;
         const completedAt = originalWorkout.completedAt ? undefined : new Date().toISOString();
         const updates = { completedAt };

         // Optimistic update
         set((state) => ({
             workouts: state.workouts.map(w => w.id === id ? { ...w, completedAt, syncStatus: isOnline ? 'synced' : 'pending' } : w)
         }));

         if (isOnline) {
             // TODO: Call server sync function here
             // await syncToggleWorkoutCompleteToServer(id, completedAt);
             console.log(`[Planner Online] Workout completion toggled: ${id}`);
             return true;
         } else {
             useOfflineQueueStore.getState().addAction({
                type: 'planner/toggleWorkoutComplete',
                payload: { id, completedAt }, // Send the completedAt time
                metadata: { tempId: id },
            });
             console.log(`[Planner Offline] Toggle completion action queued for: ${id}`);
            return false; // Indicate queued
         }
      },

      removeWorkout: async (id, isOnline) => {
         const originalWorkout = get().workouts.find(w => w.id === id);
         if (!originalWorkout) return false;

        // Handle pending add action first if offline
        if (!isOnline) {
            const pendingActions = useOfflineQueueStore.getState().getActions();
            const correspondingAddAction = pendingActions.find(
                action => action.type === 'planner/addWorkout' && action.metadata?.tempId === id
            );

            if (correspondingAddAction) {
                console.log(`[Planner] Workout ${id} was added offline. Removing add action ${correspondingAddAction.id}.`);
                useOfflineQueueStore.getState().removeAction(correspondingAddAction.id);
                set((state) => ({
                    workouts: state.workouts.filter((w) => w.id !== id),
                }));
                return false; // Indicate action was handled locally
            }
        }
        
        // Optimistic update: filter immediately
         set((state) => ({
            workouts: state.workouts.filter(w => w.id !== id)
        }));

         if (isOnline) {
             // TODO: Call server sync function here
             // await syncRemoveWorkoutToServer(id);
            console.log(`[Planner Online] Workout removed: ${id}`);
            // Confirmation is handled by the optimistic update above
            return true;
         } else {
             useOfflineQueueStore.getState().addAction({
                type: 'planner/removeWorkout',
                payload: { id },
                metadata: { tempId: id }, // Still useful for _applyQueuedUpdate logic
            });
            console.log(`[Planner Offline] Remove workout action queued for: ${id}`);
            return false; // Indicate queued
         }
      },

      getWorkoutsForDate: (date) => {
        return get().workouts.filter(w => dayjs(w.plannedAt).isSame(dayjs(date), 'day')); // Use dayjs for better matching
      },
      
      generatePlan: async (startDate, userProfile) => {
        console.warn("generatePlan offline queuing not fully implemented yet.");
        const dateObj = dayjs(startDate).startOf('week');
        const existingWorkouts = get().workouts;
        const generatedPlan = generateWeeklyPlan({
          startDate: dateObj,
          userProfile,
          existingWorkouts,
        });
        const addedWorkouts: Workout[] = [];
        // TODO: Handle offline status correctly when adding multiple workouts
        for (const workoutData of generatedPlan) {
             const newWorkout = await get().addWorkout(workoutData, true); // Assuming online
             if (newWorkout) addedWorkouts.push(newWorkout);
        }
        return addedWorkouts;
      },

      clearPlanForWeek: (startDate) => {
        const weekStart = dayjs(startDate).startOf('week');
        const weekEnd = weekStart.endOf('week'); // Use endOf('week') for clarity
        set((state) => ({
          workouts: state.workouts.filter(workout => {
            const workoutDate = dayjs(workout.plannedAt);
            // Keep workouts outside the target week
            return workoutDate.isBefore(weekStart) || workoutDate.isAfter(weekEnd);
          })
        }));
        console.log(`Cleared workouts for week starting ${weekStart.format('YYYY-MM-DD')}`);
      },

      // Internal action to apply updates from queue AFTER server sync attempt
      _applyQueuedUpdate: (action: QueuedAction, syncSuccess: boolean, serverResponse?: any) => {
         console.log(`[Planner Queue Apply] Applying result: ${action.type} (${action.id}), Success: ${syncSuccess}`);
         const { type, payload, metadata } = action;
         const tempId = metadata?.tempId; // Often the same as payload.id for updates/deletes
         const workoutId = payload?.id || tempId;

         try {
            switch (type) {
                case 'planner/addWorkout':
                    if (!tempId) return console.error('[Planner Apply] Add action missing tempId');
                    if (syncSuccess) {
                        const idx = get().workouts.findIndex(w => w.id === tempId);
                        if (idx !== -1) {
                            const permanentId = serverResponse?.id || tempId;
                            set(state => ({
                                workouts: state.workouts.map((w, i) => i === idx ? { ...w, id: permanentId, syncStatus: 'synced' } : w)
                            }));
                            console.log(`[Planner Apply] Confirmed add sync: ${permanentId}`);
                        }
                    } else {
                        set(state => ({ workouts: state.workouts.map(w => w.id === tempId ? { ...w, syncStatus: 'error' } : w) }));
                        console.error(`[Planner Apply] Failed add sync for temp ID: ${tempId}`);
                    }
                    break;
                case 'planner/updateWorkout':
                case 'planner/logWorkoutStart':
                case 'planner/toggleWorkoutComplete':
                    if (!workoutId) return console.error(`[Planner Apply] Action ${type} missing workout ID`);
                    if (syncSuccess) {
                        set(state => ({ workouts: state.workouts.map(w => w.id === workoutId ? { ...w, syncStatus: 'synced' } : w) }));
                        console.log(`[Planner Apply] Confirmed ${type} sync for: ${workoutId}`);
                    } else {
                        // Revert optimistic update? More complex - depends on what was updated.
                        // Simplest is mark as error and let user resolve.
                        set(state => ({ workouts: state.workouts.map(w => w.id === workoutId ? { ...w, syncStatus: 'error' } : w) }));
                        console.error(`[Planner Apply] Failed ${type} sync for: ${workoutId}`);
                    }
                    break;
                 case 'planner/removeWorkout':
                    if (!workoutId) return console.error('[Planner Apply] Remove action missing workout ID');
                     if (syncSuccess) {
                        // Already removed optimistically, just log confirmation
                        console.log(`[Planner Apply] Confirmed remove sync for: ${workoutId}`);
                     } else {
                         // Revert optimistic delete: Need to re-add the workout!
                         // This requires having the workout data available. 
                         // Option 1: Fetch from server (complex). 
                         // Option 2: Store original workout in action metadata (increases storage).
                         // Option 3: Mark as error and let user manually fix (simpler for now).
                         console.error(`[Planner Apply] Failed remove sync for: ${workoutId}. Cannot automatically revert.`);
                         // How to signal this failure state back to the UI? Maybe update a different store or toast?
                         toast.error("Sync Error", { description: `Failed to remove workout ${workoutId}. Please check your plan.` });
                     }
                    break;
                default:
                    console.warn(`[Planner Apply] Unknown action type: ${type}`);
            }
         } catch (error) {
             console.error(`[Planner Apply] Error processing ${type} for ID ${workoutId}:`, error);
         }
      },
    }),
    {
      name: 'planner-storage',
      storage: createIdbStorage<PlannerState>(),
      // Optionally partialize if needed
      // partialize: (state) => ({ workouts: state.workouts }),
    }
  )
);

// Selectors (optional but helpful)
export const selectAllWorkouts = (state: PlannerState) => state.workouts;
export const selectCompletedWorkouts = (state: PlannerState) => state.workouts.filter(w => w.completedAt);
export const selectPendingWorkouts = (state: PlannerState) => state.workouts.filter(w => !w.completedAt); 