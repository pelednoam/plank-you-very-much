import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import type { Workout, WorkoutType } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage'; // Added

interface PlannerState {
  workouts: Workout[];
  addWorkout: (workoutData: Omit<Workout, 'id'>) => Workout; // Returns the created workout with ID
  updateWorkout: (id: string, updates: Partial<Omit<Workout, 'id'>>) => void;
  toggleWorkoutComplete: (id: string) => void;
  removeWorkout: (id: string) => void;
  getWorkoutsForDate: (date: string) => Workout[]; // date in ISO YYYY-MM-DD format
  // TODO: Add actions for generating weekly plan based on rules (Section 8)
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

      // TODO: Implement weekly plan generation logic
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