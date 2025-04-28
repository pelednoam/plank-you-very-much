import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa"; // Import the PWA plugin initializer

// Initialize the PWA plugin
const withPWA = withPWAInit({
  dest: "public", // Destination directory for service worker files
  // disable: process.env.NODE_ENV === 'development', // Optional: Disable PWA in development
  // register: true, // Optional: Auto register service worker
  // scope: '/app', // Optional: Define service worker scope
  // sw: 'service-worker.js', // Optional: Service worker file name
  // cacheOnFrontEndNav: true, // Optional: Cache pages navigated to client-side
  // reloadOnOnline: true, // Optional: Reload app when back online
});

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true, // Example existing option
};

// Wrap the config with the PWA plugin
export default withPWA(nextConfig);
