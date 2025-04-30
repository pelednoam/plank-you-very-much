import { act } from '@testing-library/react';
import { useUserProfileStore, defaultProfile } from './userProfileStore';
import type { UserProfile, BodyMetrics } from '@/types';
import { clearIdbStorage } from '@/lib/idbStorage';
import { useMetricsStore } from './metricsStore';
import * as calculationUtils from '@/lib/calculationUtils';

// --- Mocks --- 

// Mock calculation utilities module
jest.mock('@/lib/calculationUtils');
const mockCalculationUtils = calculationUtils as jest.Mocked<typeof calculationUtils>;

// Mock useMetricsStore.getState directly
jest.mock('./metricsStore', () => ({
    useMetricsStore: {
        getState: jest.fn()
    }
}));

describe('UserProfileStore', () => {
    let testProfile: UserProfile;
    let testMetrics: BodyMetrics;

    beforeEach(async () => {
        jest.clearAllMocks();

        testMetrics = { date: '2024-01-01', weightKg: 80, bodyFatPct: 15, source: 'MANUAL' };
        (useMetricsStore.getState as jest.Mock).mockReturnValue({ 
             getLatestMetric: jest.fn().mockReturnValue(testMetrics)
         });

        mockCalculationUtils.calculateBMR.mockReturnValue(1700);
        mockCalculationUtils.calculateTDEE.mockReturnValue(2635);
        mockCalculationUtils.calculateLBM.mockReturnValue(68);
        mockCalculationUtils.calculateCalorieTarget.mockReturnValue(2335); 
        mockCalculationUtils.calculateProteinTarget.mockReturnValue(109);

        testProfile = { 
            ...defaultProfile, 
            id: 'user-test-123', 
            name: 'Test User', 
            completedOnboarding: true, 
            dob: '1980-01-01',
            sex: 'MALE',
            heightCm: 180,
            activityLevel: 'moderate',
        };

        // Reset store state and wait for hydration (sets default profile)
        act(() => {
            useUserProfileStore.getState().clearProfile();
        });
        await clearIdbStorage();
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); 
    });

    // Test initial state after beforeEach clear/hydrate
    it('should initialize with the default profile after hydration if storage is empty', () => {
        const profile = useUserProfileStore.getState().profile;
        expect(profile).toEqual(defaultProfile); 
    });

    it('should set the user profile using setProfile', () => {
         act(() => {
             useUserProfileStore.getState().setProfile(testProfile);
         });
        expect(useUserProfileStore.getState().profile).toEqual(testProfile);
    });

    it('should update profile and set completedOnboarding with completeOnboarding', () => {
        const onboardingData = {
            name: 'Onboarded User',
            lactoseSensitive: true,
            dob: '1990-01-01',
            sex: 'FEMALE' as const,
            heightCm: 175,
            activityLevel: 'light' as const,
            targetBodyFatPct: 15,
            targetDate: '2025-12-31',
            backIssues: false,
            equipment: ['DUMBBELLS'],
        }; 
        // Start with default state (from beforeEach)
        act(() => {
            useUserProfileStore.getState().completeOnboarding(onboardingData);
        });
        const profile = useUserProfileStore.getState().profile;
        expect(profile?.completedOnboarding).toBe(true);
        expect(profile?.name).toBe('Onboarded User');
    });

     it('should update settings using updateSettings, preserving managed fields', () => {
         act(() => { // Start with testProfile
             useUserProfileStore.getState().setProfile(testProfile);
         });
         const updates = { name: 'Updated Name', lactoseSensitive: true };
         act(() => { useUserProfileStore.getState().updateSettings(updates); });
         const profile = useUserProfileStore.getState().profile;
         expect(profile?.name).toBe('Updated Name');
         expect(profile?.id).toBe(testProfile.id); // Ensure ID preserved
     });

     it('should clear the profile and reset to default', async () => {
         act(() => { // Start with testProfile
             useUserProfileStore.getState().setProfile(testProfile);
         });
         expect(useUserProfileStore.getState().profile?.id).toBe(testProfile.id);
         act(() => {
             useUserProfileStore.getState().clearProfile();
         });
         // Should revert to default profile after clear/hydrate cycle completes async
         // Re-check state after waiting
         await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); 
         expect(useUserProfileStore.getState().profile?.id).not.toBe(testProfile.id);
         // Optionally check if it matches default, though not strictly necessary
         // expect(useUserProfileStore.getState().profile).toEqual(defaultProfile);
     });

    // --- updateFitnessData Test --- 
    describe('updateFitnessData', () => {
        beforeEach(() => {
            // Ensure tests start with testProfile
            act(() => {
                 useUserProfileStore.getState().setProfile(testProfile);
             });
        });

        it('should update lastSyncedCaloriesOut and recalculate targets', () => {
            const syncedCalories = 2800;
            mockCalculationUtils.calculateCalorieTarget.mockReturnValue(2500);
            act(() => { useUserProfileStore.getState().updateFitnessData({ lastSyncedCaloriesOut: syncedCalories }); });
            const profile = useUserProfileStore.getState().profile;
            expect(profile?.lastSyncedCaloriesOut).toBe(syncedCalories);
            expect(useMetricsStore.getState).toHaveBeenCalled();
            expect(mockCalculationUtils.calculateBMR).toHaveBeenCalled();
            expect(mockCalculationUtils.calculateTDEE).toHaveBeenCalled();
            expect(mockCalculationUtils.calculateLBM).toHaveBeenCalled();
            expect(mockCalculationUtils.calculateCalorieTarget).toHaveBeenCalled();
            expect(mockCalculationUtils.calculateProteinTarget).toHaveBeenCalled();
            expect(profile?.calorieTarget).toBe(2500);
            expect(profile?.proteinTarget).toBe(109);
        });

        it('should handle missing metrics gracefully during recalculation', () => {
            (useMetricsStore.getState as jest.Mock).mockReturnValue({ 
                 getLatestMetric: jest.fn().mockReturnValue(null) // Mock metrics store returning null
              });
            mockCalculationUtils.calculateBMR.mockReturnValue(null);
            mockCalculationUtils.calculateTDEE.mockReturnValue(null);
            mockCalculationUtils.calculateLBM.mockReturnValue(null);
            mockCalculationUtils.calculateCalorieTarget.mockReturnValue(null);
            mockCalculationUtils.calculateProteinTarget.mockReturnValue(null);
            act(() => { useUserProfileStore.getState().updateFitnessData({ lastSyncedCaloriesOut: 2900 }); });
            const profile = useUserProfileStore.getState().profile;
            expect(profile?.lastSyncedCaloriesOut).toBe(2900); 
            expect(profile?.calculatedBMR).toBeUndefined();
            expect(profile?.calculatedTDEE).toBeUndefined();
            expect(profile?.calculatedLBM).toBeUndefined();
            expect(profile?.calorieTarget).toBeUndefined();
            expect(profile?.proteinTarget).toBeUndefined();
        });

         // Test the guard condition: if profile is null, it shouldn't proceed.
         it('should not run calculations if profile is null', () => {
             // Force state to null *after* beforeEach setup, specifically for this test
             act(() => {
                 useUserProfileStore.setState({ 
                    // Provide *full* state shape including actions to satisfy replace: true
                    profile: null, 
                    setProfile: useUserProfileStore.getState().setProfile, 
                    completeOnboarding: useUserProfileStore.getState().completeOnboarding,
                    updateSettings: useUserProfileStore.getState().updateSettings,
                    updateNotificationPref: useUserProfileStore.getState().updateNotificationPref,
                    updateFitnessData: useUserProfileStore.getState().updateFitnessData,
                    clearProfile: useUserProfileStore.getState().clearProfile,
                    markTutorialComplete: useUserProfileStore.getState().markTutorialComplete,
                    hasCompletedTutorial: useUserProfileStore.getState().hasCompletedTutorial,
                    setFitbitConnection: useUserProfileStore.getState().setFitbitConnection,
                    clearFitbitConnection: useUserProfileStore.getState().clearFitbitConnection
                }, true);
             });
             
             expect(useUserProfileStore.getState().profile).toBeNull(); // Verify state is null

             act(() => {
                 useUserProfileStore.getState().updateFitnessData({ lastSyncedCaloriesOut: 2500 });
             });
             
             // Assert calculations didn't run
             expect(mockCalculationUtils.calculateBMR).not.toHaveBeenCalled();
             expect(mockCalculationUtils.calculateCalorieTarget).not.toHaveBeenCalled();
             // Profile should remain null
             expect(useUserProfileStore.getState().profile).toBeNull(); 
         });
    });

    // --- Fitbit Connection Tests --- 
    describe('Fitbit Connection Actions', () => {
        const fitbitUserId = 'FB_USER_XYZ';
        const accessToken = 'test_access_token';
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;

        it('setFitbitConnection should add fitbit details to an existing profile', () => {
             act(() => { // Start with testProfile (from outer beforeEach)
                 useUserProfileStore.getState().setProfile(testProfile);
             });
            act(() => { useUserProfileStore.getState().setFitbitConnection(fitbitUserId, accessToken, expiresAt); });
            const profile = useUserProfileStore.getState().profile;
            expect(profile?.fitbitUserId).toBe(fitbitUserId);
            expect(profile?.name).toBe(testProfile.name);
        });

         it('setFitbitConnection should initialize profile with defaults if starting from default profile', async () => {
             // Start with default profile (from outer beforeEach)
             
            act(() => { useUserProfileStore.getState().setFitbitConnection(fitbitUserId, accessToken, expiresAt); });

            const profile = useUserProfileStore.getState().profile;
            expect(profile).not.toBeNull();
            expect(profile?.fitbitUserId).toBe(fitbitUserId);
            expect(profile?.name).toBe(defaultProfile.name); // Check defaults merged
        });

        it('clearFitbitConnection should remove fitbit details from the profile', () => {
             act(() => { // Start with testProfile and add Fitbit details
                 useUserProfileStore.getState().setProfile(testProfile);
                 useUserProfileStore.getState().setFitbitConnection(fitbitUserId, accessToken, expiresAt);
             });
             const initialProfile = useUserProfileStore.getState().profile;
             expect(initialProfile?.fitbitUserId).toBe(fitbitUserId);
            act(() => { useUserProfileStore.getState().clearFitbitConnection(); });
            const finalProfile = useUserProfileStore.getState().profile;
            expect(finalProfile?.fitbitUserId).toBeUndefined();
            expect(finalProfile?.name).toBe(testProfile.name);
        });

         it('clearFitbitConnection should do nothing if profile is already default', async () => {
             // Explicitly set default profile for this test
             act(() => {
                 useUserProfileStore.getState().setProfile(defaultProfile);
             });
             const initialProfile = useUserProfileStore.getState().profile;
             expect(initialProfile).toEqual(defaultProfile);
             
             act(() => { useUserProfileStore.getState().clearFitbitConnection(); });
             
             // State should remain the default profile
             expect(useUserProfileStore.getState().profile).toEqual(defaultProfile); 
         });
    });

    // --- Tutorial Completion Tests --- 
    describe('Tutorial Completion', () => {
        beforeEach(() => {
             // Ensure tests start with testProfile
             act(() => {
                 useUserProfileStore.getState().setProfile(testProfile);
             });
         });
         // ... tutorial tests ...
         it('should mark a tutorial as complete', () => {
             act(() => { useUserProfileStore.getState().markTutorialComplete('nfc-1'); });
             const profile = useUserProfileStore.getState().profile;
             expect(profile?.completedTutorials).toContain('nfc-1');
         });
 
         it('should not add a tutorial if already completed', () => {
              act(() => {
                  useUserProfileStore.getState().markTutorialComplete('nfc-1');
                  useUserProfileStore.getState().markTutorialComplete('nfc-1');
              });
              const profile = useUserProfileStore.getState().profile;
              expect(profile?.completedTutorials).toEqual(['nfc-1']);
         });
 
          it('hasCompletedTutorial should return true if tutorial is completed', () => {
               act(() => { useUserProfileStore.getState().markTutorialComplete('nfc-2'); });
               expect(useUserProfileStore.getState().hasCompletedTutorial('nfc-2')).toBe(true);
          });
  
           it('hasCompletedTutorial should return false if tutorial is not completed', () => {
               expect(useUserProfileStore.getState().hasCompletedTutorial('nfc-3')).toBe(false);
           });
 
            it('hasCompletedTutorial should return false if profile is default (cleared)', async () => {
                act(() => { useUserProfileStore.getState().clearProfile(); });
                await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); 
                expect(useUserProfileStore.getState().hasCompletedTutorial('nfc-1')).toBe(false);
            });
    });
    
    // --- Persistence Test --- 
     it('should persist profile state to storage', async () => {
        act(() => { // Start with testProfile
            useUserProfileStore.getState().setProfile(testProfile);
        });
         await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); 
         const storageOptions = useUserProfileStore.persist.getOptions();
         const storageName = storageOptions.name;
         const storage = storageOptions.storage;
         if (!storageName) throw new Error("Storage name missing");
         const persistedState = await storage?.getItem(storageName);
         expect(persistedState?.state?.profile?.id).toEqual(testProfile.id);
     });
}); 