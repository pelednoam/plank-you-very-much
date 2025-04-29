import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutType, Workout, UserProfile, WeeklyPlan } from '@/types';

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

// Define base durations
const BASE_DURATIONS: Record<WorkoutType, number> = {
    CLIMB: 90,
    SWIM: 45,
    CORE: 30,
    STRENGTH: 60,
    MOBILITY: 20,
    REST: 0,
};

// Function to determine if fat loss goal is active
const isFatLossGoalActive = (profile?: UserProfile | null): boolean => {
    return !!profile && 
           profile.targetBodyFatPct !== undefined && profile.targetBodyFatPct >= 0 && // Allow 0% target
           profile.targetDate !== undefined && 
           dayjs(profile.targetDate).isValid() && 
           dayjs(profile.targetDate).isAfter(dayjs());
};

// Generate a weekly plan starting from a given Monday
// Now accepts optional user profile data
export const generateWeeklyPlan = (
    startDate: string, // Should be 'YYYY-MM-DD' format of a Monday
    userProfile?: UserProfile | null // Optional user profile
): WeeklyPlan => {
    const start = dayjs(startDate);
    const endDate = start.add(6, 'days').format('YYYY-MM-DD');
    const workouts: Workout[] = [];

    // Determine which template to use
    const templateToUse = userProfile?.backIssues ? backCareTemplate : defaultWeeklyTemplate;

    // Shuffle the chosen template for variety
    const shuffledTypes = shuffleArray([...templateToUse]);

    // Check if fat loss goal is active
    const fatLossActive = isFatLossGoalActive(userProfile);

    // Create workout objects for each day
    for (let i = 0; i < 7; i++) {
        const currentDate = start.add(i, 'day').format('YYYY-MM-DD');
        const workoutType = shuffledTypes[i];

        // Assign duration: Base duration + adjustment for fat loss goal
        let durationMin = BASE_DURATIONS[workoutType];
        
        if (fatLossActive) {
            // Increase duration for calorie-burning activities
            if (workoutType === 'CLIMB') {
                durationMin += 15; // e.g., 90 -> 105
            } else if (workoutType === 'SWIM') {
                durationMin += 15; // e.g., 45 -> 60
            }
             // Optionally adjust CORE/STRENGTH slightly too, or leave as is
             // else if (workoutType === 'CORE') {
             //    durationMin += 5;
             // }
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

    // Return object matching the WeeklyPlan interface
    return {
        startDate,
        endDate,
        workouts, // Directly return workouts array
    };
}; 