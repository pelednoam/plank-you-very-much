"use client";

import React from 'react';
import { useMealStore } from '@/store/mealStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useMetricsStore } from '@/store/metricsStore';
import {
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateProteinTarget
} from '@/lib/calculationUtils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface MacroProgressProps {
    date: string; // YYYY-MM-DD format
}

const MacroProgress: React.FC<MacroProgressProps> = ({ date }) => {
    // Get data from stores
    const macrosConsumed = useMealStore((state) => state.getMacrosForDate(date));
    const userProfile = useUserProfileStore((state) => state.profile);
    const latestMetric = useMetricsStore((state) => state.getLatestMetric());

    // Calculate targets (using memoization for efficiency)
    const targets = React.useMemo(() => {
        const bmr = calculateBMR(userProfile ?? {}, latestMetric ?? null);
        const tdee = calculateTDEE(bmr, userProfile?.activityLevel);
        const calorieTarget = calculateCalorieTarget(tdee, userProfile?.targetBodyFatPct, userProfile?.targetDate);
        const proteinTarget = calculateProteinTarget(latestMetric ?? null, userProfile?.targetBodyFatPct);
        // Placeholder targets for Carbs/Fat (could be derived from remaining calories)
        const remainingCals = calorieTarget - (proteinTarget * 4);
        const carbTarget = (remainingCals * 0.6) / 4; // Example: 60% carbs
        const fatTarget = (remainingCals * 0.4) / 9;  // Example: 40% fat

        return {
            kcal: calorieTarget,
            proteinG: proteinTarget,
            carbsG: carbTarget > 0 ? carbTarget : 200, // Basic default if calculation fails
            fatG: fatTarget > 0 ? fatTarget : 70,    // Basic default if calculation fails
        };
    }, [userProfile, latestMetric]);

    // Helper to calculate progress percentage
    const getProgress = (consumed: number, target: number) => {
        if (!target || target <= 0) return 0;
        const percentage = (consumed / target) * 100;
        return Math.min(percentage, 100); // Cap at 100%
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Macronutrient Progress</CardTitle>
                {/* Optionally show the date here if not obvious from context */} 
                {/* <p className="text-sm text-muted-foreground">{dayjs(date).format('ll')}</p> */}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Calories */}
                <div>
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="font-medium">Calories</span>
                        <span className="text-sm text-muted-foreground">
                            {macrosConsumed.kcal.toFixed(0)} / {targets.kcal.toFixed(0)} kcal
                        </span>
                    </div>
                    <Progress value={getProgress(macrosConsumed.kcal, targets.kcal)} className="h-2" />
                </div>
                {/* Protein */}
                <div>
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="font-medium">Protein</span>
                        <span className="text-sm text-muted-foreground">
                            {macrosConsumed.proteinG.toFixed(0)} / {targets.proteinG.toFixed(0)} g
                        </span>
                    </div>
                    <Progress value={getProgress(macrosConsumed.proteinG, targets.proteinG)} className="h-2" />
                </div>
                {/* Carbs */}
                <div>
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="font-medium">Carbs</span>
                        <span className="text-sm text-muted-foreground">
                            {macrosConsumed.carbsG.toFixed(0)} / {targets.carbsG.toFixed(0)} g
                        </span>
                    </div>
                    <Progress value={getProgress(macrosConsumed.carbsG, targets.carbsG)} className="h-2" />
                </div>
                {/* Fat */}
                <div>
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="font-medium">Fat</span>
                        <span className="text-sm text-muted-foreground">
                            {macrosConsumed.fatG.toFixed(0)} / {targets.fatG.toFixed(0)} g
                        </span>
                    </div>
                    <Progress value={getProgress(macrosConsumed.fatG, targets.fatG)} className="h-2" />
                </div>
            </CardContent>
        </Card>
    );
};

export default MacroProgress; 