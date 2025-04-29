import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { generateWeeklyPlan } from './generatePlan';
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
        const plan = generateWeeklyPlan(currentMonday, baseUserProfile, previousPlan);
        const climbWorkout = plan.workouts.find(w => w.type === 'CLIMB');
        const coreWorkout = plan.workouts.find(w => w.type === 'CORE');
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
        ]);

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

    it('should ensure minimum duration of 5 minutes after adjustments', () => {
        // Previous plan with very low completion
         const previousPlanLowCompletion = createMockPreviousPlan([
            { type: 'MOBILITY' }, { type: 'MOBILITY' }, { type: 'MOBILITY' }, { type: 'MOBILITY' },
            { type: 'MOBILITY' }, { type: 'MOBILITY' }, { type: 'REST' }, // 0/6 completion
        ]);
        // Use back care template to ensure MOBILITY is present
        const plan = generateWeeklyPlan(currentMonday, { ...baseUserProfile, backIssues: true }, previousPlanLowCompletion);
        const mobilityWorkout = plan.workouts.find(w => w.type === 'MOBILITY');
        // Expected: Base 20 * Completion 0.9 = 18. Should remain 18.
        expect(mobilityWorkout?.durationMin).toBe(Math.round(20*0.9));

        // Test case where adjusted duration might go below 5 (hypothetical base duration)
        const originalBaseMobility = (generateWeeklyPlan as any).__get__('BASE_DURATIONS')['MOBILITY'];
        (generateWeeklyPlan as any).__set__({
            BASE_DURATIONS: { ... (generateWeeklyPlan as any).__get__('BASE_DURATIONS'), MOBILITY: 5 }
        });
        const planLowBase = generateWeeklyPlan(currentMonday, { ...baseUserProfile, backIssues: true }, previousPlanLowCompletion);
        const lowBaseMobility = planLowBase.workouts.find(w => w.type === 'MOBILITY');
        // Expected: Base 5 * Completion 0.9 = 4.5 -> rounded 5 (due to Math.max(5, ...))
        expect(lowBaseMobility?.durationMin).toBe(5);
        // Restore original base duration
        (generateWeeklyPlan as any).__set__({
            BASE_DURATIONS: { ... (generateWeeklyPlan as any).__get__('BASE_DURATIONS'), MOBILITY: originalBaseMobility }
        });
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

});