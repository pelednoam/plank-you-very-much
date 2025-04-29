import type { Workout } from '@/types';

// Represents a single day in the weekly plan
export interface PlannedDay {
    date: string; // YYYY-MM-DD
    workout: Workout | null; // Workout scheduled for the day, or null for rest/empty
    // Could add flags like 'isRestDay', 'isFlexible' etc. later
}

// Represents the entire weekly plan
export interface WeeklyPlan {
    startDate: string; // YYYY-MM-DD, typically a Monday
    endDate: string; // YYYY-MM-DD, typically a Sunday
    days: PlannedDay[];
}

// Placeholder for settings that influence plan generation
export interface PlannerSettings {
    // Example: User preferences, constraints like 'no climbing on Tuesdays'
    preferredRestDay?: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    backPainFlag?: boolean; // To trigger modifications later
} 