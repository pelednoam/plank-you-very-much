import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import the Image component
import { PwaInstallButton } from '@/components/PwaInstallButton'; // Import the install button

export default function Header() {
  return (
    <header className="bg-gray-800 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 text-xl font-bold hover:text-gray-300 transition-colors">
          {/* Add the logo image */}
          <Image
            src="/logo.png" // Path relative to the public directory
            alt="Plank You Very Much Logo"
            width={40} // Specify width
            height={40} // Specify height
            className="rounded-sm" // Optional styling
          />
          <span>Plank You Very Much</span>
        </Link>
        <nav className="flex items-center space-x-4">
          {/* PWA Install Button */}
          <PwaInstallButton /> 
          {/* TODO: Add User menu / settings link */}
        </nav>
      </div>
    </header>
  );
} 