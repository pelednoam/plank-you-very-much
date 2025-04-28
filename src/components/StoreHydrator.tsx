'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function StoreHydrator({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const {
    loadBodyMetrics,
    loadWorkouts,
    loadMeals,
    // loadUserProfile, // TODO: Add when implemented
    setHydrated,
  } = useAppStore();

  useEffect(() => {
    async function hydrateStore() {
      console.log('Hydrating store from IndexedDB...');
      try {
        await Promise.all([
          loadBodyMetrics(),
          loadWorkouts(),
          loadMeals(),
          // loadUserProfile(), // TODO
        ]);
        setHydrated(true); // Mark store as hydrated
        setIsHydrated(true); // Mark local component state as hydrated
        console.log('Store hydration complete.');
      } catch (error) {
        console.error('Store hydration failed:', error);
        // Handle hydration errors appropriately (e.g., show an error message)
      }
    }

    if (!useAppStore.getState().isHydrated) {
        hydrateStore();
    }
    else {
        setIsHydrated(true); // Already hydrated in store, sync local state
    }

  }, [loadBodyMetrics, loadWorkouts, loadMeals, setHydrated]);

  // Optionally, render a loading state until hydration is complete
  // This prevents rendering components with potentially empty/default state
  // if (!isHydrated) {
  //   return <div>Loading application data...</div>;
  // }

  return <>{children}</>;
} 