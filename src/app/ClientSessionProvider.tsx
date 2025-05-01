'use client';

import { SessionProvider } from 'next-auth/react';
import React, { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export function ClientSessionProvider({ children }: Props) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Don't render SessionProvider on the server or during initial client render
    return <>{children}</>; 
  }

  // Render SessionProvider only after mounting on the client
  return <SessionProvider>{children}</SessionProvider>;
} 