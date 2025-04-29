import { auth } from "@/../auth"; // Path to root auth.ts

/**
 * Gets the current user ID from the session.
 * Returns the user ID string if authenticated, or null if not.
 * Throws an error only if there's an unexpected issue retrieving the session.
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const session = await auth(); // Use the imported auth function
    return session?.user?.id ?? null; // Return ID or null
  } catch (error) {
      console.error("[getCurrentUserId] Error fetching session:", error);
      // Decide on error handling: re-throw or return null?
      // Re-throwing might be better to signal a deeper problem.
      throw new Error("Failed to retrieve session"); 
      // Or return null; 
  }
};

// Add other auth-related helper functions here if needed 