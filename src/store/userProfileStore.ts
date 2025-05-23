import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, NotificationPreferences, BodyMetrics } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage';
import { useMetricsStore } from '@/store/metricsStore'; // Import metrics store
import { 
    calculateCalorieTarget,
    calculateProteinTarget,
    calculateBMR, 
    calculateTDEE,
    calculateLBM
} from '@/lib/calculationUtils'; // Import calculation utils

// Add completedTutorials to UserProfile type if not already present in types/index.ts
// (Assuming UserProfile might eventually look like this)
// interface UserProfile {
//   ...
//   completedTutorials?: string[];
// }

// Define the shape of the state we actually want to persist
interface PersistedUserProfileState {
    profile: UserProfile | null;
}

// Define the shape of data for the new action
interface FitnessData { 
  lastSyncedCaloriesOut?: number;
  // Add other fitness-related fields here if needed in the future
}

// Define the full state including actions
export interface UserProfileState {
  profile: UserProfile | null; // Only profile needs to be top-level state
  _hasHydrated: boolean; // <-- Add hydration status flag
  setProfile: (profileData: UserProfile) => void;
  completeOnboarding: (profileData: Omit<UserProfile, 'completedOnboarding' | 'id' | 'completedTutorials' | 'notificationPrefs' | 'fitbitUserId' | 'fitbitAccessToken' | 'fitbitExpiresAt' | 'lastSyncedCaloriesOut'>) => void;
  updateSettings: (settingsData: Partial<Omit<UserProfile, 'notificationPrefs' | 'completedTutorials' | 'fitbitAccessToken' | 'fitbitExpiresAt' | 'lastSyncedCaloriesOut' | 'id' | 'email' | 'image'>>) => void; // Exclude managed fields
  updateNotificationPref: (prefKey: keyof NotificationPreferences, value: boolean) => void;
  updateFitnessData: (fitnessData: FitnessData) => void; // New action
  clearProfile: () => void;
  markTutorialComplete: (tutorialId: string) => void;
  hasCompletedTutorial: (tutorialId: string) => boolean;
  // Add Fitbit specific actions
  setFitbitConnection: (userId: string, accessToken: string, expiresAt: number) => void;
  clearFitbitConnection: () => void;
}

// Export the default profile object
export const defaultProfile: UserProfile = {
  name: '',
  lactoseSensitive: false,
  completedOnboarding: false,
  completedTutorials: [],
  notificationPrefs: { 
      workoutReminders: true,
      inactivityCues: false,
      equipmentCues: false,
      syncStatus: true,
  },
  // Add other fields with defaults if necessary based on UserProfile type
  dob: undefined, 
  sex: undefined,
  heightCm: undefined,
  activityLevel: undefined,
  targetBodyFatPct: undefined,
  targetDate: undefined,
  backIssues: false,
  equipment: [],
  fitbitUserId: undefined,
  fitbitAccessToken: undefined,
  fitbitExpiresAt: undefined,
  lastSyncedCaloriesOut: undefined,
  // Add new target fields with undefined/null defaults
  calculatedTDEE: undefined,
  calculatedLBM: undefined,
  calorieTarget: undefined,
  proteinTarget: undefined,
};

// Initial state for the store slice
const initialState: PersistedUserProfileState = {
    profile: null, // Start with null, load from storage or set default on first use
};

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      profile: null, // Initialize profile as null
      _hasHydrated: false, // <-- Initialize hydration flag

      setProfile: (profileData) => set({ profile: profileData }),

      completeOnboarding: (profileData) => set((state) => ({
        profile: { 
            ...(state.profile || defaultProfile), // Use default if profile is null
            ...profileData, 
            id: state.profile?.id, // Preserve ID
            completedTutorials: state.profile?.completedTutorials || [], // Preserve tutorials
            notificationPrefs: state.profile?.notificationPrefs || defaultProfile.notificationPrefs, // Preserve prefs
            // Ensure fitbit fields are preserved or use default
            fitbitUserId: state.profile?.fitbitUserId,
            fitbitAccessToken: state.profile?.fitbitAccessToken,
            fitbitExpiresAt: state.profile?.fitbitExpiresAt,
            lastSyncedCaloriesOut: state.profile?.lastSyncedCaloriesOut,
            completedOnboarding: true 
        }
      })),

      // Update general settings (form fields)
      updateSettings: (settingsData) => set((state) => {
        if (!state.profile) return {}; 

        const allowedUpdates: Partial<UserProfile> = {};
        // Only allow updating fields typically found in a user profile form
        const updatableKeys: Array<keyof typeof settingsData> = [
            'name', 
            'lactoseSensitive',
            'dob',
            'sex',
            'heightCm',
            'activityLevel',
            'targetBodyFatPct',
            'targetDate',
            'backIssues',
            'equipment',
            // 'lastSyncedCaloriesOut', // Removed from here
        ];

        for (const key of updatableKeys) {
             if (key in settingsData && settingsData[key] !== undefined) {
                 (allowedUpdates as any)[key] = settingsData[key];
             }
        }

        return {
          profile: { 
              ...state.profile, 
              ...allowedUpdates, 
          }
        };
      }),
      
      // Update specific notification preference
      updateNotificationPref: (prefKey, value) => set((state) => {
          if (!state.profile) return {};
          return {
              profile: {
                  ...state.profile,
                  notificationPrefs: {
                      ...(state.profile.notificationPrefs || {}),
                      [prefKey]: value,
                  }
              }
          };
      }),

      // New action to update fitness-related data and recalculate targets
       updateFitnessData: (fitnessData) => set((state) => {
           if (!state.profile) return {};

           // 1. Update the profile with the incoming fitness data (e.g., lastSyncedCaloriesOut)
           const updatedProfileIntermediate = { ...state.profile };
           if (fitnessData.lastSyncedCaloriesOut !== undefined) {
               updatedProfileIntermediate.lastSyncedCaloriesOut = fitnessData.lastSyncedCaloriesOut;
           }
           // Add other fields from FitnessData interface here if needed

           // 2. Fetch latest metrics (needed for calculations)
           // IMPORTANT: Accessing another store inside set() is generally discouraged
           // due to potential loops, but necessary here for recalculation.
           // Consider alternative patterns if this causes issues.
           const latestMetric: BodyMetrics | undefined = useMetricsStore.getState().getLatestMetric();

           // 3. Recalculate related fitness data based on the updated profile and latest metrics
           const bmr = calculateBMR(updatedProfileIntermediate, latestMetric ?? null);
           const tdee = calculateTDEE(bmr, updatedProfileIntermediate.activityLevel);
           const lbm = calculateLBM(latestMetric?.weightKg, latestMetric?.bodyFatPct);

           // 4. Recalculate targets using the most up-to-date info
           // Pass the *intermediate* profile which has the latest synced calories
           const calorieTarget = calculateCalorieTarget(updatedProfileIntermediate, latestMetric ?? null);
           const proteinTarget = calculateProteinTarget(latestMetric ?? null);

           // 5. Return the final updated profile state
           return {
               profile: {
                   ...updatedProfileIntermediate, // Contains updated lastSyncedCaloriesOut
                   calculatedBMR: bmr ?? undefined, // Store calculated values
                   calculatedTDEE: tdee ?? undefined,
                   calculatedLBM: lbm ?? undefined,
                   calorieTarget: calorieTarget ?? undefined, // Store updated targets
                   proteinTarget: proteinTarget ?? undefined,
               }
           };
       }),

      // Reset profile to null (will load default on next access if needed)
      clearProfile: () => set({ profile: null }), 

      markTutorialComplete: (tutorialId) => set((state) => {
          if (!state.profile || state.profile.completedTutorials?.includes(tutorialId)) {
              return {}; // No change if profile null or tutorial already completed
          }
          return {
              profile: {
                  ...state.profile,
                  completedTutorials: [...(state.profile.completedTutorials || []), tutorialId]
              }
           };
      }),
      
      // Check tutorial completion within the profile object
      hasCompletedTutorial: (tutorialId) => {
          return get().profile?.completedTutorials?.includes(tutorialId) ?? false;
      },

      // Fitbit Actions
      setFitbitConnection: (userId, accessToken, expiresAt) => set((state) => {
          if (!state.profile) {
               console.warn("UserProfileStore: Cannot set Fitbit connection, profile is null. Initializing with default.");
               return { 
                    profile: { 
                       ...defaultProfile, 
                       fitbitUserId: userId,
                       fitbitAccessToken: accessToken,
                       fitbitExpiresAt: expiresAt,
                       lastSyncedCaloriesOut: defaultProfile.lastSyncedCaloriesOut,
                    }
                };
          }
          return {
              profile: {
                  ...state.profile,
                  fitbitUserId: userId,
                  fitbitAccessToken: accessToken,
                  fitbitExpiresAt: expiresAt,
              }
          };
      }),

      clearFitbitConnection: () => set((state: UserProfileState) => {
          if (!state.profile) return {};
          return {
              profile: {
                  ...state.profile,
                  fitbitUserId: undefined,
                  fitbitAccessToken: undefined,
                  fitbitExpiresAt: undefined,
              }
          };
      }),
    }),
    {
      // Persistence options
      name: 'user-profile-storage',
      storage: typeof window !== 'undefined' 
                 ? createIdbStorage<PersistedUserProfileState>() 
                 : {
                     getItem: async () => null,
                     setItem: async () => {},
                     removeItem: async () => {},
                   },
      partialize: (state: UserProfileState): PersistedUserProfileState => ({ 
          profile: state.profile, 
      }),
      // Simple onRehydrateStorage implementation
      onRehydrateStorage: () => {
        // This function runs once hydration is complete or fails.
        // We simply update the _hasHydrated flag in the store.
        useUserProfileStore.setState({ _hasHydrated: true });
        console.log("UserProfileStore: Rehydration process finished.");
      },
      skipHydration: typeof window === 'undefined', // Skip hydration on server
    }
  )
);

// Selector to easily check hydration status
export const selectHasHydrated = (state: UserProfileState) => state._hasHydrated;

// Original selectors
export const selectIsOnboardingComplete = (state: UserProfileState) => state.profile?.completedOnboarding ?? false;
export const selectUserProfile = (state: UserProfileState) => state.profile;
// Add default fallback for notification preferences selector
export const selectNotificationPreferences = (state: UserProfileState) => state.profile?.notificationPrefs ?? defaultProfile.notificationPrefs;
// Add selectors for Fitbit data
export const selectFitbitConnection = (state: UserProfileState) => ({
    userId: state.profile?.fitbitUserId,
    accessToken: state.profile?.fitbitAccessToken,
    expiresAt: state.profile?.fitbitExpiresAt,
}); 