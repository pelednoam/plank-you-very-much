"use client";

import React from 'react';
import { useNutritionStore } from '@/store/nutritionStore';
import type { Meal } from '@/types';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import MealMediaDisplay from '@/features/media/components/MealMediaDisplay';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from 'sonner';

interface MealListProps {
    date: string; // YYYY-MM-DD
}

const MealList: React.FC<MealListProps> = ({ date }) => {
    const meals = useNutritionStore((state) => state.getMealsForDate(date));
    const removeMeal = useNutritionStore((state) => state.removeMeal);
    const isOnline = useOnlineStatus();

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this meal?')) {
            try {
                // Call removeMeal - it handles queuing internally
                removeMeal(id, isOnline);

                // Show toast based on whether it was queued or (assumed) direct
                if (isOnline) {
                    toast.success("Meal Deleted");
                } else {
                    toast.info("Offline: Meal removal queued.");
                }
            } catch (error) {
                console.error("Error removing meal:", error);
                toast.error("Failed to remove meal");
            }
        }
    }

    if (meals.length === 0) {
        return <p className="text-gray-500 italic text-center p-4">No meals logged for {date} yet.</p>;
    }

    return (
        <div className="space-y-3">
            {meals.map((meal) => (
                <div key={meal.id} className="p-3 border rounded shadow bg-white flex justify-between items-start gap-3">
                    <MealMediaDisplay mediaIds={meal.mediaIds} className="w-14 h-14 flex-shrink-0" />

                    <div className="flex-grow">
                         <p className="text-sm text-gray-500">{dayjs(meal.timestamp).format('HH:mm')}</p>
                         <p className="font-medium text-sm">
                             {meal.kcal.toFixed(0)} kcal,
                             P: {meal.proteinG.toFixed(0)}g,
                             C: {meal.carbsG.toFixed(0)}g,
                             F: {meal.fatG.toFixed(0)}g
                             {meal.lactoseFree && <span className="ml-2 text-xs text-green-600">(LF)</span>}
                         </p>
                         {meal.description && <p className="text-xs text-gray-600 mt-1">{meal.description}</p>}
                    </div>
                     <div className="flex-shrink-0">
                         <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleDelete(meal.id)}
                             aria-label="Delete meal"
                             className="text-red-500 hover:text-red-700 p-1 h-auto"
                           >
                           🗑️
                         </Button>
                         {/* TODO: Add Edit button later */}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MealList; 