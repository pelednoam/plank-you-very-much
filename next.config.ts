import type { NextConfig } from "next";
// import withPWAInit from "@ducanh2912/next-pwa"; // Remove old import
import withSerwistInit from "@serwist/next"; // Import Serwist initializer

// Initialize Serwist
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.js", // Path to your service worker file (now JS)
  swDest: "public/sw.js", // Output path for the service worker
  // Optional: Other Serwist configurations can go here
  // See: https://serwist.pages.dev/docs/next/configuring
  // Example: disable PWA in development
  // disable: process.env.NODE_ENV === 'development', 
});

// // Old PWA config (keep for reference if needed)
// const withPWA = withPWAInit({
//   dest: "public", 
//   // swSrc: "src/service-worker.ts", 
//   // disable: process.env.NODE_ENV === 'development', 
//   // register: true, 
//   // scope: '/app', 
//   // sw: 'service-worker.js', 
//   // cacheOnFrontEndNav: true, 
//   // reloadOnOnline: true, 
// });

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true, // Example existing option
};

// Wrap the config with the Serwist plugin
export default withSerwist(nextConfig);
