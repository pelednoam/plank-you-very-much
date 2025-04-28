import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">Plank You Very Much</Link>
        <nav>
          {/* TODO: Add User menu / settings link */}
        </nav>
      </div>
    </header>
  );
} 