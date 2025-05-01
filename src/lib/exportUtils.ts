import { usePlannerStore } from '@/store/plannerStore';
import { useNutritionStore } from '@/store/nutritionStore';
import { useMetricsStore } from '@/store/metricsStore';
import dayjs from 'dayjs';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { Workout, BodyMetrics, UserProfile } from '@/types';

/**
 * Triggers a browser download for the given data as a JSON file.
 * @param data - The data object to export.
 * @param filename - The desired filename for the download (e.g., 'workouts.json').
 */
function downloadJson(data: unknown, filename: string): void {
    try {
        const jsonString = JSON.stringify(data, null, 2); // Pretty print JSON
        const blob = new Blob([jsonString], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    } catch (error) {
        console.error("Failed to create download:", error);
        alert("Error creating download file."); // Basic user feedback
    }
}

/**
 * Fetches all workout data and initiates a download.
 */
export function exportWorkoutData(): void {
    const plans = usePlannerStore.getState().plans;
    const allWorkouts: Workout[] = Object.values(plans).flatMap(plan => plan.workouts);

    const filename = `plankyou_workouts_${dayjs().format('YYYYMMDD')}.json`;
    downloadJson(allWorkouts, filename);
}

/**
 * Fetches all nutrition data (meals) and initiates a download.
 */
export function exportNutritionData(): void {
    const meals = useNutritionStore.getState().meals;
     const filename = `plankyou_nutrition_${dayjs().format('YYYYMMDD')}.json`;
    downloadJson(meals, filename);
}

/**
 * Fetches all body metrics data and initiates a download.
 */
export function exportMetricsData(): void {
    const metrics = useMetricsStore.getState().metrics;
    const filename = `plankyou_metrics_${dayjs().format('YYYYMMDD')}.json`;
    downloadJson(metrics, filename);
} 