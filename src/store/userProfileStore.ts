import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage';

interface UserProfileState {
  profile: UserProfile | null;
  setProfile: (profileData: UserProfile) => void;
  completeOnboarding: (profileData: Omit<UserProfile, 'completedOnboarding'>) => void;
  updateSettings: (settingsData: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

// Default initial state - adjust as needed
const defaultProfile: UserProfile = {
  name: '',
  lactoseSensitive: false, // Assuming false by default
  completedOnboarding: false,
};

export const useUserProfileStore = create(
  persist<UserProfileState>(
    (set) => ({
      profile: defaultProfile, // Initialize with default, persistence will overwrite if exists

      setProfile: (profileData) => set({ profile: profileData }),

      completeOnboarding: (profileData) => set((state) => ({
        // Ensure we don't wipe existing profile data when completing onboarding
        profile: { ...(state.profile || defaultProfile), ...profileData, completedOnboarding: true }
      })),

      updateSettings: (settingsData) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...settingsData } : null
      })),

      clearProfile: () => set({ profile: defaultProfile }), // Reset to default on clear

      // NOTE: No need for explicit initialization action, `persist` handles it.

    }),
    {
      name: 'user-profile-storage', // Unique name for this store's persisted data
      storage: createIdbStorage<UserProfileState>(), // Use the creator function to get a properly typed storage instance
    }
  )
);

// Selector example (optional, but good practice)
export const selectIsOnboardingComplete = (state: UserProfileState) => state.profile?.completedOnboarding ?? false; 