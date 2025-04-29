import { usePlannerStore } from './plannerStore';
import { useOfflineQueueStore } from './offlineQueueStore';
import { WeeklyPlan, Workout } from '@/types';

// Mock the offline queue store
jest.mock('./offlineQueueStore', () => ({
  useOfflineQueueStore: {
    getState: jest.fn(() => ({
      addAction: jest.fn(),
      // Add other mocked functions if needed by plannerStore
    })),
    getInitialState: jest.fn(), // Mock if plannerStore uses it during init
    setState: jest.fn(),
  }
}));

// Mock the generateWeeklyPlan utility if it's complex or has side effects
jest.mock('@/features/planner/utils/generatePlan', () => ({
  generateWeeklyPlan: jest.fn((startDate) => ({
    startDate,
    endDate: 'mockEndDate', // Provide a mock end date
    workouts: [
        { id: 'workout-1', type: 'CLIMB', plannedAt: startDate, durationMin: 60 },
        // Add more mock workouts if needed
    ] as Workout[],
  })),
}));

describe('Planner Store', () => {
  let mockAddAction: jest.Mock;

  beforeEach(() => {
    // Reset stores and mocks before each test
    usePlannerStore.setState(usePlannerStore.getInitialState(), true);
    // Reset offline queue mock
    mockAddAction = jest.fn();
    (useOfflineQueueStore.getState as jest.Mock).mockReturnValue({
      addAction: mockAddAction,
    });
    // Reset mocks for generatePlan if needed
    jest.clearAllMocks(); 
  });

  it('should mark workout complete optimistically when online', async () => {
    // Arrange: Set up initial state with a plan
    const initialPlan: WeeklyPlan = {
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      workouts: [{ id: 'w1', type: 'CORE', plannedAt: '2024-01-01T10:00:00Z', durationMin: 30 }],
    };
    usePlannerStore.setState({ currentPlan: initialPlan });
    const completionData = { completedAt: new Date().toISOString(), performanceNotes: 'Good session' };

    // Mock navigator.onLine to be true
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    // Act
    await usePlannerStore.getState().markWorkoutComplete('w1', completionData);

    // Assert: Check optimistic update
    const updatedPlan = usePlannerStore.getState().currentPlan;
    const updatedWorkout = updatedPlan?.workouts.find(w => w.id === 'w1');
    expect(updatedWorkout).toBeDefined();
    expect(updatedWorkout?.completedAt).toEqual(completionData.completedAt);
    expect(updatedWorkout?.performanceNotes).toEqual(completionData.performanceNotes);

    // Assert: Check that offline queue was NOT called
    expect(mockAddAction).not.toHaveBeenCalled();
  });

  it('should queue workout completion when offline', async () => {
    // Arrange
    const initialPlan: WeeklyPlan = {
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      workouts: [{ id: 'w2', type: 'SWIM', plannedAt: '2024-01-02T12:00:00Z', durationMin: 45 }],
    };
    usePlannerStore.setState({ currentPlan: initialPlan });
    const completionData = { completedAt: new Date().toISOString() };

    // Mock navigator.onLine to be false
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    // Act
    await usePlannerStore.getState().markWorkoutComplete('w2', completionData);

    // Assert: Check optimistic update (should still happen)
    const updatedWorkout = usePlannerStore.getState().currentPlan?.workouts.find(w => w.id === 'w2');
    expect(updatedWorkout?.completedAt).toEqual(completionData.completedAt);

    // Assert: Check that offline queue WAS called
    expect(mockAddAction).toHaveBeenCalledTimes(1);
    expect(mockAddAction).toHaveBeenCalledWith({
      type: 'planner/markComplete',
      payload: { workoutId: 'w2', completionData },
    });
  });

  it('should queue workout completion if online sync fails', async () => {
    // Arrange
    const failWorkoutId = 'fail-sync'; // Use the specific ID that triggers failure
    const initialPlan: WeeklyPlan = {
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      workouts: [{ id: failWorkoutId, type: 'CLIMB', plannedAt: '2024-01-03T18:00:00Z', durationMin: 90 }],
    };
    usePlannerStore.setState({ currentPlan: initialPlan });
    const completionData = { completedAt: new Date().toISOString(), actualDurationMin: 85 };

    // Mock navigator.onLine to be true
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    // Act: Call markWorkoutComplete with the ID designed to fail
    await usePlannerStore.getState().markWorkoutComplete(failWorkoutId, completionData);

    // Assert: Optimistic update still happened
    const updatedWorkout = usePlannerStore.getState().currentPlan?.workouts.find(w => w.id === failWorkoutId);
    expect(updatedWorkout?.completedAt).toEqual(completionData.completedAt);

    // Assert: Offline queue WAS called due to the simulated failure
    expect(mockAddAction).toHaveBeenCalledTimes(1);
    expect(mockAddAction).toHaveBeenCalledWith({
      type: 'planner/markComplete',
      payload: { workoutId: failWorkoutId, completionData },
    });
  });
}); 