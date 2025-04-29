import { calculateBMR, calculateTDEE } from '@/lib/calculationUtils';
import type { UserProfile, BodyMetrics, ActivityLevel } from '@/types';

// Test suite for calculation utilities
describe('Calculation Utilities', () => {

  // Test cases for calculateBMR
  describe('calculateBMR', () => {
    const mockMetrics: BodyMetrics = {
      date: '2025-01-01T00:00:00Z',
      weightKg: 75,
      bodyFatPct: 15,
    };

    it('calculates BMR correctly for a male', () => {
      const mockProfile: Partial<UserProfile> = {
        dob: '1980-01-01', // ~45 years old in 2025
        sex: 'male',
        heightCm: 180,
      };
      // Expected: 88.362 + (13.397 * 75) + (4.799 * 180) - (5.677 * 45) = 1702.2 (rounded)
      expect(calculateBMR(mockProfile, mockMetrics)).toBe(1702);
    });

    it('calculates BMR correctly for a female', () => {
      const mockProfile: Partial<UserProfile> = {
        dob: '1990-01-01', // ~35 years old in 2025
        sex: 'female',
        heightCm: 165,
      };
      // Expected: 447.593 + (9.247 * 75) + (3.098 * 165) - (4.330 * 35) = 1500.0 (rounded)
      expect(calculateBMR(mockProfile, mockMetrics)).toBe(1500);
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

  // TODO: Add tests for calculateCalorieTarget and calculateProteinTarget
}); 