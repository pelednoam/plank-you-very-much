"use client";

import React from 'react';
import { useNutritionStore } from '@/store/nutritionStore';
import type { Meal } from '@/types';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/Button'; // For potential delete button

interface MealListProps {
    date: string; // YYYY-MM-DD
}

const MealList: React.FC<MealListProps> = ({ date }) => {
    const meals = useNutritionStore((state) => state.getMealsForDate(date));
    const removeMeal = useNutritionStore((state) => state.removeMeal);

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this meal?')) {
            removeMeal(id);
        }
    }

    if (meals.length === 0) {
        return <p className="text-gray-500 italic text-center p-4">No meals logged for {date} yet.</p>;
    }

    return (
        <div className="space-y-3">
            {meals.map((meal) => (
                <div key={meal.id} className="p-3 border rounded shadow bg-white flex justify-between items-center">
                    <div>
                         <p className="text-sm text-gray-500">{dayjs(meal.timestamp).format('HH:mm')}</p>
                         <p className="font-medium">
                             {meal.kcal.toFixed(0)} kcal,
                             P: {meal.proteinG.toFixed(0)}g,
                             C: {meal.carbsG.toFixed(0)}g,
                             F: {meal.fatG.toFixed(0)}g
                             {meal.lactoseFree && <span className="ml-2 text-xs text-green-600">(LF)</span>}
                         </p>
                         {/* Add description display if needed */}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(meal.id)}
                        aria-label="Delete meal"
                        className="text-red-500 hover:text-red-700"
                       >
                       🗑️
                    </Button>
                     {/* TODO: Add Edit button later */}
                </div>
            ))}
        </div>
    );
};

export default MealList; 