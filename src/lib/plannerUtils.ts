import dayjs from 'dayjs';
import { Workout } from './types';
import { v4 as uuidv4 } from 'uuid'; // Need to install uuid

/**
 * Generates a static weekly workout plan based on Section 8 rules.
 * Placeholder implementation - does not yet consider user profile or busy blocks.
 *
 * Rules:
 * - Required: >=2 climb, >=2 swim, >=2 core, <=1 rest.
 * - Total = 7 sessions.
 */
export function generateWeeklyPlan(weekStartDate: dayjs.Dayjs): Workout[] {
  const plan: Workout[] = [];
  const days = Array.from({ length: 7 }).map((_, i) => weekStartDate.add(i, 'day'));

  // Basic static schedule (adjust as needed)
  const schedule: Array<Workout['type'] | null> = [
    'CLIMB',
    'SWIM',
    'CORE',
    'CLIMB',
    'SWIM',
    'CORE',
    'REST',
  ];

  // Ensure rules are met (simple check for this static plan)
  // const climbCount = schedule.filter(t => t === 'CLIMB').length;
  // const swimCount = schedule.filter(t => t === 'SWIM').length;
  // const coreCount = schedule.filter(t => t === 'CORE').length;
  // const restCount = schedule.filter(t => t === 'REST').length;
  // console.log(`Generated - Climb: ${climbCount}, Swim: ${swimCount}, Core: ${coreCount}, Rest: ${restCount}`);

  days.forEach((day, index) => {
    const workoutType = schedule[index];
    if (workoutType) { // Don't create an entry for REST day, treat absence as rest
      plan.push({
        id: uuidv4(),
        type: workoutType,
        // Plan for midday, adjust later based on preferences/calendar
        plannedAt: day.hour(12).minute(0).second(0).toISOString(),
        durationMin: workoutType === 'CLIMB' || workoutType === 'SWIM' ? 60 : 30, // Example durations
        completed: false,
      });
    }
  });

  return plan;
}

// TODO:
// - Implement BMR/TDEE calculation (Section 8.1)
// - Implement Calorie deficit calculation (Section 8.2)
// - Implement Protein target calculation (Section 8.3)
// - Enhance planner algorithm (Section 8.4):
//   - Consider user busy blocks (needs calendar integration placeholder)
//   - Adapt based on back-pain flag (needs user profile integration)
//   - Add STRENGTH and mobility sessions
//   - Make schedule dynamic, not static 