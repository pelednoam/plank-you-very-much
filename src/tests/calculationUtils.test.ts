import { calculateBMR, calculateTDEE, calculateCalorieTarget, calculateProteinTarget } from '@/lib/calculationUtils';
import type { UserProfile, BodyMetrics, ActivityLevel } from '@/types';

// Test suite for calculation utilities
describe('Calculation Utilities', () => {

  // Test cases for calculateBMR
  describe('calculateBMR', () => {
    const mockMetrics: BodyMetrics = {
      date: '2025-01-01T00:00:00Z',
      weightKg: 75,
      bodyFatPct: 15,
      source: 'MANUAL',
    };

    it('calculates BMR correctly for a male', () => {
      const mockProfile: Partial<UserProfile> = {
        dob: '1980-01-01', // ~45 years old in 2025
        sex: 'male',
        heightCm: 180,
      };
      // Expected: 88.362 + (13.397 * 75) + (4.799 * 180) - (5.677 * 45) = ~1701.x rounded
      expect(calculateBMR(mockProfile, mockMetrics)).toBe(1701);
    });

    it('calculates BMR correctly for a female', () => {
      const mockProfile: Partial<UserProfile> = {
        dob: '1990-01-01', // ~35 years old in 2025
        sex: 'female',
        heightCm: 165,
      };
      // Expected: 447.593 + (9.247 * 75) + (3.098 * 165) - (4.330 * 35) = ~1501.x rounded
      expect(calculateBMR(mockProfile, mockMetrics)).toBe(1501);
    });

    it('returns null if required profile data is missing', () => {
      const incompleteProfile: Partial<UserProfile> = { sex: 'male', heightCm: 180 };
      expect(calculateBMR(incompleteProfile, mockMetrics)).toBeNull();
    });

    it('returns null if required metrics data is missing', () => {
      const mockProfile: Partial<UserProfile> = { dob: '1980-01-01', sex: 'male', heightCm: 180 };
      expect(calculateBMR(mockProfile, null)).toBeNull();
    });
  });

  // Test cases for calculateTDEE
  describe('calculateTDEE', () => {
    it('returns null if BMR is null', () => {
      expect(calculateTDEE(null, 'moderate')).toBeNull();
    });

    it('calculates TDEE correctly for different activity levels', () => {
      const bmr = 1700;
      expect(calculateTDEE(bmr, 'sedentary')).toBe(Math.round(1700 * 1.2)); // 2040
      expect(calculateTDEE(bmr, 'light')).toBe(Math.round(1700 * 1.375)); // 2338
      expect(calculateTDEE(bmr, 'moderate')).toBe(Math.round(1700 * 1.55)); // 2635
      expect(calculateTDEE(bmr, 'active')).toBe(Math.round(1700 * 1.725)); // 2933
      expect(calculateTDEE(bmr, 'very_active')).toBe(Math.round(1700 * 1.9)); // 3230
    });

    it('defaults to sedentary if activity level is undefined', () => {
      const bmr = 1700;
      expect(calculateTDEE(bmr, undefined)).toBe(Math.round(1700 * 1.2)); // 2040
    });
  });

  // Test cases for calculateCalorieTarget
  describe('calculateCalorieTarget', () => {
    const tdee = 2500;

    it('returns null if TDEE is null', () => {
      expect(calculateCalorieTarget(null)).toBeNull();
    });

    it('applies default 300 kcal deficit when no goals are set', () => {
      expect(calculateCalorieTarget(tdee)).toBe(2200); // 2500 - 300
    });

    it('applies default 300 kcal deficit if only targetBodyFatPct is set', () => {
      expect(calculateCalorieTarget(tdee, 12)).toBe(2200);
    });

    it('applies default 300 kcal deficit if only targetDate is set', () => {
      expect(calculateCalorieTarget(tdee, undefined, '2025-12-31')).toBe(2200);
    });

    it('applies 500 kcal deficit if both targetBodyFatPct and targetDate are set', () => {
      expect(calculateCalorieTarget(tdee, 11, '2025-12-31')).toBe(2000); // 2500 - 500
    });

     it('applies 500 kcal deficit if targetBodyFatPct is 0 but targetDate is set', () => {
      // Allows for scenarios where the target is simply "lose fat by date" without a specific %
      expect(calculateCalorieTarget(tdee, 0, '2025-12-31')).toBe(2000);
    });

    it('handles TDEE less than the deficit', () => {
        // It shouldn't go below a certain threshold, but the current logic subtracts directly.
        // Let's assume a minimum reasonable target or just test the direct subtraction.
        // For now, test direct subtraction. Maybe add a floor later?
        expect(calculateCalorieTarget(400, 11, '2025-12-31')).toBe(-100); // 400 - 500
        expect(calculateCalorieTarget(200)).toBe(-100); // 200 - 300
        // A more realistic implementation might return min(TDEE - deficit, SAFE_MIN_CALORIES)
    });
  });

  // Test cases for calculateProteinTarget
  describe('calculateProteinTarget', () => {
    const metricsWithFat: BodyMetrics = {
        date: '2025-01-01T00:00:00Z',
        weightKg: 80,
        bodyFatPct: 20, // LBM = 80 * (1 - 0.20) = 64 kg
        source: 'MANUAL',
    };
     const metricsWithoutFat: BodyMetrics = {
        date: '2025-01-01T00:00:00Z',
        weightKg: 80,
        source: 'MANUAL',
    };

    it('returns null if metrics are null', () => {
      expect(calculateProteinTarget(null)).toBeNull();
    });

    it('calculates protein based on LBM when bodyFatPct is available', () => {
      // Expected: 1.6 * 64 = 102.4 -> Math.round(102.4) = 102
      expect(calculateProteinTarget(metricsWithFat)).toBe(102);
    });

    it('calculates protein based on weightKg when bodyFatPct is missing', () => {
       // Expected: 1.6 * weightKg = 1.6 * 80 = 128
      expect(calculateProteinTarget(metricsWithoutFat)).toBeCloseTo(128);
    });

    it('calculates protein based on LBM even if targetBodyFatPct is provided (input metric takes priority)', () => {
      // The targetBodyFatPct parameter isn't currently used in the calculation logic itself,
      // it was just added to the signature. Test confirms it doesn't break existing logic.
      // Expected: 1.6 * 64 = 102.4 -> Math.round(102.4) = 102
      expect(calculateProteinTarget(metricsWithFat, 15)).toBe(102);
      expect(calculateProteinTarget(metricsWithoutFat, 15)).toBeCloseTo(128);
    });
  });

  // TODO: Add tests for calculateCalorieTarget and calculateProteinTarget // Now added above
}); 