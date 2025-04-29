import dayjs from 'dayjs';
import type { WeeklyPlan, PlannedDay, PlannerSettings } from '@/features/planner/types';
import type { Workout } from '@/types';

const REQUIRED_WORKOUTS: Workout['type'][] = ['CLIMB', 'CLIMB', 'SWIM', 'SWIM', 'CORE', 'CORE'];
const MAX_REST_DAYS = 1;
const WEEK_LENGTH = 7;

/**
 * Generates a basic weekly workout plan based on predefined rules.
 *
 * Rules:
 * - >= 2 CLIMB
 * - >= 2 SWIM
 * - >= 2 CORE
 * - <= 1 REST
 * - Total 7 days
 *
 * @param startDate - The start date of the week (YYYY-MM-DD), typically a Monday.
 * @param settings - Optional planner settings (currently unused but planned for future flexibility).
 * @returns A WeeklyPlan object.
 */
export function generateWeeklyPlan(
    startDate: string,
    settings?: PlannerSettings
): WeeklyPlan {
    const start = dayjs(startDate);
    const days: PlannedDay[] = [];
    const workoutsToSchedule = [...REQUIRED_WORKOUTS];

    // Simple shuffling strategy for initial placement
    // (More sophisticated logic needed for constraints, preferences, back pain flags etc.)
    workoutsToSchedule.sort(() => Math.random() - 0.5);

    let restDaysPlaced = 0;

    for (let i = 0; i < WEEK_LENGTH; i++) {
        const currentDate = start.add(i, 'day').format('YYYY-MM-DD');
        let workout: Workout | null = null;

        // Prioritize placing required workouts
        if (workoutsToSchedule.length > 0) {
            const workoutType = workoutsToSchedule.pop()!;
            // Create a placeholder workout object
            workout = {
                id: `${workoutType}-${currentDate}-${Math.random().toString(36).substring(2, 9)}`,
                type: workoutType,
                plannedAt: currentDate,
                durationMin: workoutType === 'CLIMB' ? 90 : (workoutType === 'SWIM' ? 45 : 30), // Example durations
            };
        } else if (restDaysPlaced < MAX_REST_DAYS) {
            // Place rest day if required workouts are done and rest days are available
            workout = null; // Explicitly null for rest
            restDaysPlaced++;
        } else {
            // This case should ideally not happen if rules are consistent
            // Fallback: add another CORE workout? Or handle error?
            console.warn("Ran out of workouts and rest days unexpectedly.");
            // For now, just add a default CORE workout to fill the week
             workout = {
                id: `CORE-${currentDate}-fallback-${Math.random().toString(36).substring(2, 9)}`,
                type: 'CORE',
                plannedAt: currentDate,
                durationMin: 30,
            };
        }

        days.push({
            date: currentDate,
            workout: workout,
        });
    }

    // Ensure the final plan distribution meets minimums (or log error if generation failed)
    // TODO: Add validation logic here if needed

    return {
        startDate: start.format('YYYY-MM-DD'),
        endDate: start.add(6, 'day').format('YYYY-MM-DD'),
        days: days,
    };
} 