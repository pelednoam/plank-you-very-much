"use client";

import { useState, useEffect } from 'react';

/**
 * Custom hook to track online/offline status.
 * @returns {boolean} Current online status.
 */
export function useOnlineStatus(): boolean {
  // Get initial status from navigator.onLine (might not be fully reliable)
  const [isOnline, setIsOnline] = useState<boolean>(() => {
      if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
          return navigator.onLine;
      } 
      // Default to true if navigator.onLine is not available (SSR or old browser)
      return true; 
  });

  useEffect(() => {
    // Handler for online event
    const handleOnline = () => {
      console.log('Network status: Online');
      setIsOnline(true);
    };

    // Handler for offline event
    const handleOffline = () => {
      console.log('Network status: Offline');
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup function to remove listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  return isOnline;
} 