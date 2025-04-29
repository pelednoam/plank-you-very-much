export { auth as middleware } from "@/../auth" 

// See https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher

// Protect the core application routes. 
// Unauthenticated users attempting to access these routes will be redirected 
// to the NextAuth.js default sign-in page (or a custom one if configured in auth.config.ts).
export const config = {
   matcher: [
       '/', // Protect the root Dashboard
       '/planner/:path*', // Protect planner and any sub-routes
       '/nutrition/:path*', // Protect nutrition and any sub-routes
       '/knowledge/:path*', // Protect knowledge base and any sub-routes
       '/settings/:path*', // Protect settings and any sub-routes
        // Add other routes to protect here if needed.
        // Routes NOT listed here (like /onboard, /api/*) remain public.
    ],
}; 