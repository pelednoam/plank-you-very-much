'use client';

import { useSession } from 'next-auth/react';
import { SignInButton } from './SignInButton';
import { SignOutButton } from './SignOutButton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    // Display skeleton loaders while session is loading
    return (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-24 rounded-md" /> 
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  if (session) {
    // User is signed in
    return (
      <div className="flex items-center space-x-4">
         {/* Optional: Display user info */}
         <span className="text-sm text-muted-foreground hidden sm:inline">
            {session.user?.name || session.user?.email}
         </span>
         <Avatar className="h-9 w-9 hidden sm:block"> 
            <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? session.user?.email ?? 'User avatar'} />
            <AvatarFallback>
                {session.user?.name?.charAt(0).toUpperCase() || session.user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
         </Avatar>
        <SignOutButton />
      </div>
    );
  }

  // User is signed out
  return <SignInButton />;
} 