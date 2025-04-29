import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutType } from '@/types'; // Assuming WorkoutType is defined in types/index.ts
import type { Workout, UserProfile } from '@/types'; // Import UserProfile

// Function to shuffle an array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Define a basic weekly schedule template
// Spec: ≥2 climb, ≥2 swim, ≥2 core, ≤1 rest
// Default: 2 Climb, 2 Swim, 2 Core, 1 Rest = 7 days
const defaultWeeklyTemplate: WorkoutType[] = ['CLIMB', 'SWIM', 'CORE', 'CLIMB', 'SWIM', 'CORE', 'REST'];
// Add a mobility workout type if not already present in WorkoutType
// Assuming WorkoutType might be: 'CLIMB' | 'SWIM' | 'CORE' | 'STRENGTH' | 'REST' | 'MOBILITY';
const backCareTemplate: WorkoutType[] = ['CLIMB', 'SWIM', 'MOBILITY', 'CLIMB', 'SWIM', 'CORE', 'REST']; // Replace one CORE with MOBILITY

// Generate a weekly plan starting from a given Monday
// Now accepts optional user profile data
export const generateWeeklyPlan = (
    startDate: string, // Should be 'YYYY-MM-DD' format of a Monday
    userProfile?: UserProfile | null // Optional user profile
): { startDate: string; endDate: string; workouts: Workout[] } => {
    const start = dayjs(startDate);
    const endDate = start.add(6, 'days').format('YYYY-MM-DD');
    const workouts: Workout[] = [];

    // Determine which template to use
    const templateToUse = userProfile?.backIssues ? backCareTemplate : defaultWeeklyTemplate;

    // Shuffle the chosen template for variety
    const shuffledTypes = shuffleArray([...templateToUse]);

    // Create workout objects for each day
    for (let i = 0; i < 7; i++) {
        const currentDate = start.add(i, 'day').format('YYYY-MM-DD');
        const workoutType = shuffledTypes[i];

        // Assign basic properties - duration can be refined later based on type/goals
        let durationMin = 0;
        switch(workoutType) {
            case 'CLIMB': durationMin = 90; break;
            case 'SWIM': durationMin = 45; break;
            case 'CORE': durationMin = 30; break;
            case 'STRENGTH': durationMin = 60; break;
            case 'MOBILITY': durationMin = 20; break; // Added duration for mobility
            case 'REST': durationMin = 0; break;
            default: durationMin = 30; // Default duration
        }

        const workout: Workout = {
            id: uuidv4(),
            type: workoutType,
            plannedAt: currentDate, // Assign to the specific day
            durationMin: durationMin,
            completedAt: undefined, // Mark as not completed initially
            notes: undefined,
            performanceRating: undefined,
            // mediaIds: undefined // Placeholder for future media integration
        };
        workouts.push(workout);
    }

    return {
        startDate,
        endDate,
        workouts,
    };
}; 