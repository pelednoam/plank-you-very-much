import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import type { Workout, WorkoutType, UserProfile, ActivityLevel } from '@/types';

dayjs.extend(isBetween);

interface GeneratePlanOptions {
  startDate: dayjs.Dayjs; // Should be start of the week
  userProfile: Partial<UserProfile>;
  existingWorkouts?: Workout[];
}

// Define default durations for different workout types
const DEFAULT_DURATIONS: Record<WorkoutType, number> = {
    CLIMB: 90,
    SWIM: 60,
    CORE: 30,
    STRENGTH: 60,
    MOBILITY: 20,
    REST: 0, // Rest day is marked by absence of other workouts or a specific REST type workout
};

// Define intensity levels for scheduling constraints
const WORKOUT_INTENSITY: Record<WorkoutType, 'high' | 'medium' | 'low' | 'rest'> = {
    CLIMB: 'high',
    STRENGTH: 'high',
    SWIM: 'medium',
    CORE: 'low',
    MOBILITY: 'low',
    REST: 'rest',
};

/**
 * Generates an enhanced weekly workout plan based on user profile and requirements.
 * Aims for better distribution and adapts to back issues.
 *
 * Spec Section 8, Algo 4 (Enhanced)
 */
export function generateWeeklyPlan(
  options: GeneratePlanOptions
): Omit<Workout, 'id' | 'completedAt'>[] {
  const { startDate, userProfile, existingWorkouts = [] } = options;
  const weekPlan: Omit<Workout, 'id' | 'completedAt'>[] = [];
  const schedule: { [dayIndex: number]: WorkoutType | 'TAKEN' | undefined } = {}; // 0 = Sunday, ..., 6 = Saturday
  const daysInWeek = 7;

  // --- 1. Determine Weekly Targets --- 
  const targetCounts: { [key in WorkoutType]?: number } = {
    CLIMB: 2,
    SWIM: 2,
    CORE: 2,
    STRENGTH: 1,
    // REST/MOBILITY handled below
  };

  if (userProfile.backIssues) {
    console.log("Adapting plan for back issues.");
    targetCounts.CLIMB = 1; // Reduce climb
    targetCounts.MOBILITY = 1; // Add mobility
    // STRENGTH might also need adjustment depending on specific issue - keep 1 for now
  } else {
      targetCounts.MOBILITY = 0; // No specific mobility if no back issues
  }

  // Calculate total required workouts to ensure we aim for roughly one per day
  let totalRequired = Object.values(targetCounts).reduce((sum, count) => sum + (count || 0), 0);
  // We implicitly want one REST day unless totalRequired >= 7
  let needsRestDay = totalRequired < daysInWeek;

  // --- 2. Identify Available Days --- 
  for (let i = 0; i < daysInWeek; i++) {
    const currentDay = startDate.add(i, 'day');
    const hasExistingWorkout = existingWorkouts.some(w => dayjs(w.plannedAt).isSame(currentDay, 'day'));
    if (hasExistingWorkout) {
      schedule[i] = 'TAKEN';
      console.log(`Day ${i} (${currentDay.format('YYYY-MM-DD')}) is taken by existing workout.`);
      // If a day is taken, we might need fewer generated workouts
      totalRequired = Math.max(0, totalRequired -1); // Decrement needed, effectively removing a slot
      needsRestDay = totalRequired < (daysInWeek - 1); // Re-evaluate if rest day needed
    }
  }

  // --- 3. Prioritize Placement --- 
  const placeWorkout = (type: WorkoutType, dayIndex: number): boolean => {
      if (schedule[dayIndex] === undefined) {
          schedule[dayIndex] = type;
          targetCounts[type] = (targetCounts[type] ?? 1) - 1;
          return true;
      }
      return false;
  };

  const findPlacement = (type: WorkoutType, preferredDays?: number[], avoidAdjacent?: WorkoutType[]): boolean => {
      const intensity = WORKOUT_INTENSITY[type];
      const daysToTry = preferredDays ? preferredDays : Array.from({ length: daysInWeek }, (_, i) => i);

      for (const dayIndex of daysToTry) {
          if (schedule[dayIndex] === undefined) {
              // Check constraints
              const prevDayIndex = (dayIndex - 1 + daysInWeek) % daysInWeek;
              const nextDayIndex = (dayIndex + 1) % daysInWeek;
              const prevWorkout = schedule[prevDayIndex]; // Type is WorkoutType | 'TAKEN' | undefined
              const nextWorkout = schedule[nextDayIndex]; // Type is WorkoutType | 'TAKEN' | undefined

              // Avoid adjacent high intensity?
              if (intensity === 'high') {
                  if (prevWorkout && prevWorkout !== 'TAKEN' && WORKOUT_INTENSITY[prevWorkout] === 'high') continue;
                  if (nextWorkout && nextWorkout !== 'TAKEN' && WORKOUT_INTENSITY[nextWorkout] === 'high') continue;
              }
              
              // Avoid adjacent specific types?
              if (avoidAdjacent) {
                  if (prevWorkout && prevWorkout !== 'TAKEN' && avoidAdjacent.includes(prevWorkout)) continue;
                  if (nextWorkout && nextWorkout !== 'TAKEN' && avoidAdjacent.includes(nextWorkout)) continue;
              }

              // Place it!
              return placeWorkout(type, dayIndex);
          }
      }
      // Fallback: Place in first available slot if preferred/constrained placement failed
      for (let i = 0; i < daysInWeek; i++) {
          if (schedule[i] === undefined) {
              return placeWorkout(type, i);
          }
      }
      return false; // No slot found
  };

  // 3a. Place REST day (if needed)
  if (needsRestDay) {
    findPlacement('REST', [3, 6, 5]); // Prefer Wed, Sat, Fri
  }

  // 3b. Place High Intensity (CLIMB, STRENGTH)
  for (let i = 0; i < (targetCounts.CLIMB ?? 0); i++) findPlacement('CLIMB', undefined, ['REST']);
  for (let i = 0; i < (targetCounts.STRENGTH ?? 0); i++) findPlacement('STRENGTH', undefined, ['REST']);

  // 3c. Place MOBILITY (if needed)
  for (let i = 0; i < (targetCounts.MOBILITY ?? 0); i++) findPlacement('MOBILITY');

  // 3d. Place Medium/Low Intensity (SWIM, CORE)
  for (let i = 0; i < (targetCounts.SWIM ?? 0); i++) findPlacement('SWIM');
  for (let i = 0; i < (targetCounts.CORE ?? 0); i++) findPlacement('CORE');

  // --- 4. Generate Workout Objects --- 
  for (let i = 0; i < daysInWeek; i++) {
    const workoutType = schedule[i];
    if (workoutType && workoutType !== 'TAKEN' && workoutType !== 'REST') {
      const currentDay = startDate.add(i, 'day');
      const plannedAt = dayjs(`${currentDay.format('YYYY-MM-DD')}T09:00:00`).toISOString(); // Default 9 AM
      const durationMin = DEFAULT_DURATIONS[workoutType];

      weekPlan.push({
        type: workoutType,
        plannedAt,
        durationMin,
      });
    }
  }

  console.log("Generated enhanced plan:", weekPlan);
  return weekPlan;
} 