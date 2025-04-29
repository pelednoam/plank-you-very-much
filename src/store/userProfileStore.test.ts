import { act } from '@testing-library/react';
import { useUserProfileStore, defaultProfile } from './userProfileStore';
import type { UserProfile } from '@/types';
import { clearIdbStorage } from '@/lib/idbStorage';

describe('UserProfileStore', () => {
    beforeEach(async () => {
        act(() => {
            // Reset store state using clearProfile
            useUserProfileStore.getState().clearProfile(); 
        });
        await clearIdbStorage();
        // Allow potential async hydration to complete
        await act(async () => { 
            await new Promise(resolve => setTimeout(resolve, 0)); 
        });
    });

    it('should initialize with the default profile after hydration if storage is empty', () => {
        const profile = useUserProfileStore.getState().profile;
        // Expect the default profile, not null, due to onRehydrateStorage logic
        expect(profile).toEqual(defaultProfile); 
    });

    it('should set the user profile using setProfile', () => {
        const testProfile: UserProfile = { 
            ...defaultProfile, // Start with defaults
            id: 'user-test-123', 
            name: 'Test User', 
            completedOnboarding: true 
        };
        act(() => {
            useUserProfileStore.getState().setProfile(testProfile);
        });
        expect(useUserProfileStore.getState().profile).toEqual(testProfile);
    });

    it('should update profile and set completedOnboarding with completeOnboarding', () => {
        const onboardingData = {
            name: 'Onboarded User',
            lactoseSensitive: true,
            // Add other required fields from Omit type in action definition
             dob: '1990-01-01',
             sex: 'prefer_not_say' as const, // Use a valid value from the likely SexType enum
             heightCm: 175,
             activityLevel: 'MODERATE' as const, // Use a valid value from ActivityLevel enum
             targetBodyFatPct: 15,
             targetDate: '2025-12-31',
             backIssues: false,
             equipment: ['DUMBBELLS'],
        }; 
        act(() => {
            useUserProfileStore.getState().completeOnboarding(onboardingData);
        });
        const profile = useUserProfileStore.getState().profile;
        expect(profile).not.toBeNull();
        expect(profile?.name).toBe('Onboarded User');
        expect(profile?.lactoseSensitive).toBe(true);
        expect(profile?.completedOnboarding).toBe(true);
        // Check if defaults/previous state were merged correctly (e.g., notificationPrefs)
        expect(profile?.notificationPrefs).toEqual(defaultProfile.notificationPrefs);
    });

    it('should update settings using updateSettings, preserving managed fields', () => {
         act(() => {
            // Set an initial profile first
            useUserProfileStore.getState().setProfile({ 
                ...defaultProfile, 
                id: 'user-settings-1', 
                name: 'Initial Name', 
                lactoseSensitive: false, 
                fitbitUserId: 'FITBIT123' // Example managed field
            });
        });

        const updates = {
            name: 'Updated Name',
            lactoseSensitive: true,
            fitbitUserId: 'SHOULD_NOT_UPDATE', // Attempt to update managed field
        };

        act(() => {
            useUserProfileStore.getState().updateSettings(updates);
        });

        const profile = useUserProfileStore.getState().profile;
        expect(profile?.name).toBe('Updated Name');
        expect(profile?.lactoseSensitive).toBe(true);
        expect(profile?.fitbitUserId).toBe('FITBIT123'); // Should not have changed
    });

    it('should clear the profile', () => {
        act(() => {
             useUserProfileStore.getState().setProfile({ ...defaultProfile, id: 'user-clear-1', name: 'To Be Cleared' });
        });
        expect(useUserProfileStore.getState().profile).not.toBeNull();
        act(() => {
            useUserProfileStore.getState().clearProfile();
        });
        expect(useUserProfileStore.getState().profile).toBeNull();
    });

    // --- Fitbit Connection Tests --- 
    describe('Fitbit Connection Actions', () => {
        const fitbitUserId = 'FB_USER_XYZ';
        const accessToken = 'test_access_token';
        const expiresAt = Math.floor(Date.now() / 1000) + 3600; // Now + 1 hour

        it('setFitbitConnection should add fitbit details to an existing profile', () => {
             act(() => {
                 useUserProfileStore.getState().setProfile({ ...defaultProfile, id: 'user-fitbit-1', name: 'Fitbit Test' });
             });
             
            act(() => {
                useUserProfileStore.getState().setFitbitConnection(fitbitUserId, accessToken, expiresAt);
            });

            const profile = useUserProfileStore.getState().profile;
            expect(profile?.fitbitUserId).toBe(fitbitUserId);
            expect(profile?.fitbitAccessToken).toBe(accessToken);
            expect(profile?.fitbitExpiresAt).toBe(expiresAt);
            expect(profile?.name).toBe('Fitbit Test'); // Ensure other profile data remains
        });

         it('setFitbitConnection should initialize profile with defaults if profile is null', () => {
             expect(useUserProfileStore.getState().profile).toBeNull(); // Pre-condition
             
            act(() => {
                useUserProfileStore.getState().setFitbitConnection(fitbitUserId, accessToken, expiresAt);
            });

            const profile = useUserProfileStore.getState().profile;
            expect(profile).not.toBeNull();
            expect(profile?.fitbitUserId).toBe(fitbitUserId);
            expect(profile?.fitbitAccessToken).toBe(accessToken);
            expect(profile?.fitbitExpiresAt).toBe(expiresAt);
            // Check if default fields are present
            expect(profile?.name).toBe(defaultProfile.name);
            expect(profile?.completedOnboarding).toBe(defaultProfile.completedOnboarding);
        });

        it('clearFitbitConnection should remove fitbit details from the profile', () => {
            act(() => {
                 useUserProfileStore.getState().setProfile({
                    ...defaultProfile,
                    id: 'user-fitbit-2',
                    name: 'To Disconnect',
                    fitbitUserId: fitbitUserId,
                    fitbitAccessToken: accessToken,
                    fitbitExpiresAt: expiresAt,
                });
            });

             // Verify initial state
             const initialProfile = useUserProfileStore.getState().profile;
             expect(initialProfile?.fitbitUserId).toBe(fitbitUserId);
             expect(initialProfile?.fitbitAccessToken).toBe(accessToken);

            act(() => {
                useUserProfileStore.getState().clearFitbitConnection();
            });

            const finalProfile = useUserProfileStore.getState().profile;
            expect(finalProfile?.fitbitUserId).toBeUndefined();
            expect(finalProfile?.fitbitAccessToken).toBeUndefined();
            expect(finalProfile?.fitbitExpiresAt).toBeUndefined();
            expect(finalProfile?.name).toBe('To Disconnect'); // Ensure other data remains
        });
         it('clearFitbitConnection should do nothing if profile is null', () => {
             expect(useUserProfileStore.getState().profile).toBeNull(); // Pre-condition
             act(() => {
                 useUserProfileStore.getState().clearFitbitConnection();
             });
             // No error should occur, profile remains null
             expect(useUserProfileStore.getState().profile).toBeNull(); 
         });
    });

    // --- Tutorial Completion Tests --- (Add if structure is stable)
    describe('Tutorial Completion', () => {
         beforeEach(() => {
             act(() => {
                 useUserProfileStore.getState().setProfile({ ...defaultProfile, id: 'user-tutorial-1', completedTutorials: [] });
             });
         });

        it('should mark a tutorial as complete', () => {
            act(() => {
                useUserProfileStore.getState().markTutorialComplete('nfc-1');
            });
            const profile = useUserProfileStore.getState().profile;
            expect(profile?.completedTutorials).toContain('nfc-1');
            expect(profile?.completedTutorials).toHaveLength(1);
        });

        it('should not add a tutorial if already completed', () => {
             act(() => {
                 useUserProfileStore.getState().markTutorialComplete('nfc-1'); // First time
             });
             act(() => {
                 useUserProfileStore.getState().markTutorialComplete('nfc-1'); // Second time
             });
             const profile = useUserProfileStore.getState().profile;
             expect(profile?.completedTutorials).toContain('nfc-1');
             expect(profile?.completedTutorials).toHaveLength(1);
        });

         it('hasCompletedTutorial should return true if tutorial is completed', () => {
              act(() => {
                  useUserProfileStore.getState().markTutorialComplete('nfc-2');
              });
              expect(useUserProfileStore.getState().hasCompletedTutorial('nfc-2')).toBe(true);
         });

          it('hasCompletedTutorial should return false if tutorial is not completed', () => {
              expect(useUserProfileStore.getState().hasCompletedTutorial('nfc-3')).toBe(false);
          });
           it('hasCompletedTutorial should return false if profile is null', () => {
               act(() => {
                   useUserProfileStore.getState().clearProfile();
               });
               expect(useUserProfileStore.getState().hasCompletedTutorial('nfc-1')).toBe(false);
           });
    });
    
    // --- Persistence Test --- (Basic)
     it('should persist profile state to storage', async () => {
         const testProfile: UserProfile = { ...defaultProfile, id: 'persist-1', name: 'Persist Me' };
         act(() => {
             useUserProfileStore.getState().setProfile(testProfile);
         });

         await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

         const storageOptions = useUserProfileStore.persist.getOptions();
         const storageName = storageOptions.name;
         const storage = storageOptions.storage;
         if (!storageName) throw new Error("Storage name missing");

         const persistedState = await storage?.getItem(storageName);
         expect(persistedState).toBeDefined();
         expect(persistedState?.state).toBeDefined();
         expect(persistedState?.state?.profile).toEqual(testProfile);
     });
}); 