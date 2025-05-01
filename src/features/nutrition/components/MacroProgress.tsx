"use client";

import React from 'react';
import { useMealStore } from '@/store/mealStore';
import { useUserProfileStore, selectUserProfile } from '@/store/userProfileStore';
import { useMetricsStore } from '@/store/metricsStore';
import {
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateProteinTarget
} from '@/lib/calculationUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface MacroProgressProps {
    date: string; // YYYY-MM-DD format
}

// Helper to get progress bar color
const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-blue-500";
};

export function MacroProgress({ date }: MacroProgressProps) {
    // Get data from stores
    const totals = useMealStore((state) => state.getMacrosForDate(date));
    const userProfile = useUserProfileStore(selectUserProfile);
    const latestMetric = useMetricsStore((state) => state.getLatestMetric());

    // Calculate targets (using memoization for efficiency)
    const targets = React.useMemo(() => {
        const bmr = calculateBMR(userProfile ?? {}, latestMetric ?? null);
        const tdee = calculateTDEE(bmr, userProfile?.activityLevel);
        const calorieTarget = calculateCalorieTarget(userProfile, latestMetric ?? null);
        const proteinTarget = calculateProteinTarget(latestMetric ?? null);
        // Placeholder targets for Carbs/Fat (could be derived from remaining calories)
        const remainingCals = (calorieTarget ?? 0) - ((proteinTarget ?? 0) * 4);
        const carbTarget = Math.max(0, Math.round((remainingCals * 0.6) / 4)); // Example: 60% carbs
        const fatTarget = Math.max(0, Math.round((remainingCals * 0.4) / 9)); // Example: 40% fat

        return {
            kcal: calorieTarget,
            proteinG: proteinTarget,
            carbsG: carbTarget,
            fatG: fatTarget,
        };
    }, [userProfile, latestMetric]);

    // Helper to calculate progress percentage
    const getProgress = (consumed: number, target: number | null) => {
        if (target === null || target <= 0) return 0;
        const percentage = (consumed / target) * 100;
        return Math.min(percentage, 100); // Cap at 100%
    };

    const caloriePercentage = getProgress(totals.kcal, targets.kcal);
    const proteinPercentage = getProgress(totals.proteinG, targets.proteinG);
    const carbPercentage = getProgress(totals.carbsG, targets.carbsG);
    const fatPercentage = getProgress(totals.fatG, targets.fatG);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Macronutrient Progress</CardTitle>
                <CardDescription>Daily intake vs targets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Calories */}
                <div>
                    <div className="flex justify-between text-sm font-medium mb-1">
                        <span>Calories</span>
                        <span>{totals.kcal.toFixed(0)} / {(targets.kcal ?? 0).toFixed(0)} kcal</span>
                    </div>
                    <Progress value={caloriePercentage} className="h-2" />
                </div>
                {/* Protein */}
                <div>
                    <div className="flex justify-between text-sm font-medium mb-1">
                        <span>Protein</span>
                        <span>{totals.proteinG.toFixed(1)} / {(targets.proteinG ?? 0).toFixed(1)} g</span>
                    </div>
                    <Progress value={proteinPercentage} className="h-2" />
                </div>
                 {/* Carbs */}
                 <div>
                     <div className="flex justify-between text-sm font-medium mb-1">
                         <span>Carbohydrates</span>
                         <span>{totals.carbsG.toFixed(1)} / {targets.carbsG.toFixed(1)} g</span>
                     </div>
                     <Progress value={carbPercentage} className="h-2" />
                 </div>
                 {/* Fat */}
                 <div>
                     <div className="flex justify-between text-sm font-medium mb-1">
                         <span>Fat</span>
                         <span>{totals.fatG.toFixed(1)} / {targets.fatG.toFixed(1)} g</span>
                     </div>
                     <Progress value={fatPercentage} className="h-2" />
                 </div>
            </CardContent>
        </Card>
    );
}

export default MacroProgress; 