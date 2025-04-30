"use client";

import React, { useState, useMemo } from 'react';
import { useUserProfileStore, selectUserProfile } from '@/store/userProfileStore';
import { useMetricsStore } from '@/store/metricsStore'; // Import metrics store
import { useNutritionStore } from '@/store/nutritionStore';
import MealLogForm from '@/features/nutrition/components/MealLogForm';
import MealList from '@/features/nutrition/components/MealList';
import MacroProgress from '@/features/nutrition/components/MacroProgress';
import MealGallery from '@/features/media/components/MealGallery'; // Import MealGallery
import { calculateCalorieTarget, calculateProteinTarget } from '@/lib/calculationUtils'; // Import calc functions
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Removed local placeholder components

export default function NutritionPage() {
    const userProfile = useUserProfileStore(selectUserProfile);
    const latestMetrics = useMetricsStore((state) => state.getLatestMetric()); // Get latest metrics
    const { meals, deleteMeal } = useNutritionStore(state => ({ meals: state.meals, deleteMeal: state.deleteMeal }));
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD')); // Default to today

    // Filter meals for the selected date
    const todaysMeals = useMemo(() => {
        return meals.filter(meal => dayjs(meal.timestamp).isSame(selectedDate, 'day'));
    }, [meals, selectedDate]);

    // Calculate totals for the selected date
    const totals = useMemo(() => {
        return todaysMeals.reduce((acc, meal) => {
            acc.kcal += meal.kcal;
            acc.proteinG += meal.proteinG;
            acc.carbsG += meal.carbsG;
            acc.fatG += meal.fatG;
            return acc;
        }, { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    }, [todaysMeals]);

    // Calculate targets using data from both stores
    const calorieTarget = useMemo(() => {
        // Pass profile and metrics (or null if undefined) to calculation
        return calculateCalorieTarget(userProfile, latestMetrics ?? null);
    }, [userProfile, latestMetrics]);

    const proteinTarget = useMemo(() => {
        // Pass metrics (or null if undefined) to calculation
        return calculateProteinTarget(latestMetrics ?? null);
    }, [latestMetrics]);

    // TODO: Calculate Carb/Fat targets based on remaining calories after protein
    // This is a basic example, could be more sophisticated
    const carbTarget = useMemo(() => {
        if (calorieTarget === null || proteinTarget === null) return null;
        const remainingCalories = calorieTarget - (proteinTarget * 4);
        // Example: 50% of remaining calories for carbs
        return Math.round((remainingCalories * 0.5) / 4);
    }, [calorieTarget, proteinTarget]);

    const fatTarget = useMemo(() => {
        if (calorieTarget === null || proteinTarget === null) return null;
        const remainingCalories = calorieTarget - (proteinTarget * 4);
        // Example: 50% of remaining calories for fat
        return Math.round((remainingCalories * 0.5) / 9);
    }, [calorieTarget, proteinTarget]);

    // --- Sample Meal Media IDs for Gallery --- 
    // In a real app, these might be fetched based on user goals, preferences, or recent logs
    const sampleMealMediaIds = ['meal-img-1', 'meal-img-2', 'meal-vid-1']; 
    // --- End Sample Data --- 

    // Delete handler to pass down (checks for isOnline)
    const handleDeleteMeal = (mealId: string) => {
        // Simple check for online status - replace with more robust check if needed
        const isOnline = navigator.onLine; 
        deleteMeal(mealId, isOnline);
    };

    // Handle date change (basic example, could use a date picker)
    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(event.target.value);
    };

    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-2xl font-bold mb-6">Nutrition Tracker</h1>

            {/* Date Selector */}
            <div className="mb-4">
                <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">Select Date:</label>
                <input 
                    type="date" 
                    id="date-select"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="border border-gray-300 rounded p-2"
                />
            </div>

            {/* Progress Component */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Progress ({dayjs(selectedDate).format('MMM D, YYYY')})</CardTitle>
                </CardHeader>
                <CardContent>
                    <MacroProgress date={selectedDate} />
                </CardContent>
            </Card>

            {/* --- Meal Gallery --- */} 
            <MealGallery mealMediaIds={sampleMealMediaIds} />
            {/* --- End Meal Gallery --- */} 

            {/* Log Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Log Meal</CardTitle>
                </CardHeader>
                <CardContent>
                    <MealLogForm />
                </CardContent>
            </Card>

            {/* Log List */}
            <Card>
                <CardHeader>
                    <CardTitle>Logged Meals ({dayjs(selectedDate).format('MMM D, YYYY')})</CardTitle>
                </CardHeader>
                <CardContent>
                    <MealList date={selectedDate} />
                </CardContent>
            </Card>
        </div>
    );
} 