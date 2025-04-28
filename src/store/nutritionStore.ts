import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Meal } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage';
import dayjs from 'dayjs';

interface NutritionState {
  meals: Meal[];
  addMeal: (mealData: Omit<Meal, 'id' | 'timestamp'>) => Meal;
  updateMeal: (id: string, updates: Partial<Omit<Meal, 'id'>>) => void;
  removeMeal: (id: string) => void;
  getMealsForDate: (date: string) => Meal[]; // date in ISO YYYY-MM-DD format
  getDailyTotals: (date: string) => { kcal: number; proteinG: number; carbsG: number; fatG: number };
}

export const useNutritionStore = create(
  persist<NutritionState>(
    (set, get) => ({
      meals: [],

      addMeal: (mealData) => {
        const newMeal: Meal = {
          ...mealData,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({ meals: [...state.meals, newMeal] }));
        return newMeal;
      },

      updateMeal: (id, updates) => {
        set((state) => ({
          meals: state.meals.map(m => m.id === id ? { ...m, ...updates } : m)
        }));
      },

      removeMeal: (id) => {
        set((state) => ({ meals: state.meals.filter(m => m.id !== id) }));
      },

      getMealsForDate: (date) => {
        return get().meals.filter(m => m.timestamp.startsWith(date))
                           .sort((a, b) => dayjs(a.timestamp).diff(dayjs(b.timestamp))); // Sort by time
      },

      getDailyTotals: (date) => {
        const todaysMeals = get().getMealsForDate(date);
        return todaysMeals.reduce((totals, meal) => ({
          kcal: totals.kcal + meal.kcal,
          proteinG: totals.proteinG + meal.proteinG,
          carbsG: totals.carbsG + meal.carbsG,
          fatG: totals.fatG + meal.fatG,
        }), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
      },
    }),
    {
      name: 'nutrition-storage',
      storage: createIdbStorage<NutritionState>(),
    }
  )
);

// Selectors
export const selectAllMeals = (state: NutritionState) => state.meals; 