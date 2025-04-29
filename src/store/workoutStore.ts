import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workout } from '@/types';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import { createIdbStorage } from '@/lib/idbStorage';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

dayjs.extend(isToday);

interface WorkoutState {
    workouts: Workout[];
    addWorkout: (workoutData: Omit<Workout, 'id' | 'completedAt' | 'startedAt' | 'syncStatus' | 'actualDurationMin' | 'performanceNotes' | 'rating'>) => Workout;
    updateWorkout: (id: string, updates: Partial<Workout>) => void;
    toggleWorkoutComplete: (id: string) => void;
    getWorkoutsByDate: (date: string) => Workout[]; // date as YYYY-MM-DD
    getTodayWorkouts: () => Workout[];
    getWorkoutById: (id: string) => Workout | undefined;
    // TODO: Add functions for weekly plan generation/fetching if needed
}

export const useWorkoutStore = create(
    persist<WorkoutState>(
        (set, get) => ({
            workouts: [],

            addWorkout: (workoutData) => {
                const newWorkout: Workout = {
                    ...workoutData,
                    id: uuidv4(),
                };
                set((state) => ({ workouts: [...state.workouts, newWorkout] }));
                console.log('[WorkoutStore] Added:', newWorkout);
                return newWorkout;
            },

            updateWorkout: (id, updates) => {
                set((state) => ({
                    workouts: state.workouts.map((w) =>
                        w.id === id ? { ...w, ...updates } : w
                    ),
                }));
                console.log('[WorkoutStore] Updated workout:', id, updates);
            },

            toggleWorkoutComplete: (id) => {
                const now = dayjs().toISOString();
                set((state) => ({
                    workouts: state.workouts.map((w) =>
                        w.id === id ? { ...w, completedAt: w.completedAt ? undefined : now } : w
                    ),
                }));
                const updatedWorkout = get().workouts.find(w => w.id === id);
                console.log('[WorkoutStore] Toggled complete:', id, updatedWorkout?.completedAt);
            },

            getWorkoutsByDate: (date) => { // Expects YYYY-MM-DD
                return get().workouts.filter(w => dayjs(w.plannedAt).format('YYYY-MM-DD') === date);
            },

            getTodayWorkouts: () => {
                const todayStr = dayjs().format('YYYY-MM-DD');
                return get().getWorkoutsByDate(todayStr);
            },
            
            getWorkoutById: (id) => {
                return get().workouts.find(w => w.id === id);
            },
        }),
        {
            name: 'workout-storage',
            storage: createIdbStorage<WorkoutState>(),
            partialize: (state) => ({
                workouts: state.workouts,
            }) as any, // Ensure 'as any' bypasses the type check
        }
    )
);

// Example selector (optional)
export const selectTodayWorkouts = (state: WorkoutState) => state.getTodayWorkouts(); 