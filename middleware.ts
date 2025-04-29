export { auth as middleware } from "@/../auth" 

// Add protected routes here
// See https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * - login (example login page)
//      */
//     '/((?!api|_next/static|_next/image|favicon.ico|login).*)', 
//   ],
// };

// Example: Protect only the /settings route
export const config = {
   matcher: ['/settings'],
}; 