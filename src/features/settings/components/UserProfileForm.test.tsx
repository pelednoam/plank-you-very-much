import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import UserProfileForm from './UserProfileForm';
import { useUserProfileStore } from '@/store/userProfileStore';
import { toast } from 'sonner'; // Jest auto-mocks this
import { __resetSonnerMocks } from '@/__mocks__/sonner'; // Import helper directly
import type { UserProfile } from '@/types'; // Import the UserProfile type

// Mock zustand store hooks
const originalUserProfileState = useUserProfileStore.getState();
jest.mock('@/store/userProfileStore');
const mockedUseUserProfileStore = useUserProfileStore as jest.MockedFunction<typeof useUserProfileStore>;

// Mock calculation utils (may not be directly used by form, but store uses them)
jest.mock('@/lib/calculationUtils');

describe('UserProfileForm', () => {
    let mockUpdateSettings: jest.Mock;
    // Define the mock profile data structure once
    const mockProfileData: UserProfile = {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
        dob: '1990-01-01',
        sex: 'MALE',
        heightCm: 180,
        activityLevel: 'moderate',
        lactoseSensitive: false,
        backIssues: false,
        equipment: [],
        targetBodyFatPct: 15,
        targetDate: '2025-12-31',
        completedOnboarding: true,
        notificationPrefs: { workoutReminders: true },
        completedTutorials: [],
    };

    beforeEach(() => {
        // Reset store state first
        useUserProfileStore.setState(originalUserProfileState, true);
        __resetSonnerMocks();

        mockUpdateSettings = jest.fn();
        
        // Setup mock return value for the store hook
        mockedUseUserProfileStore.mockReturnValue({
            // Explicitly provide the profile data here
            profile: mockProfileData,
            updateSettings: mockUpdateSettings,
            // Mock other store functions as before
            setProfile: jest.fn(),
            completeOnboarding: jest.fn(),
            updateNotificationPref: jest.fn(),
            updateFitnessData: jest.fn(),
            clearProfile: jest.fn(),
            markTutorialComplete: jest.fn(),
            hasCompletedTutorial: jest.fn(),
            setFitbitConnection: jest.fn(),
            clearFitbitConnection: jest.fn(),
        });
    });

    test('renders form with initial profile values', () => {
        render(<UserProfileForm />);
        expect(screen.getByLabelText(/Name/i)).toHaveValue('Test User');
        expect(screen.getByLabelText(/Date of Birth/i)).toHaveValue('1990-01-01');
        expect(screen.getByRole('combobox', { name: /Sex/i })).toHaveTextContent('Male');
        expect(screen.getByLabelText(/Height \(cm\)/i)).toHaveValue(180);
        expect(screen.getByRole('combobox', { name: /Activity Level/i })).toHaveTextContent(/Moderately Active/i);
        expect(screen.getByLabelText(/Lactose Sensitive/i)).not.toBeChecked();
        expect(screen.getByLabelText(/Target Body Fat/i)).toHaveValue(15);
        expect(screen.getByLabelText(/Target Date/i)).toHaveValue('2025-12-31');
    });

    test('updates name field on change', () => {
        render(<UserProfileForm />);
        const nameInput = screen.getByLabelText(/Name/i);
        fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
        expect(nameInput).toHaveValue('Updated Name');
    });

     test('updates height field on change', () => {
        render(<UserProfileForm />);
        const heightInput = screen.getByLabelText(/Height \(cm\)/i);
        fireEvent.change(heightInput, { target: { value: '185' } });
        expect(heightInput).toHaveValue(185);
    });

    test('calls updateSettings with updated data on form submission', async () => {
        render(<UserProfileForm />);

        // Change standard inputs
        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New Name' } });
        fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1992-05-10' } });
        fireEvent.change(screen.getByLabelText(/Height \(cm\)/i), { target: { value: '175' } });
        fireEvent.click(screen.getByLabelText(/Lactose Sensitive/i));
        fireEvent.change(screen.getByLabelText(/Target Body Fat/i), { target: { value: '12.3' } });
        fireEvent.change(screen.getByLabelText(/Target Date/i), { target: { value: '2026-01-01' } });

        // Change Sex Select
        const sexTrigger = screen.getByRole('combobox', { name: /Sex/i });
        fireEvent.click(sexTrigger);
        let sexListbox = await screen.findByRole('listbox');
        fireEvent.click(within(sexListbox).getByText('Female'));

        // Change Activity Level Select - Use findByRole to handle potential delays
        const activityTrigger = await screen.findByRole('combobox', { name: /Activity Level/i });
        fireEvent.click(activityTrigger);
        let activityListbox = await screen.findByRole('listbox'); 
        fireEvent.click(within(activityListbox).getByText(/Lightly Active/i));

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        // Wait for async actions and check mock calls
        await waitFor(() => {
            expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
            expect(mockUpdateSettings).toHaveBeenCalledWith({
                name: 'New Name',
                dob: '1992-05-10',
                sex: 'FEMALE',
                heightCm: 175, 
                activityLevel: 'light',
                lactoseSensitive: true, 
                targetBodyFatPct: 12.3,
                targetDate: '2026-01-01',
            });
        });

        // Check for success toast
        expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
    });

    test('shows validation error for invalid height', async () => {
        render(<UserProfileForm />);
        const heightInput = screen.getByLabelText(/Height \(cm\)/i);
        fireEvent.change(heightInput, { target: { value: '-10' } }); // Invalid value
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        // Check for validation message from Zod refine
        expect(await screen.findByText(/Height must be a positive number/i)).toBeInTheDocument();
        expect(mockUpdateSettings).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
    });

     test('shows validation error for future date of birth', async () => {
        render(<UserProfileForm />);
        const dobInput = screen.getByLabelText(/Date of Birth/i);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
        const futureDateString = futureDate.toISOString().split('T')[0];

        fireEvent.change(dobInput, { target: { value: futureDateString } });
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        // Check for validation message (adjust text based on actual schema message)
        expect(await screen.findByText(/Date of birth cannot be in the future/i)).toBeInTheDocument();
        expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    // Test submit button disabled state
    test('submit button is initially disabled', () => {
        render(<UserProfileForm />);
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
    });

    test('submit button becomes enabled when form is dirty', () => {
        render(<UserProfileForm />);
        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Different Name' } });
        expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled();
    });
}); 