import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createIdbStorage } from '@/lib/idbStorage';
import type { WeeklyPlan, Workout, UserProfile } from '@/types'; // Correct import path
import { generateWeeklyPlan } from '@/features/planner/utils/generatePlan';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween'; // Needed for getPlanForDate logic
import { useOfflineQueueStore } from './offlineQueueStore';
import isoWeek from 'dayjs/plugin/isoWeek'; // Import isoWeek plugin

dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);
dayjs.extend(isoWeek); // Extend dayjs with isoWeek plugin

// Define the state shape including actions
interface PlannerState {
    plans: Record<string, WeeklyPlan>; // Store plans keyed by start date (YYYY-MM-DD)
    getPlanForDate: (date: string) => WeeklyPlan | null; // Helper to get plan containing a date
    generatePlanForWeek: (startDate: string, userProfile?: UserProfile | null) => WeeklyPlan; // Return the generated plan
    // Removed setPlan as direct manipulation is less safe
    // setPlan: (plan: WeeklyPlan | null) => void;
    markWorkoutComplete: (workoutId: string, completionData: Partial<Workout>) => Promise<void>;
    _updateWorkoutInPlan: (workoutId: string, updateData: Partial<Workout>) => void;
}

// Define the shape of the state to be persisted
interface PersistedPlannerState {
    plans: Record<string, WeeklyPlan>;
}

// Create the IDB storage instance
const idbStorage = createIdbStorage<PersistedPlannerState>();

export const usePlannerStore = create<PlannerState>()(
    persist(
        (set, get) => ({
            plans: {}, // Initialize with empty object

            generatePlanForWeek: (startDate, userProfile?) => {
                console.log(`Attempting to generate plan for week starting: ${startDate}`);
                // Ensure startDate is a Monday
                let effectiveStartDate = startDate;
                if (dayjs(startDate).isoWeekday() !== 1) { // Use isoWeekday for Monday=1
                    effectiveStartDate = dayjs(startDate).startOf('isoWeek').format('YYYY-MM-DD');
                    console.warn(`Planner Store: Requested start date ${startDate} was not a Monday. Adjusted to ${effectiveStartDate}.`);
                }

                // --- Get Previous Week's Plan --- 
                const previousMonday = dayjs(effectiveStartDate).subtract(1, 'week').format('YYYY-MM-DD');
                const previousPlan = get().plans[previousMonday] || null;
                if(previousPlan) {
                     console.log("Planner Store: Found previous week's plan for adaptation:", previousPlan.startDate);
                } else {
                     console.log(`Planner Store: No previous plan found for ${previousMonday} to adapt from.`);
                }

                // --- Generate Plan using utility --- 
                const newPlan = generateWeeklyPlan(effectiveStartDate, userProfile, previousPlan);
                
                // --- Update State --- 
                set(state => ({
                    plans: {
                        ...state.plans,
                        [effectiveStartDate]: newPlan
                    }
                }));
                console.log("Planner Store: New plan generated and set:", newPlan);
                return newPlan; // Return the generated plan
            },

            getPlanForDate: (date: string) => {
                const targetDate = dayjs(date);
                const plans = get().plans;
                // Find the plan whose start/end dates contain the targetDate
                for (const startDateKey in plans) {
                    const plan = plans[startDateKey];
                    if (plan && targetDate.isBetween(plan.startDate, plan.endDate, 'day', '[]')) {
                        return plan;
                    }
                }
                return null;
            },

            // setPlan: (plan: WeeklyPlan | null) => {
            //      console.log("Planner Store: Manually setting plan:", plan);
            //      if (plan && plan.startDate) {
            //         set(state => ({ plans: { ...state.plans, [plan.startDate]: plan } }));
            //      } else {
            //         // Handle clearing? Perhaps remove a plan by date?
            //         console.warn("Planner Store: setPlan called with null or invalid plan.")
            //      }
            // },

            _updateWorkoutInPlan: (workoutId, updateData) => {
                set(state => {
                    const updatedPlans: Record<string, WeeklyPlan> = {};
                    let planUpdated = false;

                    for (const startDateKey in state.plans) {
                        const plan = state.plans[startDateKey];
                        let workoutsUpdated = false;
                        const updatedWorkouts = plan.workouts.map(w => {
                            if (w.id === workoutId) {
                                workoutsUpdated = true;
                                return { ...w, ...updateData };
                            }
                            return w;
                        });

                        if (workoutsUpdated) {
                            updatedPlans[startDateKey] = { ...plan, workouts: updatedWorkouts };
                            planUpdated = true;
                        } else {
                            updatedPlans[startDateKey] = plan; // Keep original plan if no workout matched
                        }
                    }

                    if (!planUpdated) {
                         console.warn(`[Planner Store] _updateWorkoutInPlan: Workout ID ${workoutId} not found in any plan.`);
                         return {}; // No change
                    }

                    return { plans: updatedPlans };
                });
            },

            markWorkoutComplete: async (workoutId, completionData) => {
                const isOnline = navigator.onLine;
                console.log(`[Planner Store] Marking workout ${workoutId} complete. Online: ${isOnline}`);
                get()._updateWorkoutInPlan(workoutId, completionData);
                if (isOnline) {
                    try {
                        console.log(`[Planner Store] Simulating backend sync for ${workoutId}...`);
                        await new Promise(resolve => setTimeout(resolve, 50)); 
                        if (workoutId === 'fail-sync') {
                            throw new Error('Simulated backend sync failure for testing');
                        }
                        console.log(`[Planner Store] Workout ${workoutId} completion synced (simulated).`);
                    } catch (error) {
                        console.error(`[Planner Store] Failed to sync workout completion for ${workoutId}:`, error);
                         useOfflineQueueStore.getState().addAction({
                            type: 'planner/markComplete',
                            payload: { workoutId, completionData }
                        });
                         console.warn(`[Planner Store] Added failed online completion for ${workoutId} to offline queue.`);
                    }
                } else {
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
            partialize: (state): PersistedPlannerState => ({
                plans: state.plans, // Persist all plans
            }),
        }
    )
);

// ----- Initialization Logic -----
// Updated to check if plan for the *current* week exists
export const initializePlannerStore = (userProfile?: UserProfile | null, forceRegenerate: boolean = false): WeeklyPlan | null => {
    const { plans, generatePlanForWeek, getPlanForDate } = usePlannerStore.getState();
    const today = dayjs();
    const currentMonday = today.startOf('isoWeek').format('YYYY-MM-DD'); // Use isoWeek

    const existingPlanForCurrentWeek = plans[currentMonday];

    if (!existingPlanForCurrentWeek || forceRegenerate) {
        console.log(`Planner Store Initializer: ${forceRegenerate ? 'Forcing regeneration' : 'No plan found for current week'}. Generating plan for week starting: ${currentMonday}`);
        // Generate and update state directly. 
        // No need for setTimeout, Zustand handles state updates properly.
        const newPlan = generatePlanForWeek(currentMonday, userProfile);
        return newPlan;
    } else {
        console.log("Planner Store Initializer: Found existing plan for current week:", existingPlanForCurrentWeek);
        return existingPlanForCurrentWeek;
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