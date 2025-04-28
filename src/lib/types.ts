export interface BodyMetrics {
  date: string; // ISO
  weightKg: number;
  bodyFatPct: number;
  muscleMassKg: number;
  visceralRating: number;
}

export interface Workout {
  id: string;
  type: 'CLIMB' | 'SWIM' | 'CORE' | 'STRENGTH' | 'REST';
  plannedAt: string;
  durationMin: number;
  completed?: boolean;
  mediaIds?: string[]; // attach demo videos
}

export interface Meal {
  id: string;
  timestamp: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  lactoseFree: boolean;
  mediaIds?: string[]; // link to image/video recipe
}

export interface MediaAsset {
  id: string;
  type: 'IMAGE' | 'GIF' | 'VIDEO';
  url: string;
  thumbnail?: string;
  description?: string;
  tags: string[];
}

export interface FitbitDaily {
  date: string; // yyyy-MM-dd
  steps: number;
  restingHeartRate?: number;
  caloriesOut: number;
  sleepMinutes?: number;
} 