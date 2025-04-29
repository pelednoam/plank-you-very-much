'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function Providers({ children }: Props) {
  // You can add other global providers here if needed
  return <SessionProvider>{children}</SessionProvider>;
} 