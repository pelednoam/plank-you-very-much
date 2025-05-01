import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import the Image component
import { PwaInstallButton } from '@/components/PwaInstallButton'; // Import the install button
import { Menu, Mountain } from 'lucide-react'; // Assuming icons are used
import { Button } from '@/components/ui/button'; // Assuming Button is used
// import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'; // Removed unused import
import { AuthButtons } from '../auth/AuthButtons'; // Corrected: Use named import

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
        <Mountain className="h-6 w-6" />
        <span className="sr-only">Plank You Very Much</span>
      </Link>
      
      {/* Desktop Navigation (Optional - can be added here) */}
      {/* <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">Dashboard</Link>
        <Link href="/planner" className="text-muted-foreground transition-colors hover:text-foreground">Planner</Link>
        ...
      </nav> */}

      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {/* Auth Buttons */}
        <AuthButtons />

        {/* Mobile Nav Trigger (Optional) */}
        {/* <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium">
              <Link href="#" className="flex items-center gap-2 text-lg font-semibold">
                <Mountain className="h-6 w-6" />
                <span className="sr-only">Plank You</span>
              </Link>
              <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
              ...
            </nav>
          </SheetContent>
        </Sheet> */}
      </div>
    </header>
  );
};

export default Header; 