import dayjs from 'dayjs';
import type { UserProfile, ActivityLevel, BodyMetrics } from '@/types';

/**
 * Calculates the Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.
 * Requires weight (kg), height (cm), age (years), and sex.
 *
 * @param profile - The user's profile containing dob, sex, heightCm.
 * @param latestMetrics - The latest body metrics containing weightKg.
 * @returns The calculated BMR in kcal/day, or null if required data is missing.
 */
export function calculateBMR(
  profileFields: Pick<UserProfile, 'heightCm' | 'dob' | 'sex'>,
  metricFields: Pick<BodyMetrics, 'weightKg'> | null
): number | null {
  if (!metricFields?.weightKg || profileFields.heightCm === undefined || !profileFields.dob || !profileFields.sex || profileFields.sex === 'PREFER_NOT_SAY') {
    return null; // Cannot calculate without all required fields
  }

  const age = dayjs().diff(dayjs(profileFields.dob), 'year');
  const weight = Number(metricFields.weightKg);
  const height = Number(profileFields.heightCm);
  
  if (isNaN(weight) || isNaN(height) || isNaN(age)) {
      console.error("[BMR Calc] Invalid number found:", {weight, height, age});
      return null;
  }

  let bmr = 10 * weight + 6.25 * height - 5 * age;

  if (profileFields.sex === 'MALE') {
    bmr += 5;
  } else if (profileFields.sex === 'FEMALE') {
    bmr -= 161;
  }
  // 'OTHER' uses the base formula without adjustment - this is an approximation

  return Math.round(bmr);
}

// Activity level multipliers for TDEE calculation (lowercase keys)
const TDEE_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Calculates the Total Daily Energy Expenditure (TDEE) by multiplying BMR by an activity factor.
 *
 * @param bmr - The calculated Basal Metabolic Rate.
 * @param activityLevel - The user's self-reported activity level.
 * @returns The estimated TDEE in kcal/day, or null if BMR is null.
 */
export function calculateTDEE(bmr: number | null, activityLevel: ActivityLevel | undefined): number | null {
  if (bmr === null || !activityLevel) {
    return null;
  }
  // Default to moderate if activity level is invalid or missing
  const multiplier = TDEE_MULTIPLIERS[activityLevel] || TDEE_MULTIPLIERS.moderate;
  return Math.round(bmr * multiplier);
}

/**
 * Calculates a target daily calorie intake.
 * Prioritizes syncedCaloriesOut if available, otherwise calculates based on TDEE and a deficit.
 * Uses a default deficit of 300 kcal if not specified.
 *
 * @param profile - The user's profile containing weightKg, heightCm, dob, sex, activityLevel, and lastSyncedCaloriesOut.
 * @param deficit - Optional custom deficit to apply. Default is 300 kcal.
 * @returns The target daily calories, or null if TDEE is null.
 */
export function calculateCalorieTarget(
  profile: Pick<UserProfile, 'heightCm' | 'dob' | 'sex' | 'activityLevel' | 'lastSyncedCaloriesOut'> | null,
  latestMetrics: Pick<BodyMetrics, 'weightKg'> | null,
  deficit: number = 300 
): number | null {
  
  if (!profile) return null; 

  // Priority 1: Use directly synced caloriesOut
  if (profile.lastSyncedCaloriesOut !== undefined && profile.lastSyncedCaloriesOut > 0) {
    console.log(`[Calorie Target] Using synced caloriesOut: ${profile.lastSyncedCaloriesOut}`);
    return Math.round(profile.lastSyncedCaloriesOut - deficit);
  }

  // Priority 2: Calculate TDEE
  const bmr = calculateBMR(profile, latestMetrics); 
  const tdee = calculateTDEE(bmr, profile.activityLevel); 

  if (tdee !== null) {
     console.log(`[Calorie Target] Using calculated TDEE: ${tdee}`);
    return Math.round(tdee - deficit);
  }
  
  console.warn("[Calorie Target] Could not calculate target.");
  return null;
}

/**
 * Calculates the target daily protein intake based on Lean Body Mass (LBM).
 *
 * Requires LBM, which can be calculated from weight and body fat percentage.
 * Protein needs might increase slightly during a steeper deficit (goal-oriented).
 *
 * @param profile - The user's profile containing weightKg and bodyFatPct.
 * @param gramsPerKgLBM - Optional custom grams per kg of LBM. Default is 1.6g/kg.
 * @returns The target daily protein in grams, or null if required data is missing.
 */
export function calculateProteinTarget(
  latestMetrics: Pick<BodyMetrics, 'weightKg' | 'bodyFatPct'> | null, 
  gramsPerKgLBM: number = 1.6
): number | null {
  // Extract optional values safely
  const weightKg = latestMetrics?.weightKg;
  const bodyFatPct = latestMetrics?.bodyFatPct;
  
  const lbm = calculateLBM(weightKg, bodyFatPct);
  if (lbm === null) {
     // Fallback: Use total body weight if LBM cannot be calculated (e.g., 1.6g/kg TBW)
     if (weightKg !== undefined) {
         console.log('[Protein Target] Calculating based on total body weight (LBM unavailable).');
         return Math.round(Number(weightKg) * 1.6); 
     }
    return null;
  }
  return Math.round(lbm * gramsPerKgLBM);
}

/**
 * Calculates Lean Body Mass (LBM).
 * Requires weight and bodyFatPct.
 */
export function calculateLBM(weightKg?: number, bodyFatPct?: number): number | null {
  if (weightKg === undefined || bodyFatPct === undefined) {
    return null;
  }
  const numWeight = Number(weightKg);
  const numBodyFatPct = Number(bodyFatPct);
  if (isNaN(numWeight) || isNaN(numBodyFatPct)) return null;
  
  const fatMass = numWeight * (numBodyFatPct / 100);
  return numWeight - fatMass;
} 