'use server';

import { usePlannerStore } from "@/store/plannerStore";
import { generateWeeklyPlan } from "../utils/generatePlan";
import { useUserProfileStore } from "@/store/userProfileStore";
import dayjs from 'dayjs';

// Action to generate or regenerate a plan for a specific week
export const generatePlanAction = async (startDate: string) => {
    // Ensure date is a Monday?
    const targetDate = dayjs(startDate);
    if (targetDate.day() !== 1) {
        console.warn(`[PlannerAction] Requested start date ${startDate} is not a Monday. Adjusting.`);
        startDate = targetDate.day(1).format('YYYY-MM-DD');
    }
    
    // Note: Server actions cannot directly call Zustand hooks like getState().
    // This action should likely be called from the client where store access is possible,
    // or it needs a way to get profile/previous plan data passed to it or from a server session.
    
    // Placeholder - Ideally, this would fetch profile/previous plan from DB based on user session
    console.log(`[PlannerAction] Generating plan for week starting ${startDate} (using store on client expected)`);
    // const userProfile = await getUserProfileFromServer(); // Hypothetical server fetch
    // const previousPlan = await getPreviousPlanFromServer(startDate, userId); // Hypothetical
    // const newPlan = generateWeeklyPlan(startDate, userProfile, previousPlan);
    // await savePlanToServer(newPlan, userId); // Hypothetical save
    
    // For now, this action doesn't DO anything on the server, it relies on the client calling
    // the Zustand store's generatePlanForWeek method.
    return { success: true, message: "Plan generation initiated (client-side store expected)" };
};

// --- NEW SERVER ACTION --- 
/**
 * Server Action to update a workout's completion status.
 * Called by the offline sync manager.
 * Replace with actual database update logic.
 */
export const updateWorkoutCompletionServer = async (
    workoutId: string, 
    isComplete: boolean, 
    completedAt?: string | null // Optional timestamp
): Promise<{ success: boolean; error?: string }> => {
    'use server';
    console.log(`[Server Action] Attempting to update workout ${workoutId} completion to ${isComplete}`);
    
    // --- Placeholder Logic --- 
    // Replace with actual DB call (e.g., Prisma, Supabase client)
    // const userId = await getCurrentUserId(); // Get current user ID
    // if (!userId) return { success: false, error: 'Unauthorized' };
    
    // Simulate database update
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    
    // Simulate potential random failure for testing retry logic
    if (Math.random() < 0.2) { // 20% chance of failure
         console.error(`[Server Action] Simulated failure updating workout ${workoutId}`);
         return { success: false, error: 'Simulated DB Error' };
    }
    // --- End Placeholder Logic --- 
    
    console.log(`[Server Action] Successfully updated workout ${workoutId} completion status (simulated).`);
    return { success: true };
}; 