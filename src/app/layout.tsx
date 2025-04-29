"use client"; // Required for hooks

import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using standard Next.js font import
import './globals.css';
import { cn } from "@/lib/utils";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer'; // Assuming this path is correct now
import { Toaster } from "@/components/ui/sonner";
import { Providers } from './providers';
import Sidebar from '@/components/layout/Sidebar'; // Assuming Sidebar exists
import { OfflineQueueProcessor } from '@/components/OfflineQueueProcessor';
import { initializeSyncManager } from '@/lib/offlineSyncManager';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' }); // Added variable for Tailwind

export const metadata: Metadata = {
  title: 'Plank You Very Much',
  description: 'AI-Assisted Personal Trainer - Climb higher, dive stronger, live leaner.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize the offline sync manager
  if (typeof window !== 'undefined') {
     initializeSyncManager();
  }

  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning> {/* Use font variable */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* <link rel="manifest" href="/manifest.json" /> */}
      </head>
      <body className="antialiased">
         <Providers>
          <OfflineQueueProcessor />
          <div className="relative flex min-h-screen flex-col bg-background">
            <Sidebar />
             <Header />
            <main className="flex-1 flex flex-col p-4 md:p-8">
               {children}
             </main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
