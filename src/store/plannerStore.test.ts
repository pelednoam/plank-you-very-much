import { usePlannerStore, initializePlannerStore } from './plannerStore';
import { useOfflineQueueStore } from './offlineQueueStore';
import { useUserProfileStore } from './userProfileStore'; // Import user profile store
import { WeeklyPlan, Workout, UserProfile } from '@/types';
import dayjs from 'dayjs'; 
import isoWeek from 'dayjs/plugin/isoWeek';
import { generateWeeklyPlan } from '@/features/planner/utils/generatePlan';

dayjs.extend(isoWeek);

// Mock the offline queue store
jest.mock('./offlineQueueStore', () => ({
  useOfflineQueueStore: {
    getState: jest.fn(() => ({
      addAction: jest.fn(),
    })),
    getInitialState: jest.fn(() => ({ actions: [] })), // Provide a minimal initial state
    setState: jest.fn(),
  }
}));

// Mock the user profile store
jest.mock('./userProfileStore', () => ({
    useUserProfileStore: {
      // getState now returns the full state shape including the 'profile' property
      getState: jest.fn(() => ({
        profile: { name: 'Mock User', backIssues: false, completedOnboarding: true } as UserProfile, // Provide a mock profile
      })),
      getInitialState: jest.fn(() => ({ profile: null })), // Minimal initial state
      setState: jest.fn(),
    }
}));

// Mock the generateWeeklyPlan utility - keep it simple for most tests
// Specific tests can override this mock if needed
jest.mock('@/features/planner/utils/generatePlan', () => ({
  generateWeeklyPlan: jest.fn((startDate, userProfile, previousPlan) => ({
    startDate,
    endDate: dayjs(startDate).add(6, 'day').format('YYYY-MM-DD'),
    workouts: [
        { 
            id: `workout-${startDate}-1`, 
            type: 'CLIMB', 
            plannedAt: dayjs(startDate).format('YYYY-MM-DD'), 
            durationMin: 60, 
            completedAt: undefined, 
            performanceNotes: undefined,
            notes: undefined, // Add notes
            performanceRating: undefined, // Add rating
        },
        // Add more mock workouts if needed
    ] as Workout[],
  })),
}));

describe('Planner Store', () => {
  let mockAddAction: jest.Mock;
  let mockGenerateWeeklyPlan: jest.Mock;

  beforeEach(() => {
    // Reset stores and mocks before each test
    usePlannerStore.setState(usePlannerStore.getInitialState(), true);
    // Reset offline queue mock
    mockAddAction = jest.fn();
    (useOfflineQueueStore.getState as jest.Mock).mockReturnValue({
      addAction: mockAddAction,
    });
    // Reset user profile mock - ensure it returns the correct state structure
    (useUserProfileStore.getState as jest.Mock).mockReturnValue({
       profile: { name: 'Mock User', backIssues: false, completedOnboarding: true } as UserProfile,
    });
    // Reset generatePlan mock
    mockGenerateWeeklyPlan = generateWeeklyPlan as jest.Mock;
    mockGenerateWeeklyPlan.mockClear();
    // Re-apply default mock implementation
    mockGenerateWeeklyPlan.mockImplementation((startDate, userProfile, previousPlan) => ({
        startDate,
        endDate: dayjs(startDate).add(6, 'day').format('YYYY-MM-DD'),
        workouts: [
            { id: `workout-${startDate}-1`, type: 'CLIMB', plannedAt: dayjs(startDate).format('YYYY-MM-DD'), durationMin: 60, completedAt: undefined, notes: undefined, performanceRating: undefined },
            { id: `workout-${startDate}-2`, type: 'SWIM', plannedAt: dayjs(startDate).add(1, 'day').format('YYYY-MM-DD'), durationMin: 45, completedAt: undefined, notes: undefined, performanceRating: undefined },
            { id: `workout-${startDate}-3`, type: 'CORE', plannedAt: dayjs(startDate).add(2, 'day').format('YYYY-MM-DD'), durationMin: 30, completedAt: undefined, notes: undefined, performanceRating: undefined },
            { id: `workout-${startDate}-4`, type: 'CLIMB', plannedAt: dayjs(startDate).add(3, 'day').format('YYYY-MM-DD'), durationMin: 60, completedAt: undefined, notes: undefined, performanceRating: undefined },
            { id: `workout-${startDate}-5`, type: 'SWIM', plannedAt: dayjs(startDate).add(4, 'day').format('YYYY-MM-DD'), durationMin: 45, completedAt: undefined, notes: undefined, performanceRating: undefined },
            { id: `workout-${startDate}-6`, type: 'CORE', plannedAt: dayjs(startDate).add(5, 'day').format('YYYY-MM-DD'), durationMin: 30, completedAt: undefined, notes: undefined, performanceRating: undefined },
            { id: `workout-${startDate}-7`, type: 'REST', plannedAt: dayjs(startDate).add(6, 'day').format('YYYY-MM-DD'), durationMin: 0, completedAt: undefined, notes: undefined, performanceRating: undefined },
        ] as Workout[],
    }));

    // Mock navigator.onLine = true by default
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    // Restore mocks
    jest.restoreAllMocks();
  });

  // --- Plan Generation Tests --- 
  it('should generate a plan for the correct week start date', async () => {
    const today = dayjs();
    const expectedStartDate = today.startOf('isoWeek').format('YYYY-MM-DD');
    // Pass the date string to the action
    await usePlannerStore.getState().generatePlanForWeek(expectedStartDate);
    expect(mockGenerateWeeklyPlan).toHaveBeenCalled();
    const actualStartDate = mockGenerateWeeklyPlan.mock.calls[0][0]; // First arg is startDate
    expect(actualStartDate).toEqual(expectedStartDate);
    expect(usePlannerStore.getState().plans[expectedStartDate]).toBeDefined();
  });

  it('should adjust start date to Monday if a different day is passed', async () => {
    const wednesday = dayjs().startOf('isoWeek').add(2, 'days'); // A Wednesday
    const expectedStartDate = wednesday.startOf('isoWeek').format('YYYY-MM-DD');
    // Pass the date string
    await usePlannerStore.getState().generatePlanForWeek(wednesday.format('YYYY-MM-DD'));
    expect(mockGenerateWeeklyPlan).toHaveBeenCalled();
    const actualStartDate = mockGenerateWeeklyPlan.mock.calls[0][0];
    expect(actualStartDate).toEqual(expectedStartDate);
    expect(usePlannerStore.getState().plans[expectedStartDate]).toBeDefined();
  });

  it('should fetch user profile and pass it to generateWeeklyPlan', async () => {
    const today = dayjs();
    const expectedStartDate = today.startOf('isoWeek').format('YYYY-MM-DD');
    // Get the profile from the mocked state
    const expectedProfile = useUserProfileStore.getState().profile;
    // Ensure the generatePlanForWeek action is called with the profile
    // Note: The mock implementation of generatePlanForWeek already expects userProfile as the second arg
    await usePlannerStore.getState().generatePlanForWeek(expectedStartDate, expectedProfile);
    expect(mockGenerateWeeklyPlan).toHaveBeenCalled();
    const actualProfile = mockGenerateWeeklyPlan.mock.calls[0][1]; // Second arg is userProfile
    expect(actualProfile).toEqual(expectedProfile);
  });

  it('should retrieve the previous week plan and pass it to generateWeeklyPlan', async () => {
    const today = dayjs('2024-01-15'); // A Monday
    const currentStartDate = today.format('YYYY-MM-DD');
    const previousWeekStartDate = '2024-01-08';
    const mockPreviousPlan: WeeklyPlan = {
      startDate: previousWeekStartDate,
      endDate: '2024-01-14',
      workouts: [{ id: 'prev-w1', type: 'CORE', plannedAt: '2024-01-08', durationMin: 30 }],
    };
    // Pre-populate the store with the previous week's plan
    usePlannerStore.setState({ plans: { [previousWeekStartDate]: mockPreviousPlan } });

    await usePlannerStore.getState().generatePlanForWeek(currentStartDate);

    expect(mockGenerateWeeklyPlan).toHaveBeenCalled();
    const actualPreviousPlan = mockGenerateWeeklyPlan.mock.calls[0][2]; // Third arg is previousWeekPlan
    expect(actualPreviousPlan).toEqual(mockPreviousPlan);
  });

  it('should pass null as previous plan if no plan exists for the previous week', async () => {
    const today = dayjs('2024-01-15');
    const currentStartDate = today.format('YYYY-MM-DD');
    // Ensure no plan exists for '2024-01-08'
    usePlannerStore.setState({ plans: {} }); 

    await usePlannerStore.getState().generatePlanForWeek(currentStartDate);

    expect(mockGenerateWeeklyPlan).toHaveBeenCalled();
    const actualPreviousPlan = mockGenerateWeeklyPlan.mock.calls[0][2];
    expect(actualPreviousPlan).toBeNull();
  });

  it('should store the generated plan under the correct start date key', async () => {
    const today = dayjs('2024-01-22');
    const startDateKey = today.startOf('isoWeek').format('YYYY-MM-DD');
    const mockGeneratedPlan = { 
        startDate: startDateKey,
        endDate: today.endOf('isoWeek').format('YYYY-MM-DD'),
        workouts: [{id: 'new-w1', type:'CLIMB'}] as Workout[]
    };
    mockGenerateWeeklyPlan.mockReturnValue(mockGeneratedPlan);

    await usePlannerStore.getState().generatePlanForWeek(startDateKey);

    const storedPlans = usePlannerStore.getState().plans;
    expect(storedPlans[startDateKey]).toBeDefined();
    expect(storedPlans[startDateKey]).toEqual(mockGeneratedPlan);
  });

  // --- Get Plan Tests --- 
  it('getPlanForDate should return the correct plan containing the date', () => {
     const plan1Start = '2024-01-01';
     const plan2Start = '2024-01-08';
     const plan1: WeeklyPlan = { startDate: plan1Start, endDate: '2024-01-07', workouts: [{ id: 'p1w1' }] as Workout[] };
     const plan2: WeeklyPlan = { startDate: plan2Start, endDate: '2024-01-14', workouts: [{ id: 'p2w1' }] as Workout[] };
     usePlannerStore.setState({ plans: { [plan1Start]: plan1, [plan2Start]: plan2 } });

     // Pass date strings
     expect(usePlannerStore.getState().getPlanForDate('2024-01-03')).toEqual(plan1);
     expect(usePlannerStore.getState().getPlanForDate('2024-01-08')).toEqual(plan2);
     expect(usePlannerStore.getState().getPlanForDate('2024-01-14')).toEqual(plan2);
  });

  it('getPlanForDate should return null if no plan contains the date', () => {
      const plan1Start = '2024-01-01';
      const plan1: WeeklyPlan = { startDate: plan1Start, endDate: '2024-01-07', workouts: [{ id: 'p1w1' }] as Workout[] };
      usePlannerStore.setState({ plans: { [plan1Start]: plan1 } });

      expect(usePlannerStore.getState().getPlanForDate('2023-12-31')).toBeNull();
      expect(usePlannerStore.getState().getPlanForDate('2024-01-15')).toBeNull();
  });

  // --- Mark Complete Tests --- 
  it('should mark workout complete optimistically when online', async () => {
    // Arrange: Set up initial state with a plan in the 'plans' record
    const planStartDate = '2024-01-01';
    const initialPlan: WeeklyPlan = {
      startDate: planStartDate,
      endDate: '2024-01-07',
      workouts: [{ id: 'w1', type: 'CORE', plannedAt: '2024-01-01', durationMin: 30, completedAt: undefined, notes: undefined, performanceRating: undefined }],
    };
    usePlannerStore.setState({ plans: { [planStartDate]: initialPlan } });
    const completionData = { completedAt: new Date().toISOString(), performanceNotes: 'Good session' };

    // Act
    await usePlannerStore.getState().markWorkoutComplete('w1', completionData);

    // Assert: Check optimistic update
    const updatedPlan = usePlannerStore.getState().plans[planStartDate];
    const updatedWorkout = updatedPlan?.workouts.find(w => w.id === 'w1');
    expect(updatedWorkout).toBeDefined();
    expect(updatedWorkout?.completedAt).toEqual(completionData.completedAt);
    expect(updatedWorkout?.performanceNotes).toEqual(completionData.performanceNotes);
    expect(mockAddAction).not.toHaveBeenCalled();
  });

  it('should queue workout completion when offline', async () => {
    // Arrange
    const planStartDate = '2024-01-01';
    const initialPlan: WeeklyPlan = {
      startDate: planStartDate,
      endDate: '2024-01-07',
      workouts: [{ id: 'w2', type: 'SWIM', plannedAt: '2024-01-02', durationMin: 45, completedAt: undefined, notes: undefined, performanceRating: undefined }],
    };
    usePlannerStore.setState({ plans: { [planStartDate]: initialPlan } });
    const completionData = { completedAt: new Date().toISOString() };
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    // Act
    await usePlannerStore.getState().markWorkoutComplete('w2', completionData);

    // Assert: Check optimistic update and queue action
    const updatedPlan = usePlannerStore.getState().plans[planStartDate];
    const updatedWorkout = updatedPlan?.workouts.find(w => w.id === 'w2');
    expect(updatedWorkout).toBeDefined();
    expect(updatedWorkout?.completedAt).toEqual(completionData.completedAt);
    expect(mockAddAction).toHaveBeenCalledTimes(1);
    expect(mockAddAction).toHaveBeenCalledWith({
      type: 'planner/markComplete',
      payload: { workoutId: 'w2', completionData },
    });
  });

  it('should queue workout completion if online sync fails', async () => {
    // Arrange
    const planStartDate = '2024-01-01';
    const failWorkoutId = 'fail-sync';
    const initialPlan: WeeklyPlan = {
      startDate: planStartDate,
      endDate: '2024-01-07',
      workouts: [{ id: failWorkoutId, type: 'CLIMB', plannedAt: '2024-01-03', durationMin: 90, completedAt: undefined, notes: undefined, performanceRating: undefined }],
    };
    usePlannerStore.setState({ plans: { [planStartDate]: initialPlan } });
    const completionData = { completedAt: new Date().toISOString(), actualDurationMin: 85 };

    // Act: markWorkoutComplete simulates failure for 'fail-sync' ID
    await usePlannerStore.getState().markWorkoutComplete(failWorkoutId, completionData);

    // Assert: Optimistic update and queue action
    const updatedPlan = usePlannerStore.getState().plans[planStartDate];
    const updatedWorkout = updatedPlan?.workouts.find(w => w.id === failWorkoutId);
    expect(updatedWorkout).toBeDefined();
    expect(updatedWorkout?.completedAt).toEqual(completionData.completedAt);
    expect(mockAddAction).toHaveBeenCalledTimes(1);
    expect(mockAddAction).toHaveBeenCalledWith({
      type: 'planner/markComplete',
      payload: { workoutId: failWorkoutId, completionData },
    });
  });

   // --- Initialization Tests ---
   it('initializePlannerStore should generate plan for current week if none exists', () => {
     const today = dayjs();
     const currentWeekKey = today.startOf('isoWeek').format('YYYY-MM-DD');
     // Ensure no plan exists initially
     usePlannerStore.setState({ plans: {} });
     const userProfile = useUserProfileStore.getState().profile;

     // Call the exported function directly, passing the profile
     initializePlannerStore(userProfile);

     expect(mockGenerateWeeklyPlan).toHaveBeenCalledTimes(1);
     const callArgs = mockGenerateWeeklyPlan.mock.calls[0];
     expect(callArgs[0]).toBe(currentWeekKey); // Check start date
     expect(callArgs[1]).toEqual(userProfile); // Check profile passed
     // Check that the plan was actually added to the store state
     expect(usePlannerStore.getState().plans[currentWeekKey]).toBeDefined();
   });

   it('initializePlannerStore should NOT generate plan if one exists for current week', () => {
       const today = dayjs();
       const currentWeekKey = today.startOf('isoWeek').format('YYYY-MM-DD');
       const existingPlan: WeeklyPlan = {
           startDate: currentWeekKey,
           endDate: today.endOf('isoWeek').format('YYYY-MM-DD'),
           workouts: [{ id: 'existing-w1', type: 'CORE', plannedAt: currentWeekKey, durationMin: 30 }],
       };
       // Pre-populate with existing plan
       usePlannerStore.setState({ plans: { [currentWeekKey]: existingPlan } });
       const userProfile = useUserProfileStore.getState().profile;

       // Call the exported function directly, passing the profile
       initializePlannerStore(userProfile);

       expect(mockGenerateWeeklyPlan).not.toHaveBeenCalled();
       // Verify the existing plan is still there
       expect(usePlannerStore.getState().plans[currentWeekKey]).toEqual(existingPlan);
   });

    it('initializePlannerStore should force generate plan if forceRegenerate is true', () => {
        const today = dayjs();
        const currentWeekKey = today.startOf('isoWeek').format('YYYY-MM-DD');
        const existingPlan: WeeklyPlan = {
            startDate: currentWeekKey,
            endDate: today.endOf('isoWeek').format('YYYY-MM-DD'),
            workouts: [{ id: 'existing-w1', type: 'CORE', plannedAt: currentWeekKey, durationMin: 30 }],
        };
        // Pre-populate with existing plan
        usePlannerStore.setState({ plans: { [currentWeekKey]: existingPlan } });
        const userProfile = useUserProfileStore.getState().profile;

        // Call with forceRegenerate = true, passing the profile
        initializePlannerStore(userProfile, true);

        expect(mockGenerateWeeklyPlan).toHaveBeenCalledTimes(1);
        const callArgs = mockGenerateWeeklyPlan.mock.calls[0];
        expect(callArgs[0]).toBe(currentWeekKey); // Check start date
        expect(callArgs[1]).toEqual(userProfile); // Check profile passed
        // Check that the plan was re-added (mock returns a default plan)
        expect(usePlannerStore.getState().plans[currentWeekKey]).toBeDefined();
        // Check it's not strictly the same object, indicating regeneration
        expect(usePlannerStore.getState().plans[currentWeekKey]).not.toEqual(existingPlan);
    });
}); 