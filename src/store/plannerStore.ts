import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createIdbStorage } from '@/lib/idbStorage';
import type { WeeklyPlan, Workout, UserProfile } from '@/types'; // Correct import path
import { generateWeeklyPlan } from '@/features/planner/utils/generatePlan';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween'; // Needed for getPlanForDate logic
import { useOfflineQueueStore } from './offlineQueueStore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

// Define the state shape including actions
interface PlannerState {
    currentPlan: WeeklyPlan | null;
    generatePlanForWeek: (startDate: string, userProfile?: UserProfile | null) => WeeklyPlan; // Return the generated plan
    getPlanForDate: (date: string) => WeeklyPlan | null; // Helper to get plan containing a date
    setPlan: (plan: WeeklyPlan | null) => void; // Action to manually set/clear the plan
    // TODO: Add actions for updating/modifying plan (e.g., mark workout complete, drag/drop)
    markWorkoutComplete: (workoutId: string, completionData: Partial<Workout>) => Promise<void>;
    _updateWorkoutInPlan: (workoutId: string, updateData: Partial<Workout>) => void;
}

// Define the shape of the state to be persisted
interface PersistedPlannerState {
    currentPlan: WeeklyPlan | null;
}

// Create the IDB storage instance, typed for the PARTIAL state we persist
const idbStorage = createIdbStorage<PersistedPlannerState>();

export const usePlannerStore = create<PlannerState>()(
    persist(
        (set, get) => ({
            currentPlan: null, // Initialize with null

            generatePlanForWeek: (startDate, userProfile?) => {
                console.log(`Attempting to generate plan for week starting: ${startDate}`);
                // Ensure startDate is a Monday
                let effectiveStartDate = startDate;
                if (dayjs(startDate).day() !== 1) {
                    effectiveStartDate = dayjs(startDate).startOf('week').add(1, 'day').format('YYYY-MM-DD');
                    console.warn(`Planner Store: Requested start date ${startDate} was not a Monday. Adjusted to ${effectiveStartDate}.`);
                }

                const newPlan = generateWeeklyPlan(effectiveStartDate, userProfile);
                set({ currentPlan: newPlan });
                console.log("Planner Store: New plan generated and set:", newPlan);
                return newPlan; // Return the generated plan
            },

            getPlanForDate: (date: string) => {
                const plan = get().currentPlan;
                if (!plan || !plan.startDate || !plan.endDate) return null;

                const targetDate = dayjs(date);
                // Check if the targetDate is between plan start and end (inclusive)
                if (targetDate.isBetween(plan.startDate, plan.endDate, 'day', '[]')) {
                    return plan;
                }
                return null;
            },

            setPlan: (plan: WeeklyPlan | null) => {
                 console.log("Planner Store: Manually setting plan:", plan);
                 set({ currentPlan: plan });
            },

            _updateWorkoutInPlan: (workoutId, updateData) => {
                set(state => {
                    if (!state.currentPlan) return {};
                    const updatedWorkouts = state.currentPlan.workouts.map(w => 
                        w.id === workoutId ? { ...w, ...updateData } : w
                    );
                    return { 
                        currentPlan: { 
                            ...state.currentPlan, 
                            workouts: updatedWorkouts 
                        } 
                    };
                });
            },

            markWorkoutComplete: async (workoutId, completionData) => {
                const isOnline = navigator.onLine;
                console.log(`[Planner Store] Marking workout ${workoutId} complete. Online: ${isOnline}`);

                // 1. Optimistic Update (apply immediately to UI)
                get()._updateWorkoutInPlan(workoutId, completionData);

                // 2. Handle Online/Offline Logic
                if (isOnline) {
                    try {
                        // --- Simulate Backend Sync --- 
                        console.log(`[Planner Store] Simulating backend sync for ${workoutId}...`);
                        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay

                        // *** Test Hook for Failure Simulation ***
                        if (workoutId === 'fail-sync') {
                            throw new Error('Simulated backend sync failure for testing');
                        }
                        // *** End Test Hook ***

                        // If sync succeeds (or no real backend call)
                        console.log(`[Planner Store] Workout ${workoutId} completion synced (simulated).`);
                        // No need to do anything else, optimistic update is correct.

                    } catch (error) { // Catch sync errors
                        console.error(`[Planner Store] Failed to sync workout completion for ${workoutId}:`, error);
                        // Queue the action if online sync fails
                         useOfflineQueueStore.getState().addAction({
                            type: 'planner/markComplete',
                            payload: { workoutId, completionData }
                        });
                         console.warn(`[Planner Store] Added failed online completion for ${workoutId} to offline queue.`);
                    }
                } else { // Offline Logic
                    useOfflineQueueStore.getState().addAction({
                        type: 'planner/markComplete',
                        payload: { workoutId, completionData }
                    });
                     console.log(`[Planner Store] Workout ${workoutId} completion queued for offline sync.`);
                }
            },
        }),
        {
            name: 'planner-storage',
            storage: idbStorage,
            // Only persist the data part of the state
            partialize: (state): PersistedPlannerState => ({
                currentPlan: state.currentPlan,
            }),
        }
    )
);

// ----- Initialization Logic -----
// Exported function to be called explicitly from client-side code (e.g., root layout or effect hook)
export const initializePlannerStore = (userProfile?: UserProfile | null, forceRegenerate: boolean = false): WeeklyPlan | null => {
    const { currentPlan, generatePlanForWeek } = usePlannerStore.getState();
    const today = dayjs();
    const currentMonday = today.startOf('week').add(1, 'day');

    // Determine if we need to generate a new plan
    const needsInitialization = !currentPlan || dayjs(currentPlan.endDate).isBefore(today, 'day');

    if (needsInitialization || forceRegenerate) {
        const startDateToGenerate = currentMonday.format('YYYY-MM-DD');
        console.log(`Planner Store Initializer: ${forceRegenerate ? 'Forcing regeneration' : 'No current/future plan found or plan is outdated'}. Generating plan for week starting: ${startDateToGenerate}`);
        // Directly call the action, which will update the state via set()
        // Use setTimeout to avoid potential issues during initial hydration/render cycles
        let generatedPlan: WeeklyPlan | null = null;
        setTimeout(() => {
             generatedPlan = generatePlanForWeek(startDateToGenerate, userProfile);
             console.log("Planner store initialized asynchronously.");
        }, 0);
         // Note: This function currently returns null during async init,
         // caller should rely on store subscription for the updated plan.
         // Could be refactored to return a promise if needed.
        return null; // Plan is being generated asynchronously
    } else {
        console.log("Planner Store Initializer: Store already has a current/future plan:", currentPlan);
        return currentPlan; // Return the existing plan
    }
};

// Example of how to call initialization from a client component:
// import { useEffect } from 'react';
// import { initializePlannerStore } from '@/store/plannerStore';
//
// function PlannerInitializer() { // Could be placed in _app.tsx or layout.tsx
//   useEffect(() => {
//     initializePlannerStore();
//   }, []);
//   return null; // This component doesn't render anything itself
// } 