import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreferenceToggles from './PreferenceToggles';
import { useUserProfileStore } from '@/store/userProfileStore';
import { toast } from 'sonner'; // Jest auto-mocks this
import { __resetSonnerMocks } from '@/__mocks__/sonner'; // Import helper directly
import type { NotificationPreferences } from '@/types';

// Mock zustand store hooks
const originalUserProfileState = useUserProfileStore.getState();
jest.mock('@/store/userProfileStore');
const mockedUseUserProfileStore = useUserProfileStore as jest.MockedFunction<typeof useUserProfileStore>;

describe('PreferenceToggles', () => {
    let mockUpdateNotificationPref: jest.Mock;
    const initialPrefs: NotificationPreferences = {
        workoutReminders: true,
        // Add other potential preferences here if they exist in the type
    };

    beforeEach(() => {
        // Reset store state first
        useUserProfileStore.setState(originalUserProfileState, true);
        __resetSonnerMocks();

        mockUpdateNotificationPref = jest.fn();

        // Setup mock return value for the store hook, including profile with prefs
        mockedUseUserProfileStore.mockReturnValue({
            // Provide necessary profile structure, focus on what's needed
            profile: {
                id: 'test-user',
                notificationPrefs: { ...initialPrefs }, // Use spread to ensure a fresh copy
                // Assume completedOnboarding is handled elsewhere or not directly checked by this component
                // We add other fields back only if testing reveals they are indirectly necessary
            },
            updateNotificationPref: mockUpdateNotificationPref,
            // Mock other store functions just in case, returning undefined or basic mocks
            updateSettings: jest.fn(),
            setProfile: jest.fn(),
            completeOnboarding: jest.fn(),
            updateFitnessData: jest.fn(),
            clearProfile: jest.fn(),
            markTutorialComplete: jest.fn(),
            hasCompletedTutorial: jest.fn(),
            setFitbitConnection: jest.fn(),
            clearFitbitConnection: jest.fn(),
        });
    });

    test('renders toggles with initial values from store', () => {
        render(<PreferenceToggles />);
        // Assuming the toggle is associated with a label "Workout Reminders"
        const reminderSwitch = screen.getByRole('switch', { name: /Workout Reminders/i });
        expect(reminderSwitch).toBeChecked();
        // Add checks for other preferences if they exist
    });

    test('calls updateNotificationPref and shows toast when workout reminder toggle is changed (On -> Off)', async () => {
        render(<PreferenceToggles />);
        const reminderSwitch = screen.getByRole('switch', { name: /Workout Reminders/i });

        // --- First Toggle (On -> Off) ---
        fireEvent.click(reminderSwitch);

        // Wait for the first call to the store action
        await waitFor(() => {
            expect(mockUpdateNotificationPref).toHaveBeenCalledTimes(1);
        });
        // Check the arguments of the first call
        expect(mockUpdateNotificationPref).toHaveBeenNthCalledWith(1, 'workoutReminders', false);
        // Check toast was called once
        expect(toast.success).toHaveBeenCalledWith('Preferences updated!');
        expect(toast.success).toHaveBeenCalledTimes(1);
    });

    test('calls updateNotificationPref and shows toast when workout reminder toggle is changed (Off -> On)', async () => {
        // Override initial state for this test
        mockedUseUserProfileStore.mockReturnValue({
             profile: { id: 'test-user', notificationPrefs: { workoutReminders: false } }, // Start with reminder OFF
             updateNotificationPref: mockUpdateNotificationPref,
             // Minimal other mocks
             updateSettings: jest.fn(), setProfile: jest.fn(), completeOnboarding: jest.fn(),
             updateFitnessData: jest.fn(), clearProfile: jest.fn(), markTutorialComplete: jest.fn(),
             hasCompletedTutorial: jest.fn(), setFitbitConnection: jest.fn(), clearFitbitConnection: jest.fn(),
         });

        render(<PreferenceToggles />);
        const reminderSwitch = screen.getByRole('switch', { name: /Workout Reminders/i });

        // Verify it starts unchecked
        expect(reminderSwitch).not.toBeChecked();

        // --- Toggle (Off -> On) ---
        fireEvent.click(reminderSwitch);

        // Wait for the call to the store action
        await waitFor(() => {
            expect(mockUpdateNotificationPref).toHaveBeenCalledTimes(1);
        });

        // Check the arguments of the call
        expect(mockUpdateNotificationPref).toHaveBeenCalledWith('workoutReminders', true);

        // Check toast was called once
        expect(toast.success).toHaveBeenCalledWith('Preferences updated!');
        expect(toast.success).toHaveBeenCalledTimes(1);
    });

     test('handles null profile gracefully', () => {
         // Override beforeEach mock setup for this specific test
         mockedUseUserProfileStore.mockReturnValue({
             profile: null, 
             updateNotificationPref: mockUpdateNotificationPref,
             // Minimal other mocks needed
             updateSettings: jest.fn(),
             setProfile: jest.fn(),
             completeOnboarding: jest.fn(),
             updateFitnessData: jest.fn(),
             clearProfile: jest.fn(),
             markTutorialComplete: jest.fn(),
             hasCompletedTutorial: jest.fn(),
             setFitbitConnection: jest.fn(),
             clearFitbitConnection: jest.fn(),
         });

         render(<PreferenceToggles />);

         // Check that the component renders something without crashing
         // We might expect the toggle to be absent or disabled, or default to off
         // Let's check if the switch exists but is perhaps disabled or defaults to off
         const reminderSwitch = screen.queryByRole('switch', { name: /Workout Reminders/i });
         // Depending on implementation, it might not render at all, or render disabled/unchecked
         // Option 1: Check it doesn't render
         // expect(reminderSwitch).not.toBeInTheDocument(); 
         // Option 2: Check it renders but is unchecked/disabled (adjust based on component logic)
         expect(reminderSwitch).toBeInTheDocument();
         // When profile is null, it should default to unchecked and be disabled
         expect(reminderSwitch).not.toBeChecked(); 
         expect(reminderSwitch).toBeDisabled(); 

         // Ensure clicking it does nothing if it's disabled or shouldn't be interactive
         if (reminderSwitch) {
            fireEvent.click(reminderSwitch);
         }
         expect(mockUpdateNotificationPref).not.toHaveBeenCalled();
         expect(toast.success).not.toHaveBeenCalled();
     });

      test('handles profile with missing notificationPrefs gracefully', async () => {
         // Override beforeEach mock setup
         mockedUseUserProfileStore.mockReturnValue({
            profile: { 
                id: 'test-user-no-prefs',
                notificationPrefs: undefined, // Explicitly undefined
                // Minimal other necessary fields if any
            },
            updateNotificationPref: mockUpdateNotificationPref,
             // Minimal other mocks
             updateSettings: jest.fn(),
             setProfile: jest.fn(),
             completeOnboarding: jest.fn(),
             updateFitnessData: jest.fn(),
             clearProfile: jest.fn(),
             markTutorialComplete: jest.fn(),
             hasCompletedTutorial: jest.fn(),
             setFitbitConnection: jest.fn(),
             clearFitbitConnection: jest.fn(),
         });

         render(<PreferenceToggles />);

         // Similar check as the null profile test - expect default state (e.g., unchecked)
         const reminderSwitch = screen.getByRole('switch', { name: /Workout Reminders/i });
         expect(reminderSwitch).toBeInTheDocument();
         expect(reminderSwitch).not.toBeChecked();

         // Verify clicking updates with the new value (true, assuming default was false)
         fireEvent.click(reminderSwitch);
         await waitFor(() => {
            expect(mockUpdateNotificationPref).toHaveBeenCalledTimes(1);
            expect(mockUpdateNotificationPref).toHaveBeenCalledWith('workoutReminders', true);
             expect(toast.success).toHaveBeenCalledWith('Preferences updated!');
             expect(toast.success).toHaveBeenCalledTimes(1);
         });
     });


    // Add more tests if there are other preferences to toggle
}); 