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
export const defaultWeeklyTemplate: WorkoutType[] = ['CLIMB', 'SWIM', 'CORE', 'CLIMB', 'SWIM', 'CORE', 'REST'];
// Add a mobility workout type if not already present in WorkoutType
// Assuming WorkoutType might be: 'CLIMB' | 'SWIM' | 'CORE' | 'STRENGTH' | 'REST' | 'MOBILITY';
export const backCareTemplate: WorkoutType[] = ['CLIMB', 'SWIM', 'MOBILITY', 'CLIMB', 'SWIM', 'CORE', 'REST']; // Replace one CORE with MOBILITY

// Define base durations
export const BASE_DURATIONS: Record<WorkoutType, number> = {
    CLIMB: 90,
    SWIM: 45,
    CORE: 30,
    STRENGTH: 60,
    MOBILITY: 20,
    REST: 0,
};

// Function to determine if fat loss goal is active
export const isFatLossGoalActive = (profile?: UserProfile | null): boolean => {
    return !!profile && 
           profile.targetBodyFatPct !== undefined && profile.targetBodyFatPct >= 0 && // Allow 0% target
           profile.targetDate !== undefined && 
           dayjs(profile.targetDate).isValid() && 
           dayjs(profile.targetDate).isAfter(dayjs());
};

// Placeholder type for availability
type BusyDays = number[]; // Array of day indices (0=Mon, 1=Tue, ..., 6=Sun) considered busy

// Generate a weekly plan starting from a given Monday
// Now accepts optional user profile data and availability
export const generateWeeklyPlan = (
    startDate: string, // Should be 'YYYY-MM-DD' format of a Monday
    userProfile?: UserProfile | null,
    previousWeekPlan?: WeeklyPlan | null,
    busyDays?: BusyDays | null // Add availability placeholder
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
        : null; // Set to null if no workouts last week

    // --- Select and Modify Template --- 
    let templateToUse = userProfile?.backIssues ? backCareTemplate : defaultWeeklyTemplate;

    // Basic Adaptation Rule: If many workouts were missed, add more rest/mobility
    // Example: If < 50% completion rate or multiple CORE workouts missed, maybe force back care
    // Only apply this rule if we have a completion rate to evaluate
    if (completionRate !== null && (completionRate < 0.5 || coreWorkoutsMissedLastWeek >= 2)) {
        // TODO: Refine this rule based on backPainLevel if available (e.g., only switch if pain is also low/moderate)
        console.log('[generatePlan] Low completion or missed core last week, prioritizing back care/rest.');
        if (!userProfile?.backIssues) {
             templateToUse = backCareTemplate;
        }
    }

    let shuffledTypes = shuffleArray([...templateToUse]);

    // --- Availability Placeholder Logic (Simple Swap Attempt) ---
    if (busyDays && busyDays.length > 0) {
        console.log(`[generatePlan] Attempting to adjust plan for busy days: ${busyDays.join(', ')}`);
        const adjustedSchedule = [...shuffledTypes]; // Work on a copy
        const shortWorkouts: WorkoutType[] = ['CORE', 'MOBILITY', 'REST'];

        busyDays.forEach(busyDayIndex => {
            if (busyDayIndex >= 0 && busyDayIndex < 7) {
                const currentWorkout = adjustedSchedule[busyDayIndex];
                // If the busy day has a long workout assigned...
                if (!shortWorkouts.includes(currentWorkout)) {
                    // Look for a free day later in the week with a short workout
                    let swapped = false;
                    for (let freeDayIndex = busyDayIndex + 1; freeDayIndex < 7; freeDayIndex++) {
                        if (!busyDays.includes(freeDayIndex)) {
                            const potentialSwapWorkout = adjustedSchedule[freeDayIndex];
                            if (shortWorkouts.includes(potentialSwapWorkout)) {
                                console.log(`[generatePlan] Swapping busy day ${busyDayIndex} (${currentWorkout}) with free day ${freeDayIndex} (${potentialSwapWorkout})`);
                                // Swap them
                                [adjustedSchedule[busyDayIndex], adjustedSchedule[freeDayIndex]] = 
                                    [adjustedSchedule[freeDayIndex], adjustedSchedule[busyDayIndex]];
                                swapped = true;
                                break; // Stop after first successful swap for this busy day
                            }
                        }
                    }
                    // If no swap possible, maybe just log it for now
                    if (!swapped) {
                         console.log(`[generatePlan] Could not find suitable swap for long workout (${currentWorkout}) on busy day ${busyDayIndex}`);
                    }
                }
            }
        });
        shuffledTypes = adjustedSchedule; // Use the adjusted schedule
    }
    // --- End Availability Logic ---

    // --- Calculate Durations with Adaptation --- 
    const fatLossActive = isFatLossGoalActive(userProfile);
    const increaseDurationFactor = completionRate !== null && completionRate >= 0.85 ? 1.1 : 1.0; 
    const decreaseDurationFactor = completionRate !== null && completionRate < 0.5 ? 0.9 : 1.0; 

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

        // 3. Specific Adjustment for Back Issues (Reduce Climb Intensity)
        // TODO: Enhance this based on backPainLevel if available.
        // E.g., could have different reduction factors (0.9, 0.8, 0.7) based on pain level.
        // Could also potentially modify *type* (e.g., force REST) if pain is very high.
        if (userProfile?.backIssues && workoutType === 'CLIMB') {
            console.log(`[generatePlan] Back issues detected, reducing duration for CLIMB on ${currentDate}`);
            adjustedDuration = Math.round(adjustedDuration * 0.8); // Reduce duration by 20%
        }

        // 4. Ensure duration doesn't go below a minimum (e.g., 5 mins) or become excessive
        adjustedDuration = Math.max(5, adjustedDuration); // Ensure minimum duration
        // Could add a Math.min cap as well if needed

        const workout: Workout = {
            id: uuidv4(),
            type: workoutType,
            plannedAt: currentDate,
            durationMin: adjustedDuration, // Use the final adapted duration
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