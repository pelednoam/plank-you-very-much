'use client'; // Needed because OnboardingForm is a client component

import React from 'react';
import OnboardingForm from '@/features/onboarding/components/OnboardingForm';
import { useUserProfileStore, selectIsOnboardingComplete } from '@/store/userProfileStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const isOnboardingComplete = useUserProfileStore(selectIsOnboardingComplete);
  const router = useRouter();

  // Redirect if onboarding is already complete
  useEffect(() => {
    if (isOnboardingComplete) {
      console.log('Onboarding already complete, redirecting to dashboard.');
      router.replace('/'); // Use replace to avoid adding onboarding to history
    }
  }, [isOnboardingComplete, router]);

  // Prevent rendering the form while checking status or if complete
  if (isOnboardingComplete === null || isOnboardingComplete === true) {
     // Render loading state or null while checking/redirecting
     // Or potentially show a message "Redirecting..."
     return <div>Loading...</div>; // Or return null
  }

  return (
    <div>
      <OnboardingForm />
    </div>
  );
} 