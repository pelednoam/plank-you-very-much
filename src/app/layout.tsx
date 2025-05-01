import type { Metadata } from 'next';
// import { Inter } from 'next/font/google'; // Keep commented out
import './globals.css';
// import { cn } from "@/lib/utils"; // Still not needed directly here
// import Header from '@/components/layout/Header';
// import Footer from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/sonner";
import { Providers } from './providers'; // Uncomment
// import Sidebar from '@/components/layout/Sidebar';
// import { OfflineQueueProcessor } from '@/components/OfflineQueueProcessor';
// import { initializeSyncManager } from '@/lib/offlineSyncManager';

// const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Plank You Very Much',
  description: 'AI-Assisted Personal Trainer - Climb higher, dive stronger, live leaner.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Keep commented out
  // if (typeof window !== 'undefined') {
  //    initializeSyncManager();
  // }

  return (
    // Keep font commented out
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* <link rel="manifest" href="/manifest.json" /> */}
      </head>
      <body className="antialiased">
         <Providers> { /* Uncomment */}
          {/* <OfflineQueueProcessor /> */}
          <div className="relative flex min-h-screen flex-col bg-background">
            {/* <Sidebar /> */}
             {/* <Header /> */}
            <main className="flex-1 flex flex-col p-4 md:p-8">
               {children}
             </main>
            {/* <Footer /> */}
          </div>
          <Toaster />
        </Providers> { /* Uncomment */}
      </body>
    </html>
  );
}
