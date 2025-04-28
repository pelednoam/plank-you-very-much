import { create } from 'zustand';
import { BodyMetrics, Workout, Meal } from '@/lib/types'; // Use alias if configured, else relative path
import {
  getAllBodyMetrics,
  addBodyMetric,
  saveWorkout,
  getAllWorkouts,
  // Add imports for getWorkouts, saveMeal, getMeals etc. from idb.ts
} from '@/lib/idb'; // Use alias if configured, else relative path

// Define interfaces for the state slices
interface UserProfileState {
  userProfile: {
    name: string;
    // TODO: Add other profile fields based on onboarding (height, dob, injury flags, etc.)
  } | null;
  setUserProfile: (profile: UserProfileState['userProfile']) => void;
  // TODO: Add action to save profile to IDB (needs a userProfile store in idb.ts)
}

interface BodyMetricsState {
  bodyMetrics: BodyMetrics[];
  loadBodyMetrics: () => Promise<void>;
  addBodyMetric: (metric: BodyMetrics) => Promise<void>;
}

interface WorkoutState {
  workouts: Workout[];
  loadWorkouts: () => Promise<void>;
  addWorkout: (workout: Workout) => Promise<void>;
  updateWorkout: (workout: Workout) => Promise<void>;
  // TODO: Add deleteWorkout action
}

interface MealState {
  meals: Meal[];
  loadMeals: () => Promise<void>; // TODO: Implement in idb.ts
  addMeal: (meal: Meal) => Promise<void>; // TODO: Implement in idb.ts
}

// Combine state interfaces
export type AppState = UserProfileState & BodyMetricsState & WorkoutState & MealState & {
  isHydrated: boolean;
  setHydrated: (status: boolean) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial State
  isHydrated: false,
  userProfile: null,
  bodyMetrics: [],
  workouts: [],
  meals: [],

  // Actions
  setHydrated: (status) => set({ isHydrated: status }),

  setUserProfile: (profile) => {
    set({ userProfile: profile });
    // TODO: Persist profile to IDB
    // Example: saveUserProfile(profile); // Needs function in idb.ts
  },

  loadBodyMetrics: async () => {
    try {
      const metrics = await getAllBodyMetrics();
      set({ bodyMetrics: metrics });
      console.log('Body metrics loaded from IDB:', metrics.length);
    } catch (error) {
      console.error('Failed to load body metrics from IDB:', error);
    }
  },

  addBodyMetric: async (metric) => {
    try {
      await addBodyMetric(metric);
      set((state) => ({ bodyMetrics: [...state.bodyMetrics, metric] }));
      console.log('Body metric added to IDB and store:', metric.date);
    } catch (error) {
      console.error('Failed to add body metric:', error);
    }
  },

  // Workout Actions
  loadWorkouts: async () => {
    try {
      const workouts = await getAllWorkouts();
      set({ workouts });
      console.log('Workouts loaded from IDB:', workouts.length);
    } catch (error) {
      console.error('Failed to load workouts from IDB:', error);
    }
  },

  addWorkout: async (workout) => {
    // Assumes workout object already has a unique ID generated before calling this
    try {
      await saveWorkout(workout); // Use saveWorkout for simplicity (add/update)
      set((state) => ({ workouts: [...state.workouts, workout] }));
      console.log('Workout added to IDB and store:', workout.id);
    } catch (error) {
      console.error('Failed to add workout:', error);
    }
  },

  updateWorkout: async (workout) => {
    try {
      await saveWorkout(workout);
      set((state) => ({
        workouts: state.workouts.map((w) => (w.id === workout.id ? workout : w)),
      }));
      console.log('Workout updated in IDB and store:', workout.id);
    } catch (error) {
      console.error('Failed to update workout:', error);
    }
  },

  // TODO: Implement deleteWorkout action using deleteWorkout from idb.ts

  // TODO: Implement loadMeals and addMeal actions
  loadMeals: async () => {
    console.warn('loadMeals not implemented yet');
  },

  addMeal: async (meal) => {
    console.warn('addMeal not implemented yet');
  },
}));
