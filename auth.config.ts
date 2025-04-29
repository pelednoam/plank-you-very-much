import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

export const authConfig = {
  // Add pages configuration if you want custom login/error pages
  // pages: {
  //   signIn: '/login', 
  // },
  callbacks: {
    // Add callbacks for session management, JWT modification, etc.
    // Example: Extend session with user ID
    session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    // authorized({ auth, request: { nextUrl } }) {
    //   const isLoggedIn = !!auth?.user;
    //   const isOnDashboard = nextUrl.pathname.startsWith('/dashboard'); // Example protected route
    //   if (isOnDashboard) {
    //     if (isLoggedIn) return true;
    //     return false; // Redirect unauthenticated users to login page
    //   } else if (isLoggedIn) {
    //     // Optionally redirect logged-in users from auth pages
    //     // return Response.redirect(new URL('/dashboard', nextUrl));
    //   }
    //   return true;
    // },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // !!! IMPORTANT: Placeholder authorize function !!!
        // Replace this with actual user lookup and password verification!
        // Example: Fetch user from your database (KV store via adapter?)
        // const user = await getUserByEmail(credentials.email);
        // if (user && await comparePassword(credentials.password, user.passwordHash)) {
        //   return { id: user.id, name: user.name, email: user.email }; // Return user object on success
        // }

        // ---- START PLACEHOLDER ----
        console.warn("Using placeholder authentication in auth.config.ts. REPLACE THIS!");
        if (credentials?.email === 'test@example.com' && credentials?.password === 'password') {
          // Return a mock user object
          return { id: 'placeholder-user-id', name: 'Test User', email: 'test@example.com' };
        }
        // ---- END PLACEHOLDER ----

        // If authentication fails, return null
        console.log('Invalid credentials');
        return null;
      }
    })
  ], 
} satisfies NextAuthConfig; 