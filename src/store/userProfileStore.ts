import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/types';
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
    completedTutorials: string[];
}

// Define the full state including actions
interface UserProfileState extends PersistedUserProfileState {
  // profile and completedTutorials inherited
  setProfile: (profileData: UserProfile) => void;
  completeOnboarding: (profileData: Omit<UserProfile, 'completedOnboarding'>) => void;
  updateSettings: (settingsData: Partial<UserProfile>) => void;
  clearProfile: () => void;
  markTutorialComplete: (tutorialId: string) => void;
  hasCompletedTutorial: (tutorialId: string) => boolean;
}

// Default initial state
const defaultProfile: UserProfile = {
  name: '',
  lactoseSensitive: false,
  completedOnboarding: false,
};

const initialState: PersistedUserProfileState = {
    profile: defaultProfile,
    completedTutorials: [],
};

export const useUserProfileStore = create<UserProfileState>()(
  // Persist only the PersistedUserProfileState part
  persist(
    (set, get) => ({
      ...initialState, // Initialize with persisted shape

      // Actions defined on the full state shape
      setProfile: (profileData) => set({ profile: profileData }),

      completeOnboarding: (profileData) => set((state) => ({
        profile: { ...(state.profile || defaultProfile), ...profileData, completedOnboarding: true }
      })),

      updateSettings: (settingsData) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...settingsData } : null
      })),

      clearProfile: () => set({ ...initialState, profile: defaultProfile }), // Reset persisted state

      markTutorialComplete: (tutorialId) => set((state) => {
          if (state.completedTutorials.includes(tutorialId)) {
              return {};
          }
          return { completedTutorials: [...state.completedTutorials, tutorialId] };
      }),
      
      hasCompletedTutorial: (tutorialId) => {
          return get().completedTutorials.includes(tutorialId);
      },

    }),
    {
      name: 'user-profile-storage',
      storage: createIdbStorage<PersistedUserProfileState>(), // Storage uses persisted shape
      // Partialize function correctly maps full state to persisted shape
      partialize: (state): PersistedUserProfileState => ({ 
          profile: state.profile, 
          completedTutorials: state.completedTutorials 
      }),
    }
  )
);

// Selectors remain the same, operating on the full UserProfileState
export const selectIsOnboardingComplete = (state: UserProfileState) => state.profile?.completedOnboarding ?? false; 