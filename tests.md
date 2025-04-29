# Test Status

This document tracks the status of automated tests in the Plank You Very Much project.

**Legend:**

*   ✅ **Passing:** All tests in the suite currently pass.
*   ⚠️ **Skipped:** Some or all tests in the suite are skipped (e.g., due to known issues, incomplete features, or environment problems).
*   ❌ **Failing:** Some or all tests in the suite are currently failing.
*   ➖ **Missing:** Tests for this area have not yet been implemented.

---

## Unit Tests (Jest + React Testing Library)

These tests verify individual functions, components, or modules in isolation.

### Core Utilities (`src/lib`)

*   **`src/lib/calculationUtils.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the core calculation logic for BMR, TDEE, calorie targets, and protein targets based on user profile data.
*   **`src/lib/offlineSyncManager.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the offline sync manager's ability to process queued actions from `offlineQueueStore`, handle simulated success/failure responses, and interact correctly with the store.
*   **`src/lib/fitbitActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the server actions for Fitbit integration (refresh token, fetch data, sync daily data, revoke token) using mocks for cookies and API calls.
*   **`src/lib/notificationActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the server action responsible for managing push notification subscriptions (add, remove, get) using mocked storage.
*   **`src/lib/auth.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for `getCurrentUserId` function (requires mocking NextAuth `auth()` call).

### Zustand Stores (`src/store`)

*   **`src/store/activityStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding, updating, and retrieving daily activity data (like Fitbit data), ensuring correct date handling and persistence (mocked IDB).
*   **`src/store/metricsStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding, updating, and retrieving body metrics, ensuring correct data handling and persistence logic (mocked IDB).
*   **`src/store/offlineQueueStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding actions to the queue, processing the queue (success and failure scenarios), and clearing completed/failed actions. Checks persistence (mocked IDB).
*   **`src/store/plannerStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests plan generation, marking workouts complete (including optimistic UI updates), handling offline scenarios (queuing actions via `offlineQueueStore`), and persistence (mocked IDB).
*   **`src/store/userProfileStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests setting/updating user profile info, goals, Fitbit connection status, and tutorial completion markers. Checks persistence (mocked IDB).

### Features (`src/features`)

*   **`src/features/planner/utils/generatePlan.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the basic plan generation logic to ensure it creates a weekly schedule with the correct number and types of workouts.

### API Routes (`src/app/api`)

*   **`src/app/api/fitbit/callback/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the Fitbit OAuth callback handler for exchanging the authorization code, handling success/error states, and setting cookies (using mocks).
*   **`src/app/api/notifications/subscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for subscribing a user to push notifications, verifying request handling, validation, and interaction with mocked KV storage.
*   **`src/app/api/notifications/unsubscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for unsubscribing a user, verifying request handling and interaction with mocked KV storage.
*   **`src/app/api/auth/[...nextauth]/route.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for the NextAuth.js catch-all route handler (e.g., simulating sign-in attempts, callback handling for providers).

### Components (`src/components`, `src/features/*/components`)

*   **Status:** ➖ Missing
*   **Description:** No component-level tests have been implemented yet. These would typically involve rendering components using React Testing Library and asserting their output or behavior based on props and user interactions.
    *   Examples: `<UserProfileForm />`, `<WorkoutDetailsModal />`, `<Dashboard />`, `<Planner />` components, Auth-related UI components (Login forms/buttons).

---

## End-to-End Tests (Cypress)

*   **Status:** ➖ Missing
*   **Description:** No E2E tests are currently implemented. These tests would simulate user flows through the entire application in a browser environment using Cypress.
    *   Examples: Onboarding flow, Logging in via different providers, Logging a workout, Connecting Fitbit, Syncing data.

---

**Summary:**

*   Core utility functions, Zustand stores, offline sync manager, Fitbit server actions, and Notification/Fitbit API routes have passing unit tests.
*   Tests for `src/lib/auth.ts`, the NextAuth API route, and all Components/E2E flows are missing.

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific file
pnpm test <path/to/file.test.ts>

# Run E2E tests (requires setup)
# pnpm exec cypress open 
``` 