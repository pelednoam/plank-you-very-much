import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FitbitDaily } from '@/types'; // Assuming FitbitDaily is the desired shape
import { createIdbStorage } from '@/lib/idbStorage';
import dayjs from 'dayjs';

// Define the shape of the state: using a map for efficient date lookup
interface ActivityState {
  // Key: YYYY-MM-DD date string
  dailyActivities: Record<string, FitbitDaily>; 
  _hasHydrated: boolean; // <-- Add hydration status flag
  // Action to add or update a day's activity summary
  addOrUpdateActivity: (activityData: FitbitDaily) => void;
  getActivityForDate: (date: string) => FitbitDaily | undefined; // Date as YYYY-MM-DD
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      dailyActivities: {},
      _hasHydrated: false, // <-- Initialize hydration flag

      addOrUpdateActivity: (activityData) => {
        if (!activityData || !activityData.date) {
            console.error("Invalid activity data provided to addOrUpdateActivity");
            return;
        }
        // Ensure date is in YYYY-MM-DD format
        const dateKey = dayjs(activityData.date).format('YYYY-MM-DD');
        
        set((state) => ({
          dailyActivities: {
            ...state.dailyActivities,
            [dateKey]: { ...activityData, date: dateKey }, // Store with consistent key
          },
        }));
      },

      getActivityForDate: (date) => {
          const dateKey = dayjs(date).format('YYYY-MM-DD');
          return get().dailyActivities[dateKey];
      },
    }),
    {
      name: 'daily-activity-storage', // Unique name
      storage: createIdbStorage<Pick<ActivityState, 'dailyActivities'>>(), // Persist only the data
      partialize: (state) => ({ dailyActivities: state.dailyActivities }),
      // Add onRehydrateStorage to set the flag
      onRehydrateStorage: () => {
        useActivityStore.setState({ _hasHydrated: true });
        console.log("ActivityStore: Rehydration process finished.");
      },
      skipHydration: typeof window === 'undefined', // Skip hydration on server
    }
  )
);

// Selector for hydration status
export const selectActivityHasHydrated = (state: ActivityState) => state._hasHydrated;

// Optional: Selectors can be added here if needed
export const selectActivityForDate = (date: string) => (state: ActivityState) => state.getActivityForDate(date); 