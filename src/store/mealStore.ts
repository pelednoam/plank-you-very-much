import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Meal } from '@/types';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import { createIdbStorage } from '@/lib/idbStorage';
import { v4 as uuidv4 } from 'uuid';

dayjs.extend(isToday);

interface MealState {
    meals: Meal[];
    addMeal: (mealData: Omit<Meal, 'id' | 'syncStatus'>) => Meal;
    updateMeal: (id: string, updates: Partial<Meal>) => void;
    deleteMeal: (id: string) => void;
    getMealsByDate: (date: string) => Meal[]; // date as YYYY-MM-DD
    getTodayMeals: () => Meal[];
    getMealById: (id: string) => Meal | undefined;
    getMacrosForDate: (date: string) => { kcal: number; proteinG: number; carbsG: number; fatG: number };
}

export const useMealStore = create(
    persist<MealState>(
        (set, get) => ({
            meals: [],

            addMeal: (mealData) => {
                const newMeal: Meal = {
                    ...mealData,
                    id: uuidv4(),
                    // syncStatus could be set to 'pending' here if needed
                };
                set((state) => ({ 
                    // Add new meal and sort by timestamp descending for typical display
                    meals: [...state.meals, newMeal].sort((a, b) => dayjs(b.timestamp).diff(dayjs(a.timestamp)))
                }));
                console.log('[MealStore] Added:', newMeal);
                return newMeal;
            },

            updateMeal: (id, updates) => {
                set((state) => ({
                    meals: state.meals.map((m) =>
                        m.id === id ? { ...m, ...updates } : m
                    ).sort((a, b) => dayjs(b.timestamp).diff(dayjs(a.timestamp))), // Re-sort after update
                }));
                console.log('[MealStore] Updated meal:', id, updates);
            },

            deleteMeal: (id) => {
                set((state) => ({
                    meals: state.meals.filter((m) => m.id !== id),
                    // No need to re-sort if just filtering
                }));
                console.log('[MealStore] Deleted meal:', id);
            },

            getMealsByDate: (date) => { // Expects YYYY-MM-DD
                return get().meals.filter(m => dayjs(m.timestamp).format('YYYY-MM-DD') === date);
            },

            getTodayMeals: () => {
                const todayStr = dayjs().format('YYYY-MM-DD');
                return get().getMealsByDate(todayStr);
            },
            
            getMealById: (id) => {
                return get().meals.find(m => m.id === id);
            },

            getMacrosForDate: (date) => {
                const mealsForDate = get().getMealsByDate(date);
                return mealsForDate.reduce((acc, meal) => {
                    acc.kcal += meal.kcal || 0;
                    acc.proteinG += meal.proteinG || 0;
                    acc.carbsG += meal.carbsG || 0;
                    acc.fatG += meal.fatG || 0;
                    return acc;
                }, { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
            }
        }),
        {
            name: 'meal-storage',
            storage: createIdbStorage<MealState>(),
            partialize: (state) => ({
                meals: state.meals,
            }) as any, // Only persist the meals array
        }
    )
);

// Example selectors
export const selectTodayMeals = (state: MealState) => state.getTodayMeals();
export const selectMacrosForToday = (state: MealState) => state.getMacrosForDate(dayjs().format('YYYY-MM-DD')); 