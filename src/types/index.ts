// Data models based on Section 7 of the Technical Specification

export interface BodyMetrics {
  date: string; // ISO 8601 format (e.g., "2025-04-28T10:00:00Z")
  weightKg: number;
  bodyFatPct?: number; // Optional based on scale/source capabilities
  muscleMassKg?: number; // Optional based on scale capabilities
  visceralRating?: number; // Optional based on scale capabilities
  notes?: string; // Optional field for notes or flags like failure simulation
  source: 'MANUAL' | 'WYZE' | 'FITBIT'; // Added based on Spec 8F/7
}

export type WorkoutType = 'CLIMB' | 'SWIM' | 'CORE' | 'STRENGTH' | 'REST' | 'MOBILITY';

export interface Workout {
  id: string; // Consider using UUID
  type: WorkoutType;
  plannedAt: string; // ISO 8601 DateTime
  durationMin: number; // Planned duration
  completedAt?: string; // ISO 8601 DateTime, indicates completion
  startedAt?: string; // ISO 8601 DateTime, indicates start triggered by NFC/QR
  mediaIds?: string[]; // Links to MediaAsset IDs
  notes?: string; // Pre-workout notes or plan details
  syncStatus?: 'pending' | 'synced' | 'error'; // For optimistic UI and offline updates
  
  // Fields for logging actual performance
  actualDurationMin?: number;
  performanceNotes?: string; // Post-workout notes, feedback
  performanceRating?: number; // e.g., RPE (1-10) or satisfaction (1-5)
  // Add more specific fields as needed (e.g., sets, reps, weight for STRENGTH)
  // distanceKm?: number; // for SWIM
  // avgPace?: string; // for SWIM
}

export interface Meal {
  id: string; // Consider using UUID
  timestamp: string; // ISO 8601 DateTime
  description?: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  lactoseFree: boolean;
  mediaIds?: string[]; // Links to MediaAsset IDs for recipes/photos
  syncStatus?: 'pending' | 'synced' | 'deleting' | 'error'; // For optimistic UI
}

export interface MediaAsset {
  id: string;
  type: 'IMAGE' | 'GIF' | 'VIDEO';
  url: string; // Can be local (/media/...) or external
  thumbnail?: string;
  description?: string;
  tags: string[]; // For filtering/search (e.g., ['core', 'plank', 'back-safe'])
}

export interface FitbitDaily {
  date: string; // yyyy-MM-dd format
  steps?: number; // Make optional
  restingHeartRate?: number; // Already optional
  caloriesOut?: number; // Make optional
  sleepMinutes?: number; // Already optional
}

// Added based on fitbitActions requirements
export interface FitbitTokenData {
  accessToken: string;
  expiresAt: number; // Unix timestamp (seconds since epoch)
  fitbitUserId: string; 
  refreshToken?: string; // Made optional
}

export interface NfcTag {
  id: string; // Unique ID for the tag record in our DB, not necessarily the physical UID
  physicalUid?: string; // Optional: Store the actual hardware UID if needed
  workoutId: string; // Maps to a specific Workout type or template
  nickname?: string; // e.g., 'Pull-up Bar', 'Downstairs Plank Mat'
  assignedAt: string; // ISO 8601 DateTime
}

export interface TutorialStep {
  id: string; // e.g., 'nfc-1'
  title: string;
  markdown: string; // Content including ![alt](url) for images
  mediaId?: string; // Optional link to MediaAsset ID (e.g., for GIF/video)
  order: number;
}

export interface Tutorial {
  id: string; // e.g., 'nfc-tools'
  name: string;
  steps: TutorialStep[];
  estimatedMinutes: number;
}

// Type for Knowledge Base Cards (Spec Section 4.7)
export interface KnowledgeCardData {
  id: string; // Sluggified title or filename
  title: string;
  tags: string[]; // e.g., ['nutrition', 'back-safe', 'climbing']
  markdownContent: string; // Raw markdown content
}

// Define standard activity levels
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

// Additional types for user profile might be needed

// Define notification preference types
export interface NotificationPreferences {
  workoutReminders?: boolean; // e.g., 30 min prior
  inactivityCues?: boolean; // e.g., stand-up prompts
  equipmentCues?: boolean; // e.g., balance board prompts
  syncStatus?: boolean; // e.g., success/failure of offline sync
}

export interface UserProfile {
  id?: string; // Optional: If using a DB later
  email?: string; // From Auth provider
  name?: string; // From Auth provider or user input
  image?: string; // From Auth provider

  // Onboarding Data
  dob?: string; // ISO date (YYYY-MM-DD)
  sex?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY';
  heightCm?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  lactoseSensitive: boolean;
  backIssues: boolean;
  equipment?: string[]; // Reverted to string array to fix lint error

  // Goal Data
  targetBodyFatPct?: number;
  targetDate?: string; // ISO date (YYYY-MM-DD)

  // Calculated & Synced Fitness Data (Stored for convenience/consistency)
  calculatedBMR?: number;
  calculatedTDEE?: number;
  calculatedLBM?: number; // Lean Body Mass
  calorieTarget?: number; // Automatically adjusted target based on TDEE/Sync
  proteinTarget?: number; // Automatically adjusted target based on LBM/Weight
  lastSyncedCaloriesOut?: number; // From Fitbit sync

  // Integration Data
  fitbitUserId?: string;
  fitbitAccessToken?: string; // Should be handled securely server-side if possible
  fitbitExpiresAt?: number; // Timestamp (seconds since epoch) when token expires

  // App State
  completedOnboarding: boolean;
  notificationPrefs?: NotificationPreferences;
  completedTutorials?: string[];
}

// --- Planner Types --- Moved from src/features/planner/types.ts

// Represents a single day in the weekly plan
export interface PlannedDay {
    date: string; // YYYY-MM-DD
    workout: Workout | null; // Workout scheduled for the day, or null for rest/empty
    // Could add flags like 'isRestDay', 'isFlexible' etc. later
}

// Represents the entire weekly plan
export interface WeeklyPlan {
    startDate: string; // YYYY-MM-DD, typically a Monday
    endDate: string; // YYYY-MM-DD, typically a Sunday
    // Use Workout[] directly instead of PlannedDay[] if plan generation outputs Workout[]
    // days: PlannedDay[]; 
    workouts: Workout[]; // Aligning with generateWeeklyPlan output
}

// Placeholder for settings that influence plan generation (Keep in types? Or move to planner feature?)
// Let's keep it here for now if generatePlan uses it directly.
export interface PlannerSettings {
    // Example: User preferences, constraints like 'no climbing on Tuesdays'
    preferredRestDay?: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    backPainFlag?: boolean; // To trigger modifications later
} 