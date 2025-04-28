"use client";

import React from 'react';
import { useNutritionStore } from '@/store/nutritionStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useMetricsStore } from '@/store/metricsStore';
import {
    calculateCalorieTarget,
    calculateProteinTarget,
    calculateTDEE,
    calculateBMR
} from '@/lib/calculationUtils';

interface MacroProgressProps {
    date: string; // YYYY-MM-DD
}

// Simple progress bar component
const ProgressBar: React.FC<{ value: number; max: number; label: string; unit: string }> = ({ value, max, label, unit }) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const displayMax = max > 0 ? max.toFixed(0) : 'N/A';
    const displayValue = value.toFixed(0);

    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-sm font-medium text-gray-500">{displayValue} / {displayMax} {unit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

const MacroProgress: React.FC<MacroProgressProps> = ({ date }) => {
    const dailyTotals = useNutritionStore((state) => state.getDailyTotals(date));
    const userProfile = useUserProfileStore((state) => state.profile);
    const latestMetric = useMetricsStore((state) => state.getLatestMetric());

    // Calculate targets
    const bmr = React.useMemo(() => calculateBMR(userProfile || {}, latestMetric ?? null), [userProfile, latestMetric]);
    // Pass activityLevel to calculateTDEE
    const tdee = React.useMemo(() => calculateTDEE(bmr, userProfile?.activityLevel), [bmr, userProfile?.activityLevel]);
    const calorieTarget = React.useMemo(() => calculateCalorieTarget(tdee), [tdee]);
    const proteinTarget = React.useMemo(() => calculateProteinTarget(latestMetric ?? null), [latestMetric]);

    // TODO: Add Carb/Fat targets if needed, currently just using TDEE for calories

    return (
        <div className="p-4 border rounded shadow bg-white space-y-4">
            <ProgressBar
                label="Calories"
                value={dailyTotals.kcal}
                max={calorieTarget ?? tdee ?? 2000} // Use target, fallback to TDEE or default
                unit="kcal"
            />
            <ProgressBar
                label="Protein"
                value={dailyTotals.proteinG}
                max={proteinTarget ?? 100} // Fallback to default
                unit="g"
            />
             {/* Optionally add Carb/Fat progress bars */}
             {/* <ProgressBar label="Carbs" value={dailyTotals.carbsG} max={...} unit="g" /> */}
             {/* <ProgressBar label="Fat" value={dailyTotals.fatG} max={...} unit="g" /> */}
        </div>
    );
};

export default MacroProgress; 