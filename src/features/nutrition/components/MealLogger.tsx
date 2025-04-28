// Placeholder component for logging meals

'use client';

import React from 'react';

// TODO: Implement actual form using React Hook Form, Zod
// TODO: Connect to nutritionStore
// TODO: Add fields for kcal, protein, carbs, fat, lactoseFree flag

export default function MealLogger() {
  return (
    <div className="bg-white p-4 shadow rounded mt-4">
      <h2 className="text-xl font-semibold mb-3">Log Meal</h2>
      <form className="space-y-3">
        <div>
          <label htmlFor="mealDesc" className="block text-sm font-medium text-gray-700">Description (optional)</label>
          <input type="text" id="mealDesc" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="e.g., Lunch - Chicken Salad" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label htmlFor="kcal" className="block text-sm font-medium text-gray-700">Calories (kcal)</label>
            <input type="number" id="kcal" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="350" />
          </div>
          <div>
            <label htmlFor="protein" className="block text-sm font-medium text-gray-700">Protein (g)</label>
            <input type="number" id="protein" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="30" />
          </div>
          <div>
            <label htmlFor="carbs" className="block text-sm font-medium text-gray-700">Carbs (g)</label>
            <input type="number" id="carbs" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="20" />
          </div>
          <div>
            <label htmlFor="fat" className="block text-sm font-medium text-gray-700">Fat (g)</label>
            <input type="number" id="fat" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="15" />
          </div>
        </div>
         <div className="flex items-center pt-2">
            <input id="lactoseFree" name="lactoseFree" type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <label htmlFor="lactoseFree" className="ml-2 block text-sm text-gray-900">Lactose Free</label>
        </div>
        <div className="text-right">
          <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Log Meal
          </button>
        </div>
      </form>
      {/* TODO: Add reminder for lactose sensitivity based on user profile */}
    </div>
  );
} 