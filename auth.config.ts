import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { kv } from '@vercel/kv'; // Import KV client
import bcrypt from 'bcrypt'; // Import bcrypt
import type { User } from 'next-auth'; // Import User type for return

// Define a type for the user data stored in KV (adjust as needed)
interface StoredUser {
  id: string;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  passwordHash?: string | null; // Store hashed password for Credentials users
}

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
      async authorize(credentials): Promise<User | null> {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          console.error('[Auth] Missing email or password');
          return null;
        }

        // --- Real Authentication Logic --- 
        try {
          console.log(`[Auth] Attempting login for: ${email}`);
          // 1. Fetch user from KV store
          const userKey = `user:email:${email.toLowerCase()}`;
          const storedUser = await kv.get<StoredUser>(userKey);

          if (!storedUser) {
            console.log(`[Auth] User not found: ${email}`);
            return null;
          }

          // 2. Check if user was created via Credentials (has password)
          if (!storedUser.passwordHash) {
            console.log(`[Auth] User ${email} signed up via OAuth, cannot use password.`);
            // Optional: Provide a more specific error message to the user?
            return null;
          }

          // 3. Compare provided password with stored hash
          const passwordsMatch = await bcrypt.compare(password, storedUser.passwordHash);

          if (passwordsMatch) {
            console.log(`[Auth] Password match for: ${email}`);
            // 4. Return user object (must match NextAuth User type)
            return {
              id: storedUser.id,
              name: storedUser.name,
              email: storedUser.email,
              image: storedUser.image,
            };
          } else {
            console.log(`[Auth] Invalid password for: ${email}`);
            return null;
          }
        } catch (error) {
          console.error('[Auth] Error during authorize:', error);
          return null; // Return null on any error
        }
        // --- End Real Authentication Logic ---
      }
    })
  ], 
} satisfies NextAuthConfig; 