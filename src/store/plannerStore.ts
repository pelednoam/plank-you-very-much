import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createIdbStorage } from '@/lib/idbStorage';
import type { WeeklyPlan } from '@/features/planner/types'; // Correct import path
import { generateWeeklyPlan } from '@/features/planner/utils/generatePlan';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween'; // Needed for getPlanForDate logic

dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

interface PlannerState {
    currentPlan: WeeklyPlan | null;
    generatePlanForWeek: (startDate: string) => WeeklyPlan; // Return the generated plan
    getPlanForDate: (date: string) => WeeklyPlan | null; // Helper to get plan containing a date
    setPlan: (plan: WeeklyPlan | null) => void; // Action to manually set/clear the plan
    // TODO: Add actions for updating/modifying plan (e.g., mark workout complete, drag/drop)
}

// Create the IDB storage instance, typed for PlannerState
// Uses the generic <PlannerState> and expects no arguments
const idbStorage = createIdbStorage<PlannerState>();

export const usePlannerStore = create<PlannerState>()(
    persist(
        (set, get) => ({
            currentPlan: null, // Initialize with null

            generatePlanForWeek: (startDate) => {
                console.log(`Attempting to generate plan for week starting: ${startDate}`);
                // Ensure startDate is a Monday
                let effectiveStartDate = startDate;
                if (dayjs(startDate).day() !== 1) {
                    effectiveStartDate = dayjs(startDate).startOf('week').add(1, 'day').format('YYYY-MM-DD');
                    console.warn(`Planner Store: Requested start date ${startDate} was not a Monday. Adjusted to ${effectiveStartDate}.`);
                }

                const newPlan = generateWeeklyPlan(effectiveStartDate);
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
            }
        }),
        {
            name: 'planner-storage', // Unique name for this persistence instance
            // Use the custom idbStorage directly, as it handles StorageValue objects
            storage: idbStorage
            // Removed partialize to match the storage type PersistStorage<PlannerState>
            // Optional: Add migration logic if state shape changes later
            // version: 1,
            // migrate: (persistedState, version) => { ... }
        }
    )
);

// ----- Initialization Logic -----
// Exported function to be called explicitly from client-side code (e.g., root layout or effect hook)
export const initializePlannerStore = (forceRegenerate: boolean = false): WeeklyPlan | null => {
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
             generatedPlan = generatePlanForWeek(startDateToGenerate);
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