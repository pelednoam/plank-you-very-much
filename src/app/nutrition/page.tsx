"use client";

import React from 'react';
import MealLogForm from '@/features/nutrition/components/MealLogForm';
import MacroProgress from '@/features/nutrition/components/MacroProgress';
import MealList from '@/features/nutrition/components/MealList';
import dayjs from 'dayjs';

// Removed local placeholder components

export default function NutritionPage() {
    const today = dayjs().format('YYYY-MM-DD'); // Default to today

    return (
        <div className="space-y-6 container mx-auto p-4">
            <h1 className="text-2xl font-semibold">Nutrition Tracker</h1>

            {/* Section for displaying daily macro progress vs targets */}
            <section aria-labelledby="macro-progress-title">
                <h2 id="macro-progress-title" className="text-xl font-semibold mb-2 sr-only">Today's Progress</h2>
                <MacroProgress date={today} />
            </section>

            {/* Section for logging a new meal */}
            <section aria-labelledby="meal-log-title">
                <h2 id="meal-log-title" className="text-xl font-semibold mb-2">Log Meal</h2>
                <MealLogForm />
            </section>

            {/* Section for displaying meals logged today */}
             <section aria-labelledby="meal-list-title">
                <h2 id="meal-list-title" className="text-xl font-semibold mb-2">Today's Meals</h2>
                {/* TODO: Add date picker to view other days */}
                <MealList date={today} />
            </section>

            {/* Placeholder for Meal Gallery */}
             {/* <section aria-labelledby="meal-gallery-title">
                <h2 id="meal-gallery-title" className="text-xl font-semibold mb-2">Meal Ideas</h2>
                 <MealGallery /> 
             </section> */}
        </div>
    );
} 