import dayjs from 'dayjs';
import { calculateBMR, calculateTDEE, calculateCalorieTarget, calculateProteinTarget, calculateLBM } from './calculationUtils';
import type { UserProfile, BodyMetrics, ActivityLevel } from '@/types';

// --- Mocks and Test Data --- 

const mockProfileBase: Pick<UserProfile, 'heightCm' | 'dob' | 'sex' | 'activityLevel' | 'lastSyncedCaloriesOut'> = {
    heightCm: 180,
    dob: '1980-01-01', // Ensures age calculation is consistent
    sex: 'MALE',
    activityLevel: 'moderate',
    lastSyncedCaloriesOut: undefined,
};

const mockMetricsBase: Pick<BodyMetrics, 'weightKg' | 'bodyFatPct'> = {
    weightKg: 80,
    bodyFatPct: 15,
};

// Expected BMR for mockProfileBase & mockMetricsBase (Male, 80kg, 180cm, ~45y)
// BMR = (10 * 80) + (6.25 * 180) - (5 * age) + 5
// BMR = 800 + 1125 - (5 * age) + 5 
// Age calculation needs to be precise for the test date
const calculateAge = (dob: string) => dayjs().diff(dayjs(dob), 'year');
const ageForTest = calculateAge(mockProfileBase.dob!);
const expectedBMRMale = Math.round((10 * 80) + (6.25 * 180) - (5 * ageForTest) + 5);

// Expected TDEE (moderate activity = 1.55 multiplier)
const expectedTDEEMaleModerate = Math.round(expectedBMRMale * 1.55);

// --- Test Suite --- 

describe('Calculation Utilities', () => {

    describe('calculateBMR', () => {
        it('should calculate BMR correctly for MALE', () => {
            const bmr = calculateBMR(mockProfileBase, mockMetricsBase);
            expect(bmr).toBeCloseTo(expectedBMRMale, 0); // Use toBeCloseTo due to potential rounding differences
        });

        it('should calculate BMR correctly for FEMALE', () => {
            const profileFemale = { ...mockProfileBase, sex: 'FEMALE' as 'FEMALE' | 'MALE' | 'OTHER' | 'PREFER_NOT_SAY' };
            const expectedBMRFemale = Math.round((10 * 80) + (6.25 * 180) - (5 * ageForTest) - 161);
            const bmr = calculateBMR(profileFemale, mockMetricsBase);
            expect(bmr).toBeCloseTo(expectedBMRFemale, 0);
        });
        
        it('should calculate BMR correctly for OTHER (using base formula)', () => {
            const profileOther = { ...mockProfileBase, sex: 'OTHER' as 'FEMALE' | 'MALE' | 'OTHER' | 'PREFER_NOT_SAY' };
            const expectedBMROther = Math.round((10 * 80) + (6.25 * 180) - (5 * ageForTest)); // No +/- adjustment
            const bmr = calculateBMR(profileOther, mockMetricsBase);
            expect(bmr).toBeCloseTo(expectedBMROther, 0);
        });

        it('should return null if required profile data is missing', () => {
            expect(calculateBMR({ ...mockProfileBase, dob: undefined }, mockMetricsBase)).toBeNull();
            expect(calculateBMR({ ...mockProfileBase, sex: undefined }, mockMetricsBase)).toBeNull();
            expect(calculateBMR({ ...mockProfileBase, sex: 'PREFER_NOT_SAY' }, mockMetricsBase)).toBeNull();
            expect(calculateBMR({ ...mockProfileBase, heightCm: undefined }, mockMetricsBase)).toBeNull();
        });

        it('should return null if required metric data is missing', () => {
            expect(calculateBMR(mockProfileBase, null)).toBeNull();
            // Test case with weightKg undefined is invalid according to type, test null metrics object instead.
            // expect(calculateBMR(mockProfileBase, { weightKg: undefined })).toBeNull(); 
        });
        
         it('should handle non-numeric inputs gracefully', () => {
            const invalidMetrics = { weightKg: 'invalid' as any };
            expect(calculateBMR(mockProfileBase, invalidMetrics)).toBeNull();
         });
    });

    describe('calculateTDEE', () => {
        it('should calculate TDEE correctly for different activity levels', () => {
            const bmr = expectedBMRMale;
            expect(calculateTDEE(bmr, 'sedentary')).toBeCloseTo(bmr * 1.2, 0);
            expect(calculateTDEE(bmr, 'light')).toBeCloseTo(bmr * 1.375, 0);
            expect(calculateTDEE(bmr, 'moderate')).toBeCloseTo(bmr * 1.55, 0);
            expect(calculateTDEE(bmr, 'active')).toBeCloseTo(bmr * 1.725, 0);
            // Expect the rounded value as the function likely uses Math.round
            expect(calculateTDEE(bmr, 'very_active')).toBe(Math.round(bmr * 1.9));
        });

        it('should return null if BMR is null', () => {
            expect(calculateTDEE(null, 'moderate')).toBeNull();
        });
        
        it('should return null if activityLevel is undefined', () => {
            const bmr = expectedBMRMale;
            expect(calculateTDEE(bmr, undefined)).toBeNull();
        });

        it('should default to moderate multiplier if activityLevel is an invalid string', () => {
            const bmr = expectedBMRMale;
            expect(calculateTDEE(bmr, 'invalid_level' as any)).toBeCloseTo(bmr * 1.55, 0);
        });
    });

    describe('calculateCalorieTarget', () => {
        const deficit = 300;

        it('should prioritize lastSyncedCaloriesOut if available and positive', () => {
            const profileSynced = { ...mockProfileBase, lastSyncedCaloriesOut: 2800 };
            const target = calculateCalorieTarget(profileSynced, mockMetricsBase, deficit);
            expect(target).toBe(2800 - deficit); // 2500
        });

        it('should ignore lastSyncedCaloriesOut if zero or undefined', () => {
            const profileSyncedZero = { ...mockProfileBase, lastSyncedCaloriesOut: 0 };
            const profileSyncedUndefined = { ...mockProfileBase, lastSyncedCaloriesOut: undefined };
            const expectedTargetFromTDEE = expectedTDEEMaleModerate - deficit;

            expect(calculateCalorieTarget(profileSyncedZero, mockMetricsBase, deficit)).toBeCloseTo(expectedTargetFromTDEE, 0);
            expect(calculateCalorieTarget(profileSyncedUndefined, mockMetricsBase, deficit)).toBeCloseTo(expectedTargetFromTDEE, 0);
        });

        it('should calculate target based on TDEE if sync data is unavailable', () => {
            const target = calculateCalorieTarget(mockProfileBase, mockMetricsBase, deficit);
            const expectedTargetFromTDEE = expectedTDEEMaleModerate - deficit;
            expect(target).toBeCloseTo(expectedTargetFromTDEE, 0);
        });

        it('should use the provided deficit', () => {
            const customDeficit = 500;
            const profileSynced = { ...mockProfileBase, lastSyncedCaloriesOut: 2800 };
            // Using synced data
            expect(calculateCalorieTarget(profileSynced, mockMetricsBase, customDeficit)).toBe(2800 - customDeficit);
            // Using TDEE
            const expectedTargetFromTDEE = expectedTDEEMaleModerate - customDeficit;
            expect(calculateCalorieTarget(mockProfileBase, mockMetricsBase, customDeficit)).toBeCloseTo(expectedTargetFromTDEE, 0);
        });

        it('should return null if profile is null', () => {
            expect(calculateCalorieTarget(null, mockMetricsBase, deficit)).toBeNull();
        });

        it('should return null if TDEE cannot be calculated and sync data is unavailable', () => {
            const profileMissingBMRData = { ...mockProfileBase, dob: undefined };
            expect(calculateCalorieTarget(profileMissingBMRData, mockMetricsBase, deficit)).toBeNull();
        });
    });

    describe('calculateLBM', () => {
        it('should calculate LBM correctly', () => {
            const weight = 80;
            const bfPct = 15;
            const expectedFatMass = 80 * (15 / 100); // 12
            const expectedLBM = 80 - expectedFatMass; // 68
            expect(calculateLBM(weight, bfPct)).toBeCloseTo(expectedLBM, 1); // Allow slight precision diff
        });

        it('should return null if weight is missing', () => {
            // LBM calculation requires weightKg
            expect(calculateLBM(undefined, 15)).toBeNull();
        });

        it('should return null if bodyFatPct is missing', () => {
            expect(calculateLBM(80, undefined)).toBeNull();
        });
        
        it('should handle non-numeric inputs gracefully', () => {
             expect(calculateLBM('invalid' as any, 15)).toBeNull();
             expect(calculateLBM(80, 'invalid' as any)).toBeNull();
        });
    });

    describe('calculateProteinTarget', () => {
        it('should calculate protein target based on LBM if available', () => {
            const metrics = { weightKg: 80, bodyFatPct: 15 }; // LBM = 68
            const expectedTarget = 68 * 1.6;
            expect(calculateProteinTarget(metrics)).toBeCloseTo(expectedTarget, 0);
        });

        it('should use custom gramsPerKgLBM if provided', () => {
             const metrics = { weightKg: 80, bodyFatPct: 15 }; // LBM = 68
            const expectedTarget = 68 * 2.0;
            expect(calculateProteinTarget(metrics, 2.0)).toBeCloseTo(expectedTarget, 0);
        });

        it('should fall back to total body weight if LBM cannot be calculated (missing bodyFatPct)', () => {
            const metrics = { weightKg: 80, bodyFatPct: undefined };
            const expectedTarget = 80 * 1.6; // Fallback calculation
            expect(calculateProteinTarget(metrics)).toBeCloseTo(expectedTarget, 0);
        });
        
         it('should fall back to total body weight if LBM cannot be calculated (non-numeric bodyFatPct)', () => {
            const metrics = { weightKg: 80, bodyFatPct: 'invalid' as any };
            const expectedTarget = 80 * 1.6; // Fallback calculation
            expect(calculateProteinTarget(metrics)).toBeCloseTo(expectedTarget, 0);
        });

        it('should return null if weight is missing (cannot calculate LBM or use fallback)', () => {
            // If metrics object is null, protein target should be null
            expect(calculateProteinTarget(null)).toBeNull(); 
            // If metrics object exists but weightKg is missing (violates type, but test robustness)
            const metricsMissingWeight = { bodyFatPct: 15 } as any; // Cast to bypass type check for test
            expect(calculateProteinTarget(metricsMissingWeight)).toBeNull();
        });
        
         it('should return null if weight is missing and bodyFatPct is missing', () => {
             // If metrics object is null
            expect(calculateProteinTarget(null)).toBeNull();
            // If metrics object exists but both are missing (violates type, but test robustness)
             const metricsMissingAll = { } as any;
            expect(calculateProteinTarget(metricsMissingAll)).toBeNull();
        });
        
         it('should return null if metrics are null', () => {
            expect(calculateProteinTarget(null)).toBeNull();
        });
    });
}); 