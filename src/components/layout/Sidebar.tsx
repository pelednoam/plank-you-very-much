'use client'; // Needed for hooks

import React from 'react';
import Link from 'next/link';
import { useUserProfileStore, selectIsOnboardingComplete } from '@/store/userProfileStore'; // Import store and selector

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/planner', label: 'Planner' },
  { href: '/nutrition', label: 'Nutrition' },
  { href: '/knowledge', label: 'Knowledge' },
  { href: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  const isOnboardingComplete = useUserProfileStore(selectIsOnboardingComplete);

  return (
    <aside className="w-64 bg-gray-100 p-4 h-screen sticky top-0">
      <nav>
        <ul>
          {/* Conditionally render Onboarding link */} 
          {!isOnboardingComplete && (
             <li key="/onboard" className="mb-2 font-semibold text-purple-700">
               <Link href="/onboard" className="hover:underline">
                 Start Here: Onboarding
               </Link>
             </li>
           )}

          {navItems.map((item) => (
            <li key={item.href} className="mb-2">
              <Link href={item.href} className="text-blue-600 hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
} 