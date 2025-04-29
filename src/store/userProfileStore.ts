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

// Define the full state including actions
interface UserProfileState {
  profile: UserProfile | null; // Only profile needs to be top-level state
  setProfile: (profileData: UserProfile) => void;
  completeOnboarding: (profileData: Omit<UserProfile, 'completedOnboarding' | 'id' | 'completedTutorials' | 'notificationPrefs'>) => void;
  updateSettings: (settingsData: Partial<Omit<UserProfile, 'notificationPrefs' | 'completedTutorials'>>) => void; // Exclude prefs & tutorials
  updateNotificationPref: (prefKey: keyof NotificationPreferences, value: boolean) => void;
  clearProfile: () => void;
  markTutorialComplete: (tutorialId: string) => void;
  hasCompletedTutorial: (tutorialId: string) => boolean;
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
            completedOnboarding: true 
        }
      })),

      // Update general settings, excluding notificationPrefs & completedTutorials
      updateSettings: (settingsData) => set((state) => {
        if (!state.profile) return {}; 
        return {
          profile: { ...state.profile, ...settingsData }
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
                         state?.setProfile(defaultProfile);
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