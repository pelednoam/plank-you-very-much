// src/types/global.d.ts

// Define the interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ 
    outcome: 'accepted' | 'dismissed'; 
    platform: string 
  }>;
  prompt(): Promise<void>;
}

// Augment the global WindowEventMap interface
declare global {
  interface WindowEventMap {
    'beforeinstallprompt': BeforeInstallPromptEvent;
  }
}

// Export {} to ensure this file is treated as a module (if needed, usually not for .d.ts)
export {}; 