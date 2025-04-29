"use client"; // Required for hooks

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreHydrator } from "@/components/StoreHydrator";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner"
import React, { useState, useEffect } from 'react'; // Import hooks
import { Button } from '@/components/ui/button'; // Import Button
import { Download } from 'lucide-react'; // Import icon
import { OfflineQueueProcessor } from '@/components/OfflineQueueProcessor'; // Import the processor

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Simplified interface - ensure it aligns with actual event properties
// NOTE: This interface is now defined globally in src/types/global.d.ts
// interface BeforeInstallPromptEvent extends Event {
//   readonly platforms: ReadonlyArray<string>;
//   readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
//   prompt(): Promise<void>;
// }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Explicitly type the event in the listener using the globally defined type
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault(); 
      console.log(''beforeinstallprompt' event fired', event);
      setInstallPromptEvent(event); 
      setShowInstallButton(true);
    };

    // Add listener - Use the event name directly, suppress TS error
    // @ts-ignore Error persists despite global type definitions
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Cleanup listener 
    return () => {
      // @ts-ignore Error persists despite global type definitions
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      console.log('Install prompt event not available.');
      return;
    }

    try {
        console.log('Showing install prompt...');
        await installPromptEvent.prompt(); // Show the browser's install prompt
        const { outcome } = await installPromptEvent.userChoice;
        console.log(`User choice: ${outcome}`);
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
    } catch (error) {
         console.error('Error showing install prompt:', error);
    } finally {
         // Clear the event and hide the button regardless of outcome
         setInstallPromptEvent(null);
         setShowInstallButton(false);
    }
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
         {/* Metadata needs to be handled differently in Client Components if needed,
             or keep layout as Server Component and move client logic to a child component */}
             <title>Plank You Very Much</title>
             <meta name="description" content="AI Personal Trainer for Shay" />
             {/* Include manifest link if not handled by next-pwa/serwist automatically */}
             {/* <link rel="manifest" href="/manifest.json" /> */}
      </head>
      <body className="antialiased">
         <OfflineQueueProcessor /> { /* Render the processor */ }
        <div className="flex min-h-screen">
          <Sidebar />

          <div className="flex-1 flex flex-col">
            <Header />

            <main className="flex-1 p-4">
              {/* Install Button - Render conditionally */}
              {showInstallButton && (
                <div className="fixed bottom-4 right-4 z-50 animate-bounce">
                  <Button onClick={handleInstallClick}>
                    <Download className="mr-2 h-4 w-4" />
                    Install App
                  </Button>
                </div>
              )}
              <StoreHydrator>{children}</StoreHydrator>
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
