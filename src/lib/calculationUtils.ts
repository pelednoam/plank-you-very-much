import dayjs from 'dayjs';
import type { UserProfile, BodyMetrics, ActivityLevel } from '@/types';

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
    // Don't warn if just calculating TDEE where profile might be partial
    // console.warn("Missing required data for BMR calculation:", { profile, latestMetrics });
    return null;
  }

  const age = dayjs().diff(dayjs(profile.dob), 'year');
  const weight = latestMetrics.weightKg;
  const height = profile.heightCm;

  let bmr: number;
  // Use revised Harris-Benedict equations
  if (profile.sex === 'male') {
    bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  } else { // Assume female if not male, or default if sex is undefined (might need refinement)
    bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
  }

  return Math.round(bmr);
}

// Standard TDEE Multipliers
const TDEE_MULTIPLIERS: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

/**
 * Calculates the Total Daily Energy Expenditure (TDEE).
 * Uses BMR and an activity level multiplier.
 *
 * @param bmr - The calculated Basal Metabolic Rate.
 * @param activityLevel - The user's self-reported activity level.
 * @returns The estimated TDEE in kcal/day, or null if BMR is null.
 */
export function calculateTDEE(bmr: number | null, activityLevel: ActivityLevel | undefined): number | null {
  if (bmr === null) {
    return null;
  }

  // Use the selected activity level multiplier, default to sedentary if not provided
  const multiplier = activityLevel ? TDEE_MULTIPLIERS[activityLevel] : TDEE_MULTIPLIERS.sedentary;

  return Math.round(bmr * multiplier);
}

/**
 * Calculates the target daily calorie intake.
 * Uses TDEE and applies a deficit, potentially adjusted by user goals.
 *
 * @param tdee - The calculated TDEE.
 * @param targetBodyFatPct - Optional user goal for target body fat %.
 * @param targetDate - Optional user goal for target date.
 * @returns The target daily calories, or null if TDEE is null.
 */
export function calculateCalorieTarget(
    tdee: number | null,
    targetBodyFatPct?: number, // Added goal param
    targetDate?: string // Added goal param
): number | null {
  if (tdee === null) {
    return null;
  }

  // Basic dynamic deficit: Use a larger deficit if goals are set
  const baseDeficit = 300; // Default deficit
  const goalDeficit = 500; // Increased deficit when goals are present
  
  // Use goalDeficit if both target % and date are set and valid
  const useGoalDeficit = 
      targetBodyFatPct !== undefined && targetBodyFatPct >= 0 && // Allow 0% as valid target indication
      targetDate !== undefined && dayjs(targetDate).isValid() && dayjs(targetDate).isAfter(dayjs());

  const calorieDeficit = useGoalDeficit ? goalDeficit : baseDeficit; 

  console.log(`Using calorie deficit: ${calorieDeficit} (TDEE: ${tdee})`);

  return tdee - calorieDeficit;
}

/**
 * Calculates the target daily protein intake based on Lean Body Mass (LBM).
 *
 * Requires LBM, which can be calculated from weight and body fat percentage.
 * Protein needs might increase slightly during a steeper deficit (goal-oriented).
 *
 * @param latestMetrics - The user's latest body metrics containing weightKg and bodyFatPct.
 * @param targetBodyFatPct - Optional user goal for target body fat %.
 * @returns The target daily protein in grams, or null if required data is missing.
 */
export function calculateProteinTarget(
    latestMetrics: BodyMetrics | null,
    targetBodyFatPct?: number // Added goal param (for potential future adjustment)
): number | null {
  if (!latestMetrics?.weightKg || typeof latestMetrics?.bodyFatPct !== 'number') {
    // Fallback using total body weight (e.g., 1.6g/kg)
    if (latestMetrics?.weightKg) { 
        console.log('Calculating protein target based on total weight (LBM unavailable)');
        return Math.round(latestMetrics.weightKg * 1.6);
     }
    return null;
  }

  const weight = latestMetrics.weightKg;
  const bodyFatPercent = latestMetrics.bodyFatPct / 100; 
  const leanBodyMass = weight * (1 - bodyFatPercent);

  // Spec uses 1.6 g/kg LBM. Could potentially increase slightly if targetBodyFatPct is set?
  const proteinPerKgLBM = 1.6; 
  // Example potential adjustment:
  // const proteinPerKgLBM = (targetBodyFatPct !== undefined && targetBodyFatPct > 0) ? 1.8 : 1.6;

  console.log(`Calculating protein target based on LBM (${leanBodyMass.toFixed(1)}kg) at ${proteinPerKgLBM}g/kg`);

  return Math.round(leanBodyMass * proteinPerKgLBM);
} 