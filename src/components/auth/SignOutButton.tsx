'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  // TODO: Add loading state if needed
  return (
    <Button 
      variant="outline" 
      onClick={() => signOut({ callbackUrl: '/' })} // Sign out and redirect to home
      aria-label="Sign Out"
    >
        <LogOut className="mr-2 h-4 w-4" /> Sign Out
    </Button>
  );
} 