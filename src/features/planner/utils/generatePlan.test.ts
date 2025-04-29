import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { generateWeeklyPlan } from './generatePlan';
import type { UserProfile, WorkoutType, Workout } from '@/types';

dayjs.extend(isBetween);

// Mock the UUID generator for predictable IDs
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
    v4: () => `mock-uuid-${mockUuidCounter++}`,
}));

describe('generateWeeklyPlan', () => {
    const startDate = '2024-07-29'; // A Monday
    const endDate = '2024-08-04'; // Corresponding Sunday

    beforeEach(() => {
        // Reset counter before each test
        mockUuidCounter = 0;
    });

    it('should generate a 7-day plan with correct start and end dates', () => {
        const plan = generateWeeklyPlan(startDate);
        expect(plan.startDate).toBe(startDate);
        expect(plan.endDate).toBe(endDate);
        expect(plan.workouts).toHaveLength(7);
    });

    it('should assign unique IDs and correct planned dates to each workout', () => {
        const plan = generateWeeklyPlan(startDate);
        const workoutDates = plan.workouts.map(w => w.plannedAt);
        const workoutIds = plan.workouts.map(w => w.id);

        // Check dates are within the week
        workoutDates.forEach((date, index) => {
            const expectedDate = dayjs(startDate).add(index, 'day');
            expect(dayjs(date).isSame(expectedDate, 'day')).toBe(true);
            // More robust check: Ensure the date falls within the start and end date range inclusive
            expect(dayjs(date).isBetween(startDate, endDate, 'day', '[]')).toBe(true);
        });

        // Check IDs are unique (using the mock)
        expect(new Set(workoutIds).size).toBe(7);
        expect(workoutIds[0]).toBe('mock-uuid-0');
        expect(workoutIds[6]).toBe('mock-uuid-6');
    });

    it('should use the default template when no user profile is provided', () => {
        const plan = generateWeeklyPlan(startDate);
        const workoutTypes = plan.workouts.map(w => w.type);
        // Default: 2 Climb, 2 Swim, 2 Core, 1 Rest
        expect(workoutTypes.filter(t => t === 'CLIMB').length).toBe(2);
        expect(workoutTypes.filter(t => t === 'SWIM').length).toBe(2);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(2);
        expect(workoutTypes.filter(t => t === 'REST').length).toBe(1);
        expect(workoutTypes.includes('MOBILITY')).toBe(false);
    });

    it('should use the default template when user profile has no back issues', () => {
        const userProfile: UserProfile = {
            name: 'Test User',
            lactoseSensitive: false,
            backIssues: false,
            completedOnboarding: true,
        };
        const plan = generateWeeklyPlan(startDate, userProfile);
        const workoutTypes = plan.workouts.map(w => w.type);
        expect(workoutTypes.filter(t => t === 'CLIMB').length).toBe(2);
        expect(workoutTypes.filter(t => t === 'SWIM').length).toBe(2);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(2);
        expect(workoutTypes.filter(t => t === 'REST').length).toBe(1);
        expect(workoutTypes.includes('MOBILITY')).toBe(false);
    });

    it('should use the back care template when user profile has back issues', () => {
        const userProfile: UserProfile = {
            name: 'Test User',
            lactoseSensitive: false,
            backIssues: true,
            completedOnboarding: true,
            targetBodyFatPct: undefined,
            targetDate: undefined,
        };
        const plan = generateWeeklyPlan(startDate, userProfile);
        const workoutTypes = plan.workouts.map(w => w.type);
        // Back Care: 2 Climb, 2 Swim, 1 Core, 1 Mobility, 1 Rest
        expect(workoutTypes.filter(t => t === 'CLIMB').length).toBe(2);
        expect(workoutTypes.filter(t => t === 'SWIM').length).toBe(2);
        expect(workoutTypes.filter(t => t === 'CORE').length).toBe(1);
        expect(workoutTypes.filter(t => t === 'MOBILITY').length).toBe(1);
        expect(workoutTypes.filter(t => t === 'REST').length).toBe(1);
    });

    it('should assign correct BASE durations when no fat loss goal is active', () => {
        const userProfile: UserProfile = {
            name: 'Test User',
            lactoseSensitive: false,
            backIssues: false,
            completedOnboarding: true,
            targetBodyFatPct: undefined,
            targetDate: undefined,
        };
        const plan = generateWeeklyPlan(startDate, userProfile);
        plan.workouts.forEach(workout => {
            switch (workout.type) {
                case 'CLIMB': expect(workout.durationMin).toBe(90); break;
                case 'SWIM': expect(workout.durationMin).toBe(45); break;
                case 'CORE': expect(workout.durationMin).toBe(30); break;
                case 'STRENGTH': expect(workout.durationMin).toBe(60); break;
                case 'MOBILITY': expect(workout.durationMin).toBe(20); break;
                case 'REST': expect(workout.durationMin).toBe(0); break;
                default: fail(`Unexpected workout type: ${workout.type}`);
            }
        });
    });

    it('should assign INCREASED durations for CLIMB/SWIM when fat loss goal IS active', () => {
        const userProfileWithGoal: UserProfile = {
            name: 'Test User',
            lactoseSensitive: false,
            backIssues: false,
            completedOnboarding: true,
            targetBodyFatPct: 10,
            targetDate: dayjs().add(3, 'month').format('YYYY-MM-DD'),
        };
        const plan = generateWeeklyPlan(startDate, userProfileWithGoal);
        plan.workouts.forEach(workout => {
            switch (workout.type) {
                case 'CLIMB': expect(workout.durationMin).toBe(105); break;
                case 'SWIM': expect(workout.durationMin).toBe(60); break;
                case 'CORE': expect(workout.durationMin).toBe(30); break;
                case 'STRENGTH': expect(workout.durationMin).toBe(60); break;
                case 'MOBILITY': expect(workout.durationMin).toBe(20); break;
                case 'REST': expect(workout.durationMin).toBe(0); break;
                default: fail(`Unexpected workout type: ${workout.type}`);
            }
        });
    });

    it('should use BASE durations if fat loss goal date is in the past', () => {
        const userProfilePastGoal: UserProfile = {
            name: 'Test User',
            lactoseSensitive: false,
            backIssues: false,
            completedOnboarding: true,
            targetBodyFatPct: 10,
            targetDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        };
        const plan = generateWeeklyPlan(startDate, userProfilePastGoal);
        plan.workouts.forEach(workout => {
            switch (workout.type) {
                case 'CLIMB': expect(workout.durationMin).toBe(90); break;
                case 'SWIM': expect(workout.durationMin).toBe(45); break;
                case 'CORE': expect(workout.durationMin).toBe(30); break;
                case 'STRENGTH': expect(workout.durationMin).toBe(60); break;
                case 'MOBILITY': expect(workout.durationMin).toBe(20); break;
                case 'REST': expect(workout.durationMin).toBe(0); break;
                default: fail(`Unexpected workout type: ${workout.type}`);
            }
        });
    });

    it('should use BASE durations if only targetBodyFatPct is set (no date)', () => {
        const userProfileOnlyPct: UserProfile = {
            name: 'Test User',
            lactoseSensitive: false,
            backIssues: false,
            completedOnboarding: true,
            targetBodyFatPct: 10,
            targetDate: undefined,
        };
        const plan = generateWeeklyPlan(startDate, userProfileOnlyPct);
        plan.workouts.forEach(workout => {
            expect(workout.durationMin).toBe({
                'CLIMB': 90, 'SWIM': 45, 'CORE': 30, 'STRENGTH': 60, 'MOBILITY': 20, 'REST': 0
            }[workout.type]);
        });
    });

    it('should initialize workouts as not completed', () => {
        const plan = generateWeeklyPlan(startDate);
        plan.workouts.forEach(workout => {
            expect(workout.completedAt).toBeUndefined();
            expect(workout.startedAt).toBeUndefined();
            expect(workout.notes).toBeUndefined();
            expect(workout.performanceRating).toBeUndefined();
        });
    });
}); 