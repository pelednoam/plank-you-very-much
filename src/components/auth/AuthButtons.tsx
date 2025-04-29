'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Loader2, LogIn, LogOut } from 'lucide-react'; // Icons
import Image from 'next/image';

export default function AuthButtons() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      await signIn(provider);
    } catch (error) {
      console.error("OAuth sign-in error:", error);
      // TODO: Add user feedback (toast?)
    } finally {
      // In case of redirect failure or error, stop loading
      setIsLoading(false);
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCredentialsLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false, // Handle redirect manually or stay on page
        email,
        password,
      });

      if (result?.error) {
        console.error("Credentials sign-in error:", result.error);
        // TODO: Add user feedback (toast?)
        alert(`Login failed: ${result.error}`); // Basic feedback for now
      } else if (result?.ok) {
        // Successful login, session state will update
        console.log('Credentials sign-in successful');
        // Optionally redirect here: router.push('/dashboard');
      } else {
         console.warn('Credentials sign-in returned unexpected state:', result);
      }
    } catch (error) {
      console.error("Credentials sign-in exception:", error);
      alert('An unexpected error occurred during login.'); // Basic feedback
    } finally {
      setIsCredentialsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign-out error:", error);
      // TODO: Add user feedback (toast?)
    } finally {
      // In case of error, stop loading
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex items-center space-x-3">
        {session.user?.image && (
           <Image 
                src={session.user.image}
                alt={session.user.name ?? 'User avatar'}
                width={32}
                height={32}
                className="rounded-full"
            />
        )}
        <span className="text-sm font-medium hidden sm:inline">
          {session.user?.name || session.user?.email}
        </span>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut} 
            disabled={isLoading}
        >
          {isLoading ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
             <LogOut className="mr-2 h-4 w-4" />
          )}
          Sign Out
        </Button>
      </div>
    );
  }

  // Not logged in
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
       {/* OAuth Buttons */}
       <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOAuthSignIn('google')} disabled={isLoading}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                 Sign in with Google
             </Button>
             <Button variant="outline" size="sm" onClick={() => handleOAuthSignIn('github')} disabled={isLoading}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                 Sign in with GitHub
             </Button>
        </div>
        
        <div className="text-center text-xs text-muted-foreground sm:hidden">OR</div>

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsSignIn} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex gap-2">
                <div>
                    {/* <Label htmlFor="email-signin" className="sr-only">Email</Label> */}
                    <Input
                        id="email-signin"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-9 text-sm"
                        disabled={isCredentialsLoading}
                    />
                </div>
                <div>
                   {/* <Label htmlFor="password-signin" className="sr-only">Password</Label> */}
                    <Input
                        id="password-signin"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-9 text-sm"
                         disabled={isCredentialsLoading}
                    />
                </div>
            </div>
            <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={isCredentialsLoading || isLoading}>
                 {isCredentialsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In
            </Button>
        </form>
    </div>
  );
} 