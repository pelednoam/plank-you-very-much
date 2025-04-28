import dayjs from 'dayjs';
import type { UserProfile, BodyMetrics } from '@/types';

/**
 * Calculates the Basal Metabolic Rate (BMR) using the Harris-Benedict equation (revised 1990).
 * Requires user's sex, age, height (cm), and weight (kg).
 *
 * @param profile - The user's profile containing dob, sex, heightCm.
 * @param latestMetrics - The user's latest body metrics containing weightKg.
 * @returns The calculated BMR in kcal/day, or null if required data is missing.
 */
export function calculateBMR(
  profile: Partial<UserProfile>,
  latestMetrics: BodyMetrics | null
): number | null {
  if (
    !profile.dob ||
    !profile.sex ||
    !profile.heightCm ||
    !latestMetrics?.weightKg
  ) {
    console.warn("Missing required data for BMR calculation:", { profile, latestMetrics });
    return null;
  }

  const age = dayjs().diff(dayjs(profile.dob), 'year');
  const weight = latestMetrics.weightKg;
  const height = profile.heightCm;

  let bmr: number;
  if (profile.sex === 'male') {
    // BMR = 88.362 + (13.397 * weight in kg) + (4.799 * height in cm) - (5.677 * age in years)
    bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  } else {
    // BMR = 447.593 + (9.247 * weight in kg) + (3.098 * height in cm) - (4.330 * age in years)
    bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
  }

  return Math.round(bmr);
}

/**
 * Calculates the Total Daily Energy Expenditure (TDEE).
 * Currently uses a placeholder activity multiplier.
 *
 * TODO: Implement a more dynamic activity multiplier based on user input or activity data (e.g., Fitbit steps).
 *
 * @param bmr - The calculated Basal Metabolic Rate.
 * @returns The estimated TDEE in kcal/day, or null if BMR is null.
 */
export function calculateTDEE(bmr: number | null): number | null {
  if (bmr === null) {
    return null;
  }

  // Placeholder activity multiplier (e.g., 1.375 for light activity)
  // Needs refinement based on user's actual activity level.
  const activityMultiplier = 1.375;

  return Math.round(bmr * activityMultiplier);
}

/**
 * Calculates the target daily calorie intake for a deficit.
 * Uses a fixed deficit value for now.
 *
 * TODO: Make deficit configurable or adaptive.
 *
 * @param tdee - The calculated TDEE.
 * @returns The target daily calories, or null if TDEE is null.
 */
export function calculateCalorieTarget(tdee: number | null): number | null {
  if (tdee === null) {
    return null;
  }

  const calorieDeficit = 300; // Fixed deficit from spec (Section 8.2)
  return tdee - calorieDeficit;
}

/**
 * Calculates the target daily protein intake based on Lean Body Mass (LBM).
 *
 * Requires LBM, which can be calculated from weight and body fat percentage.
 *
 * TODO: Consider fallback if LBM is not available (e.g., estimate based on weight).
 *
 * @param latestMetrics - The user's latest body metrics containing weightKg and bodyFatPct.
 * @returns The target daily protein in grams, or null if required data is missing.
 */
export function calculateProteinTarget(latestMetrics: BodyMetrics | null): number | null {
  if (!latestMetrics?.weightKg || typeof latestMetrics?.bodyFatPct !== 'number') {
     console.warn("Missing required data for Protein target calculation:", { latestMetrics });
    return null;
  }

  const weight = latestMetrics.weightKg;
  const bodyFatPercent = latestMetrics.bodyFatPct / 100; // Convert percentage to decimal
  const leanBodyMass = weight * (1 - bodyFatPercent);

  const proteinPerKgLBM = 1.6; // From spec (Section 8.3)

  return Math.round(leanBodyMass * proteinPerKgLBM);
} 