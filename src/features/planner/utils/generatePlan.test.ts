import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { generateWeeklyPlan, BASE_DURATIONS, isFatLossGoalActive } from './generatePlan';
import type { UserProfile, WorkoutType, Workout, WeeklyPlan } from '@/types';

dayjs.extend(isBetween);

// Mock the UUID generator for predictable IDs
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
    v4: () => `mock-uuid-${mockUuidCounter++}`,
}));

describe('generateWeeklyPlan', () => {
    const currentMonday = '2024-07-29'; 
    const currentSunday = '2024-08-04';
    const previousMonday = '2024-07-22';
    const previousSunday = '2024-07-28';

    // Base profile for tests
    const baseUserProfile: UserProfile = {
        name: 'Test User',
        lactoseSensitive: false,
        backIssues: false,
        completedOnboarding: true,
        targetBodyFatPct: undefined,
        targetDate: undefined,
    };
    
    // Helper to create a mock previous plan
    const createMockPreviousPlan = (workouts: Partial<Workout>[]): WeeklyPlan => {
        // Generate realistic workout objects from partial data
        const fullWorkouts = workouts.map((partialWorkout, index) => ({
            id: `prev-uuid-${index}`,
            type: 'CORE', // Default type, override as needed
            plannedAt: dayjs(previousMonday).add(index, 'day').format('YYYY-MM-DD'),
            durationMin: 30, // Default duration
            completedAt: undefined,
            notes: undefined,
            performanceRating: undefined,
            ...partialWorkout, // Apply overrides
        }));

        return {
            startDate: previousMonday,
            endDate: previousSunday,
            workouts: fullWorkouts as Workout[], // Cast needed as we built from partial
        };
    };

    beforeEach(() => {
        mockUuidCounter = 0;
        // Mock console.log to suppress adaptation messages during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Restore console.log
    });

    it('should generate a 7-day plan with correct start and end dates', () => {
        const plan = generateWeeklyPlan(currentMonday);
        expect(plan.startDate).toBe(currentMonday);
        expect(plan.endDate).toBe(currentSunday);
        expect(plan.workouts).toHaveLength(7);
    });

    it('should assign unique IDs and correct planned dates to each workout', () => {
        const plan = generateWeeklyPlan(currentMonday);
        const workoutDates = plan.workouts.map(w => w.plannedAt);
        const workoutIds = plan.workouts.map(w => w.id);

        workoutDates.forEach((date, index) => {
            const expectedDate = dayjs(currentMonday).add(index, 'day');
            expect(dayjs(date).isSame(expectedDate, 'day')).toBe(true);
            expect(dayjs(date).isBetween(currentMonday, currentSunday, 'day', '[]')).toBe(true);
        });

        expect(new Set(workoutIds).size).toBe(7);
        expect(workoutIds[0]).toBe('mock-uuid-0');
        expect(workoutIds[6]).toBe('mock-uuid-6');
    });

    // --- Template Selection Tests ---
    it('should use default template with no profile or previous plan', () => {
        const plan = generateWeeklyPlan(currentMonday);
        const workoutTypes = plan.workouts.map(w => w.type);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(2);
        expect(workoutTypes.includes('MOBILITY')).toBe(false);
    });

    it('should use default template with profile (no back issues) and no previous plan', () => {
        const plan = generateWeeklyPlan(currentMonday, { ...baseUserProfile, backIssues: false });
        const workoutTypes = plan.workouts.map(w => w.type);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(2);
        expect(workoutTypes.includes('MOBILITY')).toBe(false);
    });

    it('should use back care template with profile (back issues) and no previous plan', () => {
        const plan = generateWeeklyPlan(currentMonday, { ...baseUserProfile, backIssues: true });
        const workoutTypes = plan.workouts.map(w => w.type);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(1);
        expect(workoutTypes.includes('MOBILITY')).toBe(true);
    });

    // --- Adaptation Tests: Template --- 
    it('should switch to back care template if previous week completion rate < 50%', () => {
        const previousPlan = createMockPreviousPlan([
            { type: 'CLIMB', completedAt: 'some-date' },
            { type: 'SWIM', completedAt: 'some-date' },
            { type: 'CORE', completedAt: undefined }, // Missed
            { type: 'CLIMB', completedAt: undefined }, // Missed
            { type: 'SWIM', completedAt: undefined }, // Missed
            { type: 'CORE', completedAt: undefined }, // Missed
            { type: 'REST' },
        ]); // 2/6 completed = 33%
        const plan = generateWeeklyPlan(currentMonday, { ...baseUserProfile, backIssues: false }, previousPlan);
        const workoutTypes = plan.workouts.map(w => w.type);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(1); // Switched template
        expect(workoutTypes.includes('MOBILITY')).toBe(true);
    });
    
    it('should switch to back care template if >= 2 CORE workouts missed last week', () => {
         const previousPlan = createMockPreviousPlan([
            { type: 'CLIMB', completedAt: 'some-date' },
            { type: 'SWIM', completedAt: 'some-date' },
            { type: 'CORE', completedAt: undefined }, // Missed
            { type: 'CLIMB', completedAt: 'some-date' },
            { type: 'SWIM', completedAt: 'some-date' },
            { type: 'CORE', completedAt: undefined }, // Missed
            { type: 'REST' },
        ]); // 4/6 completed = 66%, but 2 CORE missed
        const plan = generateWeeklyPlan(currentMonday, { ...baseUserProfile, backIssues: false }, previousPlan);
        const workoutTypes = plan.workouts.map(w => w.type);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(1); // Switched template
        expect(workoutTypes.includes('MOBILITY')).toBe(true);
    });

    it('should NOT switch template if completion is >= 50% and < 2 CORE missed', () => {
         const previousPlan = createMockPreviousPlan([
            { type: 'CLIMB', completedAt: 'some-date' },
            { type: 'SWIM', completedAt: undefined }, // Missed
            { type: 'CORE', completedAt: 'some-date' }, 
            { type: 'CLIMB', completedAt: 'some-date' },
            { type: 'SWIM', completedAt: undefined }, // Missed
            { type: 'CORE', completedAt: 'some-date' }, 
            { type: 'REST' },
        ]); // 4/6 completed = 66%
        const plan = generateWeeklyPlan(currentMonday, { ...baseUserProfile, backIssues: false }, previousPlan);
        const workoutTypes = plan.workouts.map(w => w.type);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(2); // Kept default template
        expect(workoutTypes.includes('MOBILITY')).toBe(false);
    });

    it('should stick to back care template if already set by profile, regardless of completion', () => {
         const previousPlan = createMockPreviousPlan([
            { type: 'CLIMB', completedAt: 'some-date' },
            { type: 'SWIM', completedAt: 'some-date' },
            { type: 'CORE', completedAt: 'some-date' }, 
            { type: 'CLIMB', completedAt: 'some-date' },
            { type: 'SWIM', completedAt: 'some-date' },
            { type: 'CORE', completedAt: 'some-date' }, 
            { type: 'REST' },
        ]); // 100% completion
        const plan = generateWeeklyPlan(currentMonday, { ...baseUserProfile, backIssues: true }, previousPlan);
        const workoutTypes = plan.workouts.map(w => w.type);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(1); // Kept back care template
        expect(workoutTypes.includes('MOBILITY')).toBe(true);
    });

    // --- Adaptation Tests: Duration --- 
    it('should use BASE durations if no previous plan', () => {
        const plan = generateWeeklyPlan(currentMonday, baseUserProfile);
        // Check a sample duration
        const coreWorkout = plan.workouts.find(w => w.type === 'CORE');
        expect(coreWorkout?.durationMin).toBe(30);
    });

    it('should DECREASE durations by ~10% if previous week completion < 50%', () => {
        const previousPlan = createMockPreviousPlan([
            { type: 'CLIMB', completedAt: 'some-date' }, { type: 'SWIM' }, { type: 'CORE' }, 
            { type: 'CLIMB' }, { type: 'SWIM' }, { type: 'CORE' }, { type: 'REST' },
        ]); // 1/6 completed
        const plan = generateWeeklyPlan(currentMonday, baseUserProfile, previousPlan);
        // Check sample durations (template might be back-care due to low completion)
        const climbWorkout = plan.workouts.find(w => w.type === 'CLIMB');
        const coreWorkout = plan.workouts.find(w => w.type === 'CORE');
        expect(climbWorkout?.durationMin).toBe(Math.round(90 * 0.9)); // 81
        expect(coreWorkout?.durationMin).toBe(Math.round(30 * 0.9)); // 27
    });

    it('should use BASE durations if previous week completion >= 50% and < 85%', () => {
         const previousPlan = createMockPreviousPlan([
            { type: 'CLIMB', completedAt: 'some-date' }, { type: 'SWIM', completedAt: 'some-date' }, 
            { type: 'CORE', completedAt: 'some-date' }, { type: 'CLIMB' }, { type: 'SWIM' }, 
            { type: 'CORE' }, { type: 'REST' },
        ]); // 3/6 completed = 50%
        // Ensure no fat loss goal is active for baseline duration checks
        const profileNoGoal = { ...baseUserProfile, targetBodyFatPct: undefined }; 
        const plan = generateWeeklyPlan(currentMonday, profileNoGoal, previousPlan);
        const climbWorkout = plan.workouts.find(w => w.type === 'CLIMB');
        const coreWorkout = plan.workouts.find(w => w.type === 'CORE');
        // At 50% completion, neither increase nor decrease factor should apply
        expect(climbWorkout?.durationMin).toBe(90);
        expect(coreWorkout?.durationMin).toBe(30);
    });

    it('should INCREASE durations by ~10% if previous week completion >= 85%', () => {
        const previousPlan = createMockPreviousPlan([
            { type: 'CLIMB', completedAt: 'some-date' }, { type: 'SWIM', completedAt: 'some-date' }, 
            { type: 'CORE', completedAt: 'some-date' }, { type: 'CLIMB', completedAt: 'some-date' }, 
            { type: 'SWIM', completedAt: 'some-date' }, { type: 'CORE' }, { type: 'REST' }, // 5/6 = 83% - NO increase
        ]); 
        const previousPlanHighCompletion = createMockPreviousPlan([
             { type: 'CLIMB', completedAt: 'some-date' }, { type: 'SWIM', completedAt: 'some-date' }, 
             { type: 'CORE', completedAt: 'some-date' }, { type: 'CLIMB', completedAt: 'some-date' }, 
             { type: 'SWIM', completedAt: 'some-date' }, { type: 'CORE', completedAt: 'some-date' }, { type: 'REST' }, // 6/6 = 100%
        ]);

        // Test boundary (83% - no increase)
        const planBoundary = generateWeeklyPlan(currentMonday, baseUserProfile, previousPlan);
        expect(planBoundary.workouts.find(w => w.type === 'CLIMB')?.durationMin).toBe(90);
        expect(planBoundary.workouts.find(w => w.type === 'CORE')?.durationMin).toBe(30);

        // Test high completion (100% - increase)
        const planHigh = generateWeeklyPlan(currentMonday, baseUserProfile, previousPlanHighCompletion);
        expect(planHigh.workouts.find(w => w.type === 'CLIMB')?.durationMin).toBe(Math.round(90 * 1.1)); // 99
        expect(planHigh.workouts.find(w => w.type === 'CORE')?.durationMin).toBe(Math.round(30 * 1.1)); // 33
    });

    it('should apply fat loss boost *before* completion rate adjustment', () => {
        const userProfileWithGoal: UserProfile = { 
            ...baseUserProfile, 
            targetBodyFatPct: 10, 
            targetDate: dayjs().add(1, 'month').format('YYYY-MM-DD') 
        };
        // Previous plan with high completion
        const previousPlanHighCompletion = createMockPreviousPlan([
             { type: 'CLIMB', completedAt: 'some-date' }, { type: 'SWIM', completedAt: 'some-date' }, 
             { type: 'CORE', completedAt: 'some-date' }, { type: 'CLIMB', completedAt: 'some-date' }, 
             { type: 'SWIM', completedAt: 'some-date' }, { type: 'CORE', completedAt: 'some-date' }, { type: 'REST' }, 
        ]); // 6/6 = 100% -> increase factor 1.1

        const plan = generateWeeklyPlan(currentMonday, userProfileWithGoal, previousPlanHighCompletion);
        const climbWorkout = plan.workouts.find(w => w.type === 'CLIMB');
        const swimWorkout = plan.workouts.find(w => w.type === 'SWIM');
        const coreWorkout = plan.workouts.find(w => w.type === 'CORE');

        // CLIMB: (Base 90 + FatLoss 15) * Completion 1.1 = 105 * 1.1 = 115.5 -> 116
        expect(climbWorkout?.durationMin).toBe(Math.round(105 * 1.1)); 
        // SWIM: (Base 45 + FatLoss 15) * Completion 1.1 = 60 * 1.1 = 66
        expect(swimWorkout?.durationMin).toBe(Math.round(60 * 1.1));
        // CORE: (Base 30 + FatLoss 0) * Completion 1.1 = 30 * 1.1 = 33
        expect(coreWorkout?.durationMin).toBe(Math.round(30 * 1.1));
    });

    it('should enforce minimum duration of 5 minutes after adjustments', () => {
        // Create a scenario where decrease would push duration below 5
        const previousPlanVeryLowCompletion = createMockPreviousPlan([
            { type: 'CORE' }, { type: 'CORE' }, { type: 'CORE' }, { type: 'CORE' },
            { type: 'CORE' }, { type: 'CORE' }, { type: 'REST' },
        ]); // 0/6 completion -> 0.9 factor

        // Mock base duration to be low
        const originalCoreDuration = BASE_DURATIONS.CORE;
        BASE_DURATIONS.CORE = 5; // Set base to 5

        try {
            const plan = generateWeeklyPlan(currentMonday, baseUserProfile, previousPlanVeryLowCompletion);
            const coreWorkout = plan.workouts.find(w => w.type === 'CORE');
            // Base 5 * 0.9 = 4.5 -> capped at 5
            expect(coreWorkout?.durationMin).toBe(5);
        } finally {
            // Restore original base duration
            BASE_DURATIONS.CORE = originalCoreDuration;
        }
    });

    // Revised test for fatLossActive determination (implicit)
    it('should apply fat loss duration boost only when goal is active', () => {
        const profileNoGoal: UserProfile = { ...baseUserProfile };
        const profileWithGoalFuture: UserProfile = {
            ...baseUserProfile,
            targetBodyFatPct: 10,
            targetDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
        };
        const profileWithGoalPast: UserProfile = {
            ...baseUserProfile,
            targetBodyFatPct: 10,
            targetDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        };
        
        // Create a previous plan with NEUTRAL completion (e.g., 75%) to avoid increase/decrease factor interference
        const previousPlanNeutralCompletion = createMockPreviousPlan([
            { type: 'CLIMB', completedAt: 'some-date' }, { type: 'SWIM', completedAt: 'some-date' }, 
            { type: 'CORE', completedAt: 'some-date' }, { type: 'CLIMB', completedAt: 'some-date' }, 
            { type: 'SWIM' }, { type: 'CORE' }, { type: 'REST' }, 
        ]); // 4/6 = ~67% -> factor 1.0

        const planNoGoal = generateWeeklyPlan(currentMonday, profileNoGoal, previousPlanNeutralCompletion);
        const planGoalPast = generateWeeklyPlan(currentMonday, profileWithGoalPast, previousPlanNeutralCompletion);
        const planGoalFuture = generateWeeklyPlan(currentMonday, profileWithGoalFuture, previousPlanNeutralCompletion);

        // No goal or past goal: CLIMB/SWIM should have base duration (factors are 1.0)
        expect(planNoGoal.workouts.find(w => w.type === 'CLIMB')?.durationMin).toBe(BASE_DURATIONS.CLIMB);
        expect(planNoGoal.workouts.find(w => w.type === 'SWIM')?.durationMin).toBe(BASE_DURATIONS.SWIM);
        expect(planGoalPast.workouts.find(w => w.type === 'CLIMB')?.durationMin).toBe(BASE_DURATIONS.CLIMB);
        expect(planGoalPast.workouts.find(w => w.type === 'SWIM')?.durationMin).toBe(BASE_DURATIONS.SWIM);

        // Active goal: CLIMB/SWIM should have base + 15 duration (factors are 1.0)
        expect(planGoalFuture.workouts.find(w => w.type === 'CLIMB')?.durationMin).toBe(BASE_DURATIONS.CLIMB + 15);
        expect(planGoalFuture.workouts.find(w => w.type === 'SWIM')?.durationMin).toBe(BASE_DURATIONS.SWIM + 15);
    });

    // Test that workouts are still initialized correctly
    it('should initialize workouts as not completed', () => {
        const plan = generateWeeklyPlan(currentMonday);
        plan.workouts.forEach(workout => {
            expect(workout.completedAt).toBeUndefined();
            expect(workout.notes).toBeUndefined();
            expect(workout.performanceRating).toBeUndefined();
        });
    });

    // --- Helper Function Tests (if any, e.g., shuffle, fatLossActive) ---
    // Note: Shuffle is hard to test deterministically without mocking Math.random extensively.
    // We rely on checking the overall distribution of workout types.

    // Test fatLossActive determination
    it('should correctly determine if fat loss goal is active', () => {
        const profileNoGoal: UserProfile = { ...baseUserProfile };
        const profileWithGoalPast: UserProfile = {
            ...baseUserProfile,
            targetBodyFatPct: 10,
            targetDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        };
        const profileWithGoalFuture: UserProfile = {
            ...baseUserProfile,
            targetBodyFatPct: 10,
            targetDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
        };
        const profileWithGoalNoDate: UserProfile = {
            ...baseUserProfile,
            targetBodyFatPct: 10,
            targetDate: undefined,
        };

        expect(isFatLossGoalActive(null)).toBe(false);
        expect(isFatLossGoalActive(profileNoGoal)).toBe(false);
        expect(isFatLossGoalActive(profileWithGoalPast)).toBe(false);
        expect(isFatLossGoalActive(profileWithGoalFuture)).toBe(true);
        expect(isFatLossGoalActive(profileWithGoalNoDate)).toBe(false); // Requires a date
    });

    // Example test checking overall workout distribution (due to shuffle)
    it('should contain the correct number of each workout type based on the selected template', () => {
        // Default template
        const planDefault = generateWeeklyPlan(currentMonday, baseUserProfile);
        const typesDefault = planDefault.workouts.map(w => w.type).sort();
        expect(typesDefault).toEqual(['CLIMB', 'CLIMB', 'CORE', 'CORE', 'REST', 'SWIM', 'SWIM']);

        // Back care template
        const planBackCare = generateWeeklyPlan(currentMonday, { ...baseUserProfile, backIssues: true });
        const typesBackCare = planBackCare.workouts.map(w => w.type).sort();
        // Corrected expectation based on backCareTemplate definition
        expect(typesBackCare).toEqual(['CLIMB', 'CLIMB', 'CORE', 'MOBILITY', 'REST', 'SWIM', 'SWIM']); 
    });

    // --- Adaptation Tests: Back Issues --- 

    it('should use back care template AND reduce CLIMB duration by ~20% if back issues active', () => {
        const profileWithBackIssues = { ...baseUserProfile, backIssues: true };
        const plan = generateWeeklyPlan(currentMonday, profileWithBackIssues); // No prev plan, no fat loss

        // 1. Check template
        const workoutTypes = plan.workouts.map(w => w.type);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(1);
        expect(workoutTypes.includes('MOBILITY')).toBe(true);

        // 2. Check durations
        const climbWorkout = plan.workouts.find(w => w.type === 'CLIMB');
        const swimWorkout = plan.workouts.find(w => w.type === 'SWIM');
        const coreWorkout = plan.workouts.find(w => w.type === 'CORE');
        const mobilityWorkout = plan.workouts.find(w => w.type === 'MOBILITY');

        // Climb duration should be BASE * 0.8
        expect(climbWorkout?.durationMin).toBe(Math.round(BASE_DURATIONS.CLIMB * 0.8)); // 90 * 0.8 = 72
        // Other durations should remain at BASE
        expect(swimWorkout?.durationMin).toBe(BASE_DURATIONS.SWIM); // 45
        expect(coreWorkout?.durationMin).toBe(BASE_DURATIONS.CORE); // 30
        expect(mobilityWorkout?.durationMin).toBe(BASE_DURATIONS.MOBILITY); // 20
    });

    it('should combine back issue reduction with other adaptations (e.g., fat loss, completion rate)', () => {
        const profileWithBackIssuesAndGoal = {
            ...baseUserProfile,
            backIssues: true,
            targetBodyFatPct: 10,
            targetDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
        };
        const previousPlanHighCompletion = createMockPreviousPlan([
            { type: 'CLIMB', completedAt: 'some-date' }, { type: 'SWIM', completedAt: 'some-date' },
            { type: 'CORE', completedAt: 'some-date' }, { type: 'CLIMB', completedAt: 'some-date' },
            { type: 'SWIM', completedAt: 'some-date' }, { type: 'CORE', completedAt: 'some-date' },
            { type: 'REST' },
        ]); // 6/6 completed = 100%

        const plan = generateWeeklyPlan(currentMonday, profileWithBackIssuesAndGoal, previousPlanHighCompletion);

        // Find a CLIMB workout
        const climbWorkout = plan.workouts.find(w => w.type === 'CLIMB');
        expect(climbWorkout).toBeDefined();

        // Expected calculation:
        // 1. Base Duration: 90
        // 2. Fat Loss Boost: 90 + 15 = 105
        // 3. Completion Rate Increase (100% -> 1.1 factor): Math.round(105 * 1.1) = Math.round(115.5) = 116
        // 4. Back Issue Reduction (0.8 factor): Math.round(116 * 0.8) = Math.round(92.8) = 93
        // 5. Round: 93 (Final Result)
        expect(climbWorkout?.durationMin).toBe(93);
    });

    // --- Fat Loss Goal Tests ---

    it('should increase CLIMB and SWIM duration by 15 mins if fat loss goal is active', () => {
        const profileWithGoal = {
            ...baseUserProfile,
            targetBodyFatPct: 10,
            targetDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
        };
        const plan = generateWeeklyPlan(currentMonday, profileWithGoal);
        const climbWorkout = plan.workouts.find(w => w.type === 'CLIMB');
        const swimWorkout = plan.workouts.find(w => w.type === 'SWIM');
        const coreWorkout = plan.workouts.find(w => w.type === 'CORE');
        // const mobilityWorkout = plan.workouts.find(w => w.type === 'MOBILITY'); // MOBILITY not in default template

        expect(climbWorkout?.durationMin).toBe(BASE_DURATIONS.CLIMB + 15);
        expect(swimWorkout?.durationMin).toBe(BASE_DURATIONS.SWIM + 15);
        expect(coreWorkout?.durationMin).toBe(BASE_DURATIONS.CORE);
        // expect(mobilityWorkout?.durationMin).toBe(BASE_DURATIONS.MOBILITY); // Cannot check MOBILITY here
    });
});