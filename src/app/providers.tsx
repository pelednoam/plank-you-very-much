'use client';

// import { SessionProvider } from 'next-auth/react'; // No longer used directly
import { ClientSessionProvider } from './ClientSessionProvider'; // Import the wrapper
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function Providers({ children }: Props) {
  // You can add other global providers here if needed
  return <ClientSessionProvider>{children}</ClientSessionProvider>; // Use the wrapper
} 