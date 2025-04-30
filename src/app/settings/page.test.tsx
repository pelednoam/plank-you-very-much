import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import SettingsPage from './page'; // Import the page component
import { useUserProfileStore } from '@/store/userProfileStore';
import { toast } from 'sonner';
import { __resetSonnerMocks } from '@/__mocks__/sonner';
import type { UserProfile } from '@/types';

// Mock the store
jest.mock('@/store/userProfileStore');
const mockedUseUserProfileStore = useUserProfileStore as jest.MockedFunction<typeof useUserProfileStore>;

// Mock sonner toast
jest.mock('sonner');

// Mock child components that might have side effects or complex logic
jest.mock('@/features/settings/components/FitbitConnectButton', () => ({
    __esModule: true,
    default: jest.fn(() => <button>Mock Fitbit Connect</button>), // Simple mock render
}));
jest.mock('@/features/settings/components/CsvImportButton', () => ({
    __esModule: true,
    default: jest.fn(() => <button>Mock CSV Import</button>), // Simple mock render
}));

// Mock TutorialModal as it seems to cause ESM issues via dependencies
// jest.mock('@/features/tutorials/components/TutorialModal', () => ({
//     __esModule: true,
//     TutorialModal: jest.fn(() => <div>Mock Tutorial Modal</div>), // Mock the named export
// }));

// Define a baseline mock profile for tests
const mockProfileData: UserProfile = {
    id: 'settings-user-123',
    name: 'Integration Test User',
    email: 'integration@example.com',
    dob: '1985-07-15',
    sex: 'FEMALE',
    heightCm: 165,
    activityLevel: 'light',
    lactoseSensitive: true,
    backIssues: false,
    equipment: ['dumbbell', 'resistance_band'],
    targetBodyFatPct: 22.5,
    targetDate: '2025-01-01',
    completedOnboarding: true,
    notificationPrefs: { workoutReminders: true },
    completedTutorials: ['dashboard'],
    // Add calculated fields if the page/components rely on them
    // calculatedTDEE: 2000, 
    // calorieTarget: 1700,
    // proteinTarget: 130,
};

describe('SettingsPage Integration Tests', () => {
    let mockUpdateSettings: jest.Mock;
    let mockUpdateNotificationPref: jest.Mock;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        __resetSonnerMocks(); // Assuming this resets the toast mock internals

        // Define mock functions for store actions
        mockUpdateSettings = jest.fn();
        mockUpdateNotificationPref = jest.fn();

        // Setup the mock store return value for this test suite
        mockedUseUserProfileStore.mockReturnValue({
            profile: { ...mockProfileData }, // Use a fresh copy
            updateSettings: mockUpdateSettings,
            updateNotificationPref: mockUpdateNotificationPref,
            // Provide other potentially used functions (even if basic mocks)
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

    test('renders correctly and displays initial data from store', () => {
        render(<SettingsPage />);

        // Check UserProfileForm fields
        expect(screen.getByLabelText(/Name/i)).toHaveValue(mockProfileData.name);
        expect(screen.getByLabelText(/Date of Birth/i)).toHaveValue(mockProfileData.dob);
        expect(screen.getByRole('combobox', { name: /Sex/i })).toHaveTextContent(/Female/i);
        expect(screen.getByLabelText(/Height \(cm\)/i)).toHaveValue(mockProfileData.heightCm);
        expect(screen.getByRole('combobox', { name: /Activity Level/i })).toHaveTextContent(/Lightly Active/i); 
        expect(screen.getByLabelText(/Lactose Sensitive/i)).toBeChecked(); 

        // Check GoalSettingsForm fields (assuming labels/roles)
        expect(screen.getByLabelText(/Target Body Fat/i)).toHaveValue(mockProfileData.targetBodyFatPct);
        expect(screen.getByLabelText(/Target Date/i)).toHaveValue(mockProfileData.targetDate);

        // Check PreferenceToggles fields
        expect(screen.getByRole('switch', { name: /Workout Reminders/i })).toBeChecked();
    });

    test('updates user profile via form, calls store action, and shows toast', async () => {
        render(<SettingsPage />);

        const newName = 'Updated Integration User';
        const newHeight = 168;

        // Simulate changes in UserProfileForm
        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: newName } });
        fireEvent.change(screen.getByLabelText(/Height \(cm\)/i), { target: { value: newHeight.toString() } });

        // Find the correct save button (assume it's in UserProfileForm section)
        // We might need a more specific selector if multiple save buttons exist
        const saveProfileButton = screen.getByRole('button', { name: /Save Changes/i });
        expect(saveProfileButton).not.toBeDisabled(); // Should be enabled after changes
        fireEvent.click(saveProfileButton);

        // Wait for store action and check arguments
        await waitFor(() => {
            expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
            expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
                name: newName,
                heightCm: newHeight,
                // Include other fields expected by the form submission logic 
                // (even if unchanged, the form might send the whole object)
                dob: mockProfileData.dob,
                sex: mockProfileData.sex,
                activityLevel: mockProfileData.activityLevel,
                lactoseSensitive: mockProfileData.lactoseSensitive,
                targetBodyFatPct: mockProfileData.targetBodyFatPct,
                targetDate: mockProfileData.targetDate,
            }));
        });

        // Check for success toast from UserProfileForm
        expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
        expect(toast.success).toHaveBeenCalledTimes(1);
    });

    test('updates notification preference via toggle, calls store action, and shows toast', async () => {
        render(<SettingsPage />);

        const reminderSwitch = screen.getByRole('switch', { name: /Workout Reminders/i });
        expect(reminderSwitch).toBeChecked(); // Initial state

        // Toggle Off
        fireEvent.click(reminderSwitch);

        // Wait for store action and check arguments
        await waitFor(() => {
            expect(mockUpdateNotificationPref).toHaveBeenCalledTimes(1);
            expect(mockUpdateNotificationPref).toHaveBeenCalledWith('workoutReminders', false);
        });

        // Check for success toast from PreferenceToggles
        expect(toast.success).toHaveBeenCalledWith("Preferences updated!");
        expect(toast.success).toHaveBeenCalledTimes(1);
    });

    // TODO: Add test for GoalSettingsForm submission
    // TODO: Add test for interactions *between* forms if any (e.g., updating profile recalculates something shown elsewhere)

}); 