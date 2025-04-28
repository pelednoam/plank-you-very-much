// Data models based on Section 7 of the Technical Specification

export interface BodyMetrics {
  date: string; // ISO 8601 format (e.g., "2025-04-28T10:00:00Z")
  weightKg: number;
  bodyFatPct: number;
  muscleMassKg?: number; // Optional based on scale capabilities
  visceralRating?: number; // Optional based on scale capabilities
}

export type WorkoutType = 'CLIMB' | 'SWIM' | 'CORE' | 'STRENGTH' | 'REST' | 'MOBILITY';

export interface Workout {
  id: string; // Consider using UUID
  type: WorkoutType;
  plannedAt: string; // ISO 8601 DateTime
  durationMin: number;
  completedAt?: string; // ISO 8601 DateTime, indicates completion
  mediaIds?: string[]; // Links to MediaAsset IDs
  notes?: string;
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
  steps: number;
  restingHeartRate?: number;
  caloriesOut: number;
  sleepMinutes?: number;
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

// Additional types for user profile might be needed
export interface UserProfile {
  name: string;
  dob?: string; // Date of birth for BMR calculation
  sex?: 'male' | 'female'; // Added for BMR calculation
  heightCm?: number;
  // Goals
  targetBodyFatPct?: number;
  targetDate?: string;
  // Preferences/Flags
  lactoseSensitive: boolean;
  backIssues?: boolean;
  equipment?: string[]; // e.g., ['pullup-bar', 'balance-board']
  completedOnboarding: boolean;
  fitbitUserId?: string; // Store Fitbit user ID after connection
} 