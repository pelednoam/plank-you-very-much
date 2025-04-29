'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export function SignInButton() {
  // TODO: Add loading state if needed
  return (
    <Button 
      variant="outline" 
      onClick={() => signIn()} // Redirects to NextAuth default sign-in page
      aria-label="Sign In"
    >
       <LogIn className="mr-2 h-4 w-4" /> Sign In
    </Button>
  );
} 