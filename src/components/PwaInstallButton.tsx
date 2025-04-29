"use client";

import React from 'react';
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export function PwaInstallButton() {
  const { canInstall, triggerInstallPrompt } = usePwaInstallPrompt();

  const handleInstallClick = () => {
    triggerInstallPrompt();
    // Optionally, you could add more logic here based on the userChoice promise 
    // that triggerInstallPrompt could return if modified, but the hook handles logging it.
    toast.info("Follow browser instructions to install the app.");
  };

  if (!canInstall) {
    return null; // Don't render anything if PWA install is not available
  }

  return (
    <Button 
      onClick={handleInstallClick} 
      variant="outline"
      size="sm"
      title="Install Plank You Very Much App"
    >
      <Download className="mr-2 h-4 w-4" />
      Install App
    </Button>
  );
} 