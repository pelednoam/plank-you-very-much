import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import type { Workout, WorkoutType, UserProfile } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage'; // Added
import { generateWeeklyPlan } from '@/lib/plannerUtils'; // Import plan generation utility
import dayjs from 'dayjs'; // Import for date handling

interface PlannerState {
  workouts: Workout[];
  addWorkout: (workoutData: Omit<Workout, 'id'>) => Workout; // Returns the created workout with ID
  updateWorkout: (id: string, updates: Partial<Omit<Workout, 'id'>>) => void;
  toggleWorkoutComplete: (id: string) => void;
  removeWorkout: (id: string) => void;
  getWorkoutsForDate: (date: string) => Workout[]; // date in ISO YYYY-MM-DD format
  generatePlan: (startDate: string | Date, userProfile: Partial<UserProfile>) => Workout[]; // New function to generate and add workouts
  clearPlanForWeek: (startDate: string | Date) => void; // Clear all workouts for a given week
}

export const usePlannerStore = create(
  persist<PlannerState>(
    (set, get) => ({
      workouts: [], // Start with an empty list

      addWorkout: (workoutData) => {
        const newWorkout: Workout = {
          ...workoutData,
          id: uuidv4(), // Assign a unique ID
        };
        set((state) => ({ workouts: [...state.workouts, newWorkout] }));
        return newWorkout;
      },

      updateWorkout: (id, updates) => {
        set((state) => ({
          workouts: state.workouts.map(w => w.id === id ? { ...w, ...updates } : w)
        }));
      },

      toggleWorkoutComplete: (id) => {
        set((state) => ({
          workouts: state.workouts.map(w =>
            w.id === id
              ? { ...w, completedAt: w.completedAt ? undefined : new Date().toISOString() }
              : w
          )
        }));
      },

      removeWorkout: (id) => {
        set((state) => ({ workouts: state.workouts.filter(w => w.id !== id) }));
      },

      getWorkoutsForDate: (date) => {
        // Basic date matching (assumes plannedAt is full ISO string)
        // More robust date comparison might be needed
        return get().workouts.filter(w => w.plannedAt.startsWith(date));
      },

      /**
       * Generates a weekly workout plan starting from the specified date,
       * adds all generated workouts to the store, and returns them.
       */
      generatePlan: (startDate, userProfile) => {
        const dateObj = dayjs(startDate).startOf('week'); // Ensure we start at the beginning of the week
        const existingWorkouts = get().workouts; // Get current workouts for conflict avoidance
        
        // Call the utility function to generate the plan
        const generatedPlan = generateWeeklyPlan({
          startDate: dateObj,
          userProfile,
          existingWorkouts,
        });
        
        // Add each workout to the store
        const addedWorkouts: Workout[] = [];
        generatedPlan.forEach((workoutData) => {
          const newWorkout = get().addWorkout(workoutData);
          addedWorkouts.push(newWorkout);
        });

        // Return the added workouts for convenience
        return addedWorkouts;
      },
      
      /**
       * Removes all workouts that fall within the specified week.
       * Useful before regenerating a plan for a given week.
       */
      clearPlanForWeek: (startDate) => {
        const weekStart = dayjs(startDate).startOf('week');
        const weekEnd = weekStart.add(6, 'day').endOf('day');
        
        // Remove workouts that fall within the week
        set((state) => ({
          workouts: state.workouts.filter(workout => {
            const workoutDate = dayjs(workout.plannedAt);
            return !workoutDate.isAfter(weekStart) || !workoutDate.isBefore(weekEnd);
          })
        }));
      },
    }),
    {
      name: 'planner-storage', // Unique name for this store
      storage: createIdbStorage<PlannerState>(), // Use IDB storage
    }
  )
);

// Example Selectors
export const selectAllWorkouts = (state: PlannerState) => state.workouts;
export const selectCompletedWorkouts = (state: PlannerState) => state.workouts.filter(w => w.completedAt);
export const selectPendingWorkouts = (state: PlannerState) => state.workouts.filter(w => !w.completedAt); 