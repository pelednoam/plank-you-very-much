import dayjs from 'dayjs';
import type { Workout, WorkoutType, UserProfile } from '@/types';

interface GeneratePlanOptions {
  startDate: dayjs.Dayjs;
  userProfile: Partial<UserProfile>; // Use partial as not all profile data might be needed initially
  existingWorkouts?: Workout[]; // Optional: To avoid scheduling over existing manual entries
}

/**
 * Generates a basic weekly workout plan based on user profile and requirements.
 * Spec Section 8, Algo 4
 *
 * TODO:
 * - Improve workout distribution logic (avoid back-to-back intensity).
 * - Factor in existing workouts to avoid scheduling conflicts.
 * - Add STRENGTH workouts if equipment is available.
 * - Consider user's preferred workout times/days (future feature).
 * - Refine default durations/times.
 */
export function generateWeeklyPlan(
  options: GeneratePlanOptions
): Omit<Workout, 'id' | 'completedAt'>[] { // Return workouts ready for store's addWorkout
  const { startDate, userProfile, existingWorkouts } = options;
  const weekPlan: Omit<Workout, 'id' | 'completedAt'>[] = [];

  // Base weekly requirements
  let requiredWorkouts: WorkoutType[] = [
    'CLIMB', 'CLIMB',
    'SWIM', 'SWIM',
    'CORE', 'CORE',
    'REST',
  ];

  // Adapt plan based on back issues flag
  if (userProfile.backIssues) {
    const climbIndex = requiredWorkouts.findIndex(type => type === 'CLIMB');
    if (climbIndex !== -1) {
      console.log("User has back issues, replacing one CLIMB with MOBILITY.");
      requiredWorkouts.splice(climbIndex, 1, 'MOBILITY');
    } else if (requiredWorkouts.length < 7) {
      // Fallback: Add mobility if no climb was found but space exists
      requiredWorkouts.push('MOBILITY');
    } else {
       // Fallback 2: Replace REST if no climb found and week is full
       const restIndex = requiredWorkouts.findIndex(type => type === 'REST');
       if (restIndex !== -1) {
         console.log("User has back issues, no CLIMB found, replacing REST with MOBILITY.");
         requiredWorkouts.splice(restIndex, 1, 'MOBILITY');
       }
    }
  }

  // Simple distribution: Assign one workout per day for now.
  // Using a Map to track which required workouts have been assigned
  const assignedWorkouts = new Map<WorkoutType, number>();
  requiredWorkouts.forEach(type => assignedWorkouts.set(type, (assignedWorkouts.get(type) || 0) + 1));

  const workoutSchedule: { [dayOfWeek: number]: WorkoutType | undefined } = {};

  // Assign workouts day by day, trying to fulfill requirements
  // Basic logic: prioritize assigning required types, then fill remaining
  const days = Array.from({length: 7}, (_, i) => startDate.add(i, 'day').day()); // Get days [0..6] for the week

  // Attempt a somewhat balanced assignment (example)
  const preferredOrder: WorkoutType[] = ['CLIMB', 'SWIM', 'CORE', 'MOBILITY', 'REST']; // Order matters slightly

  days.forEach(dayIndex => {
      for (const type of preferredOrder) {
          if ((assignedWorkouts.get(type) || 0) > 0 && !workoutSchedule[dayIndex]) {
               // Very basic conflict avoidance (e.g., don't put two climbs next to each other if possible)
               const prevDayWorkout = workoutSchedule[(dayIndex + 6) % 7]; // Check previous day
               if (type === 'CLIMB' && prevDayWorkout === 'CLIMB') continue; // Avoid back-to-back climb for now

               workoutSchedule[dayIndex] = type;
               assignedWorkouts.set(type, (assignedWorkouts.get(type) || 1) - 1);
               break; // Move to next day
          }
      }
  });

  // Fill any remaining days if schedule incomplete (shouldn't happen with 7 required)
  days.forEach(dayIndex => {
      if (!workoutSchedule[dayIndex]) {
          const remainingType = preferredOrder.find(type => (assignedWorkouts.get(type) || 0) > 0);
          if (remainingType) {
              workoutSchedule[dayIndex] = remainingType;
               assignedWorkouts.set(remainingType, (assignedWorkouts.get(remainingType) || 1) - 1);
          }
      }
  });


  for (let i = 0; i < 7; i++) {
    const currentDay = startDate.add(i, 'day');
    const workoutType = workoutSchedule[currentDay.day()]; // Get workout based on day of week (0=Sun, 6=Sat)

    if (!workoutType) {
      console.warn(`No workout assigned for ${currentDay.format('YYYY-MM-DD')} (Day ${currentDay.day()})`);
      continue;
    }

    // Default times/durations (can be refined)
    let durationMin = 60;
    let defaultTime = '09:00:00'; // Default to 9 AM

    if (workoutType === 'CORE' || workoutType === 'MOBILITY') {
      durationMin = 30;
    } else if (workoutType === 'REST') {
      durationMin = 0; // Represent as 0 duration, full-day marker
      defaultTime = '00:00:00';
    }

    const plannedAt = dayjs(`${currentDay.format('YYYY-MM-DD')}T${defaultTime}`).toISOString();

    // Check for conflicts with existing workouts (basic check)
    const conflict = existingWorkouts?.some(existing =>
        dayjs(existing.plannedAt).isSame(currentDay, 'day')
    );

    if (conflict) {
        console.log(`Skipping generated ${workoutType} on ${currentDay.format('YYYY-MM-DD')} due to existing workout.`);
        continue;
    }

    weekPlan.push({
      type: workoutType,
      plannedAt,
      durationMin,
    });
  }

  console.log("Generated plan for week starting", startDate.format('YYYY-MM-DD'), weekPlan);
  return weekPlan;
} 