import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoalSettingsForm from './GoalSettingsForm';
import { useUserProfileStore } from '@/store/userProfileStore';
import { toast } from 'sonner'; // Jest auto-mocks this using src/__mocks__/sonner.js
import { __resetSonnerMocks } from '@/__mocks__/sonner'; // Import helper directly

// Mock zustand store hooks
const originalUserProfileState = useUserProfileStore.getState(); // Capture initial state for resetting
jest.mock('@/store/userProfileStore');

// Type assertion for the mocked store hook
const mockedUseUserProfileStore = useUserProfileStore as jest.MockedFunction<typeof useUserProfileStore>;

describe('GoalSettingsForm', () => {
    let mockUpdateSettings: jest.Mock;

    beforeEach(() => {
        // Reset Zustand store to original state
        useUserProfileStore.setState(originalUserProfileState, true);

        // Reset Sonner mocks
        __resetSonnerMocks();

        // Setup mock return value for the store hook for this test suite
        mockUpdateSettings = jest.fn();
        mockedUseUserProfileStore.mockReturnValue({
            profile: {
                userId: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
                dateOfBirth: '1990-01-01',
                heightCm: 180,
                activityLevel: 'MODERATELY_ACTIVE', // Default value used in schema
                goal: 'LOSE_WEIGHT_MILD',          // Default value used in schema
                weeklyTargetWeightLossKg: 0.5,    // Default value used in schema
                targetBodyFatPct: 15,
                targetDate: '2025-12-31',
                dietaryRestrictions: [],
                hasCompletedOnboarding: true,
                fitnessLevel: 'INTERMEDIATE',
                healthConditions: [],
                preferences: { useMetric: true },
                fitbitData: null,
                bmr: 2000,
                tdee: 3100,
                lbm: 70,
                calorieTarget: 2800,
                proteinTarget: 112,
            },
            updateSettings: mockUpdateSettings, // Use the specific mock fn for updateSettings
            // Mock other store functions if needed by the component
            setGoals: jest.fn(),
            setProfileData: jest.fn(),
            setOnboardingCompleted: jest.fn(),
            setFitbitData: jest.fn(),
            clearFitbitData: jest.fn(),
            setFitnessData: jest.fn(),
            setTutorialCompleted: jest.fn(),
        });
    });

    test('renders the form with initial values from profile', () => {
        render(<GoalSettingsForm />);

        // Use getByPlaceholderText or getByDisplayValue for inputs
        expect(screen.getByPlaceholderText('e.g., 11')).toHaveValue(15);
        expect(screen.getByLabelText(/Target Date/i)).toHaveValue('2025-12-31');
    });

    test('updates target body fat percentage field on change', () => {
        render(<GoalSettingsForm />);
        const bodyFatInput = screen.getByPlaceholderText('e.g., 11');
        fireEvent.change(bodyFatInput, { target: { value: '12.5' } });
        expect(bodyFatInput).toHaveValue(12.5);
    });

    test('updates target date field on change', () => {
        render(<GoalSettingsForm />);
        const dateInput = screen.getByLabelText(/Target Date/i);
        fireEvent.change(dateInput, { target: { value: '2026-06-15' } });
        expect(dateInput).toHaveValue('2026-06-15');
    });

    test('calls updateSettings with correct data on form submission', async () => {
        render(<GoalSettingsForm />);

        // Change values
        const bodyFatInput = screen.getByPlaceholderText('e.g., 11');
        const dateInput = screen.getByLabelText(/Target Date/i);
        fireEvent.change(bodyFatInput, { target: { value: '14' } });
        fireEvent.change(dateInput, { target: { value: '2025-10-31' } });

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /Save Goals/i }));

        // Wait for async actions (like updateSettings) and check mock calls
        await waitFor(() => {
            expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
            expect(mockUpdateSettings).toHaveBeenCalledWith({
                targetBodyFatPct: 14, // Zod schema should convert string '14' to number
                targetDate: '2025-10-31',
            });
        });

        // Check for success toast
        expect(toast.success).toHaveBeenCalledWith("Goals updated successfully!");
    });

    test('shows validation error for invalid body fat percentage', async () => {
        render(<GoalSettingsForm />);
        const bodyFatInput = screen.getByPlaceholderText('e.g., 11');
        fireEvent.change(bodyFatInput, { target: { value: '-5' } }); // Invalid value
        fireEvent.click(screen.getByRole('button', { name: /Save Goals/i }));

        // Check for validation message (exact text depends on zod schema message)
        expect(await screen.findByText(/Target % must be positive./i)).toBeInTheDocument();
        expect(mockUpdateSettings).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
    });

    // Add test for optional target date (submitting with empty date)
     test('calls updateSettings with undefined targetDate when date is cleared', async () => {
         render(<GoalSettingsForm />);

         const dateInput = screen.getByLabelText(/Target Date/i);
         fireEvent.change(dateInput, { target: { value: '' } }); // Clear the date

         fireEvent.click(screen.getByRole('button', { name: /Save Goals/i }));

         await waitFor(() => {
             expect(mockUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({
                 targetDate: undefined, // Check if empty string is correctly handled
             }));
         });
         expect(toast.success).toHaveBeenCalled();
     });

    // Test submit button disabled state
    test('submit button is initially disabled', () => {
        render(<GoalSettingsForm />);
        expect(screen.getByRole('button', { name: /Save Goals/i })).toBeDisabled();
    });

    test('submit button becomes enabled when form is dirty', () => {
        render(<GoalSettingsForm />);
        const bodyFatInput = screen.getByPlaceholderText('e.g., 11');
        fireEvent.change(bodyFatInput, { target: { value: '14' } });
        expect(screen.getByRole('button', { name: /Save Goals/i })).not.toBeDisabled();
    });
});