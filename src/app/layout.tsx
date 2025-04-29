import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreHydrator } from "@/components/StoreHydrator";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plank You Very Much",
  description: "AI Personal Trainer for Shay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />

          <div className="flex-1 flex flex-col">
            <Header />

            <main className="flex-1 p-4">
              <StoreHydrator>{children}</StoreHydrator>
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
