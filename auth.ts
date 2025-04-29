import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { kv } from '@vercel/kv';
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";

// Initialize the adapter with the Vercel KV client
const adapter = UpstashRedisAdapter(kv);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: adapter, // Use the correct adapter instance
  session: { strategy: 'database' }, // Use database strategy with adapter
}); 