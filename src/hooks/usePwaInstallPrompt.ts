"use client";

import { useState, useEffect } from 'react';

// Define the interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface UsePwaInstallPromptResult {
  installPromptEvent: BeforeInstallPromptEvent | null;
  triggerInstallPrompt: () => void;
  canInstall: boolean; // Helper boolean
}

/**
 * Hook to manage the PWA installation prompt.
 */
export function usePwaInstallPrompt(): UsePwaInstallPromptResult {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      console.log('beforeinstallprompt event fired');
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    console.log('Added beforeinstallprompt listener');

    // Optional: Listener for when the app is installed
    const handleAppInstalled = () => {
        console.log('PWA installed successfully!');
        // Clear the deferred prompt
        setInstallPromptEvent(null);
        // You might want to track this state globally or hide the install button
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    console.log('Added appinstalled listener');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      console.log('Removed PWA install listeners');
    };
  }, []);

  const triggerInstallPrompt = async () => {
    if (!installPromptEvent) {
      console.warn('Install prompt event not available.');
      return;
    }

    // Show the install prompt
    installPromptEvent.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, it can't be used again (important!) Clear it.
    setInstallPromptEvent(null);
  };

  return { 
    installPromptEvent,
    triggerInstallPrompt,
    canInstall: !!installPromptEvent, // True if the event has been captured
  };
} 