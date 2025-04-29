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
    userProfile?: UserProfile | null,
    previousWeekPlan?: WeeklyPlan | null // Add previous week's plan
): WeeklyPlan => {
    const start = dayjs(startDate);
    const endDate = start.add(6, 'days').format('YYYY-MM-DD');
    const workouts: Workout[] = [];

    // --- Plan Adaptation Logic --- 
    let workoutsCompletedLastWeek = 0;
    let coreWorkoutsMissedLastWeek = 0;
    let climbWorkoutsMissedLastWeek = 0;
    let swimWorkoutsMissedLastWeek = 0;
    const totalWorkoutsPlannedLastWeek = previousWeekPlan?.workouts?.filter(w => w.type !== 'REST').length ?? 0;

    if (previousWeekPlan?.workouts) {
        previousWeekPlan.workouts.forEach(workout => {
            if (workout.type !== 'REST') {
                if (workout.completedAt) {
                    workoutsCompletedLastWeek++;
                } else {
                    // Track missed workouts by type
                    if (workout.type === 'CORE') coreWorkoutsMissedLastWeek++;
                    if (workout.type === 'CLIMB') climbWorkoutsMissedLastWeek++;
                    if (workout.type === 'SWIM') swimWorkoutsMissedLastWeek++;
                }
            }
        });
    }
    // Calculate completion rate (avoid division by zero)
    const completionRate = totalWorkoutsPlannedLastWeek > 0 
        ? workoutsCompletedLastWeek / totalWorkoutsPlannedLastWeek 
        : 1; // Assume 100% if nothing was planned

    // --- Select and Modify Template --- 
    let templateToUse = userProfile?.backIssues ? backCareTemplate : defaultWeeklyTemplate;

    // Basic Adaptation Rule: If many workouts were missed, add more rest/mobility
    // Example: If < 50% completion rate or multiple CORE workouts missed, maybe force back care
    if (completionRate < 0.5 || coreWorkoutsMissedLastWeek >= 2) {
        console.log('[generatePlan] Low completion or missed core last week, prioritizing back care/rest.');
        // Simple approach: Use backCareTemplate or even consider adding an extra REST/MOBILITY day
        // For now, just switch to backCareTemplate if not already selected
        if (!userProfile?.backIssues) {
             templateToUse = backCareTemplate;
        }
        // More complex logic could replace a missed type with REST/MOBILITY
    }

    const shuffledTypes = shuffleArray([...templateToUse]);

    // --- Calculate Durations with Adaptation --- 
    const fatLossActive = isFatLossGoalActive(userProfile);
    const increaseDurationFactor = completionRate >= 0.85 ? 1.1 : 1.0; // Increase duration by 10% if completion was good
    const decreaseDurationFactor = completionRate < 0.5 ? 0.9 : 1.0; // Decrease duration by 10% if completion was poor

    // --- Create Workout Objects --- 
    for (let i = 0; i < 7; i++) {
        const currentDate = start.add(i, 'day').format('YYYY-MM-DD');
        const workoutType = shuffledTypes[i];
        let baseDuration = BASE_DURATIONS[workoutType];
        let adjustedDuration = baseDuration;

        // 1. Adjust for Fat Loss Goal
        if (fatLossActive && (workoutType === 'CLIMB' || workoutType === 'SWIM')) {
            adjustedDuration += 15; // Add flat 15 mins
        }

        // 2. Adjust for Last Week's Completion Rate (Progressive Overload/Reduction)
        adjustedDuration = Math.round(adjustedDuration * increaseDurationFactor * decreaseDurationFactor);
        
        // Ensure duration doesn't go below a minimum (e.g., 5 mins) or become excessive
        adjustedDuration = Math.max(5, adjustedDuration); 
        // Could add a Math.min cap as well if needed

        const workout: Workout = {
            id: uuidv4(),
            type: workoutType,
            plannedAt: currentDate, 
            durationMin: adjustedDuration, // Use the adapted duration
            completedAt: undefined, 
            notes: undefined,
            performanceRating: undefined,
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