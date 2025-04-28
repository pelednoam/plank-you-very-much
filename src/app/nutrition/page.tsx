import React from 'react';
import MealLogger from '@/features/nutrition/components/MealLogger';

export default function NutritionPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Nutrition Tracker</h1>
      {/* TODO: Add components for macro targets/progress rings */}
      <MealLogger />
      {/* TODO: Add components for displaying logged meals */}
    </div>
  );
} 