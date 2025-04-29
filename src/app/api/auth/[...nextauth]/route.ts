import { handlers } from '@/../auth'; // Corrected path to root auth.ts
export const { GET, POST } = handlers;

// If you need to enable Edge runtime for specific providers/cases:
// export const runtime = "edge"; 