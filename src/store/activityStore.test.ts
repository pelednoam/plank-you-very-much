import { act } from '@testing-library/react';
import { useActivityStore } from './activityStore';
import type { FitbitDaily } from '@/types';
import { clearIdbStorage } from '@/lib/idbStorage'; // Use the correct clear function

describe('ActivityStore', () => {
    // Clear mock IDB before each test
    beforeEach(async () => {
        // Reset store state before each test
        act(() => {
            useActivityStore.setState({
                dailyActivities: {},
                // Keep actions
                addOrUpdateActivity: useActivityStore.getState().addOrUpdateActivity,
                getActivityForDate: useActivityStore.getState().getActivityForDate,
             }, true); // `true` replaces the entire state
        });
        // Clear the mock IDB storage
        await clearIdbStorage(); 
        // Optional: Verify clearing (might require inspecting mock IDB directly depending on setup)
    });

    it('should initialize with an empty dailyActivities object', () => {
        const dailyActivities = useActivityStore.getState().dailyActivities;
        expect(dailyActivities).toEqual({});
    });

    it('should add a new FitbitDaily activity using addOrUpdateActivity', () => {
        const fitbitData: FitbitDaily = {
            date: '2024-05-15',
            steps: 10000,
            caloriesOut: 2500,
            restingHeartRate: 60,
            sleepMinutes: 450,
        };

        act(() => {
            useActivityStore.getState().addOrUpdateActivity(fitbitData);
        });

        const activities = useActivityStore.getState().dailyActivities;
        // Check using the correct date format YYYY-MM-DD
        expect(activities['2024-05-15']).toEqual(fitbitData);
        expect(Object.keys(activities).length).toBe(1);
    });

    it('should update an existing FitbitDaily activity using addOrUpdateActivity', () => {
        const initialDate = '2024-05-15';
        const initialData: FitbitDaily = {
            date: initialDate,
            steps: 10000,
            caloriesOut: 2500,
        };
        const updateData: FitbitDaily = {
            date: initialDate, // Use the same date
            steps: 10500, // Update steps
            caloriesOut: 2550, // Update calories
            restingHeartRate: 58, // Add heart rate
        };

        // Set initial state
        act(() => {
             useActivityStore.setState({ dailyActivities: { [initialDate]: initialData } });
        });

        act(() => {
            // Calling addOrUpdateActivity with the same date should overwrite/merge
            useActivityStore.getState().addOrUpdateActivity(updateData);
        });

        const activities = useActivityStore.getState().dailyActivities;
        // Expect the data for the date to be completely replaced by the updateData
        expect(activities[initialDate]).toEqual(updateData);
        expect(Object.keys(activities).length).toBe(1);
    });

    it('should handle adding activity data with different date formats correctly (normalizing to YYYY-MM-DD)', () => {
        const fitbitData: FitbitDaily = {
            date: '2024/05/16', // Different format
            steps: 8000,
            caloriesOut: 2200,
        };

        act(() => {
            useActivityStore.getState().addOrUpdateActivity(fitbitData);
        });

        const activities = useActivityStore.getState().dailyActivities;
        expect(activities['2024-05-16']).toBeDefined(); // Check with normalized key
        expect(activities['2024-05-16'].steps).toBe(8000);
        expect(activities['2024/05/16']).toBeUndefined(); // Original key should not exist
    });

    describe('getActivityForDate Selector', () => {
         beforeEach(() => {
             // Populate state for selector tests
             const activitiesData = {
                 '2024-05-14': { date: '2024-05-14', steps: 8000, caloriesOut: 2000 },
                 '2024-05-15': { date: '2024-05-15', steps: 10000, caloriesOut: 2500 },
             };
             act(() => {
                 useActivityStore.setState({ dailyActivities: activitiesData });
             });
         });

        it('should return the correct activity for a specific date', () => {
            const activity = useActivityStore.getState().getActivityForDate('2024-05-15');
            expect(activity).toBeDefined();
            expect(activity?.steps).toBe(10000);
            expect(activity?.caloriesOut).toBe(2500);
        });

        it('should return undefined for a date with no activity', () => {
            const activity = useActivityStore.getState().getActivityForDate('2024-05-17');
            expect(activity).toBeUndefined();
        });

         it('should return the correct activity regardless of input date format', () => {
             const activity = useActivityStore.getState().getActivityForDate('2024/05/14'); // Use different format
             expect(activity).toBeDefined();
             expect(activity?.date).toBe('2024-05-14'); // Stored date is normalized
             expect(activity?.steps).toBe(8000);
         });
    });

    // Test Persistence (Basic)
    // Note: Requires proper mocking of idbStorage via jest.setup.js
    it('should persist dailyActivities state to storage', async () => {
        const fitbitData: FitbitDaily = {
            date: '2024-05-18',
            steps: 5000,
            caloriesOut: 1800,
        };

        act(() => {
            useActivityStore.getState().addOrUpdateActivity(fitbitData);
        });

        // Wait for potential debounce/async persistence if applicable
        await act(async () => { 
            await new Promise(resolve => setTimeout(resolve, 0)); 
        });

        // Access the mock storage directly
        const storageOptions = useActivityStore.persist.getOptions();
        const storageName = storageOptions.name;
        const storage = storageOptions.storage;

        // Ensure storageName is defined before using it
        if (!storageName) {
            throw new Error("Storage name is undefined in persist options");
        }
        
        const persistedState = await storage?.getItem(storageName);

        // Add checks for persistedState and persistedState.state
        expect(persistedState).toBeDefined();
        expect(persistedState?.state).toBeDefined(); 
        expect(persistedState?.state?.dailyActivities).toBeDefined();
        expect(persistedState?.state?.dailyActivities['2024-05-18']).toEqual(fitbitData);
    });
}); 