"use client";

import React, { useMemo } from 'react';
import { useMealStore } from '@/store/mealStore';
import type { Meal } from '@/types';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil } from 'lucide-react'; // Icons for actions
import { toast } from 'sonner';

interface MealListProps {
    date: string; // Expect date in YYYY-MM-DD format
}

const MealList: React.FC<MealListProps> = ({ date }) => {
    // Get the raw function to avoid re-renders when the list itself changes
    const getMealsByDate = useMealStore((state) => state.getMealsByDate);
    const deleteMeal = useMealStore((state) => state.deleteMeal);
    // Memoize the meals for the selected date
    const meals = useMemo(() => getMealsByDate(date), [getMealsByDate, date]);

    const handleDelete = (id: string) => {
        // Optional: Add confirmation dialog
        // if (confirm('Are you sure you want to delete this meal?')) {
            deleteMeal(id);
            toast.success('Meal deleted');
        // }
    };

    const handleEdit = (id: string) => {
        // TODO: Implement opening an edit form/modal
        console.log(`Edit meal ${id}`);
        toast.info('Edit functionality not implemented yet.');
    };

    return (
        <div className="mt-4">
            {meals.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No meals logged for {dayjs(date).format('ll')}.</p>
            ) : (
                <ul className="space-y-3">
                    {meals.map(meal => (
                        <li key={meal.id} className="flex items-center justify-between p-3 bg-white rounded-md border shadow-sm">
                            <div className="flex-1 mr-2">
                                <span className="font-medium">{meal.description || 'Meal'}</span>
                                <span className="text-sm text-muted-foreground block">{meal.kcal} kcal</span>
                                <span className="text-xs text-muted-foreground">
                                    P:{meal.proteinG}g C:{meal.carbsG}g F:{meal.fatG}g
                                    {meal.lactoseFree && <span className="text-xs font-medium text-blue-500 ml-2">(LF)</span>}
                                </span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(meal.id)} title="Edit Meal">
                                    <Pencil className="h-4 w-4 text-blue-600" />
                                    <span className="sr-only">Edit</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(meal.id)} title="Delete Meal">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MealList; 