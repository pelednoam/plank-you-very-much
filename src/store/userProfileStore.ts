import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, NotificationPreferences } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage';

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
  // dob: undefined, 
  // sex: undefined,
  // heightCm: undefined,
  // activityLevel: undefined,
  // targetBodyFatPct: undefined,
  // targetDate: undefined,
  // backIssues: undefined,
  // equipment: undefined,
  // fitbitUserId: undefined,
  fitbitAccessToken: undefined,
  fitbitExpiresAt: undefined,
  lastSyncedCaloriesOut: undefined,
};

// Initial state for the store slice
const initialState: PersistedUserProfileState = {
    profile: null, // Start with null, load from storage or set default on first use
};

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      profile: null, // Initialize profile as null

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

      // New action to update fitness-related data
       updateFitnessData: (fitnessData) => set((state) => {
           if (!state.profile) return {};
           // Define which keys this action can update
           const allowedFitnessUpdates: Partial<UserProfile> = {};
           if (fitnessData.lastSyncedCaloriesOut !== undefined) {
               allowedFitnessUpdates.lastSyncedCaloriesOut = fitnessData.lastSyncedCaloriesOut;
           }
           // Add other fields from FitnessData interface here if needed
           
           return {
               profile: {
                   ...state.profile,
                   ...allowedFitnessUpdates,
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

      clearFitbitConnection: () => set((state) => {
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
      name: 'user-profile-storage',
      storage: createIdbStorage<PersistedUserProfileState>(),
      // Partialize function only saves the profile object
      partialize: (state): PersistedUserProfileState => ({ 
          profile: state.profile, 
      }),
      // Load default profile if nothing is in storage
       onRehydrateStorage: (state) => {
            console.log("UserProfileStore: Hydration finished");
            if (!state?.profile) {
                console.log("UserProfileStore: No profile found in storage, setting default.");
                return (state, error) => {
                     if (error) {
                         console.error("UserProfileStore: Failed to hydrate", error);
                    } else {
                         // Ensure setProfile exists before calling
                         if (state?.setProfile) {
                             state.setProfile(defaultProfile);
                         } else {
                              console.error("UserProfileStore: setProfile action is missing during rehydration.");
                         }
                     }
                 }
            }
        }
    }
  )
);

// Selectors
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