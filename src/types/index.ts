// Data models based on Section 7 of the Technical Specification

export interface BodyMetrics {
  date: string; // ISO 8601 format (e.g., "2025-04-28T10:00:00Z")
  weightKg: number;
  bodyFatPct?: number; // Optional based on scale/source capabilities
  muscleMassKg?: number; // Optional based on scale capabilities
  visceralRating?: number; // Optional based on scale capabilities
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
  rating?: number; // e.g., RPE (1-10) or satisfaction (1-5)
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
  steps: number;
  restingHeartRate?: number;
  caloriesOut: number;
  sleepMinutes?: number;
}

// Added based on fitbitActions requirements
export interface FitbitTokenData {
  accessToken: string;
  refreshToken: string;
  fitbitUserId: string; // ID of the user on Fitbit's platform
  expiresAt: number;    // Timestamp (seconds since epoch) when the access token expires
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
  id?: string; // Add optional user ID
  name: string;
  dob?: string; // Date of birth for BMR calculation
  sex?: 'male' | 'female' | 'prefer_not_say'; // Added 'prefer_not_say'
  heightCm?: number;
  activityLevel?: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
  // Goals
  targetBodyFatPct?: number;
  targetDate?: string;
  // Preferences/Flags
  lactoseSensitive: boolean;
  backIssues?: boolean;
  equipment?: string[]; // e.g., ['pullup-bar', 'balance-board']
  completedTutorials?: string[]; // Track completed tutorial IDs
  notificationPrefs?: NotificationPreferences;
  completedOnboarding: boolean;
  fitbitUserId?: string; // Store Fitbit user ID after connection
} 