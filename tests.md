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

### Core Utilities

*   **`src/lib/calculationUtils.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the core calculation logic for BMR, TDEE, calorie targets, and protein targets based on user profile data.

### Zustand Stores

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
    *   **Status:** ➖ Missing
    *   **Description:** Tests for setting/updating user profile info, goals, and Fitbit connection status.
*   **`src/store/activityStore.test.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for adding/updating activity data (e.g., synced Fitbit data).

### Features

*   **`src/features/planner/utils/generatePlan.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the basic plan generation logic to ensure it creates a weekly schedule with the correct number and types of workouts.

### Library Integrations / Server Actions

*   **`src/lib/offlineSyncManager.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the offline sync manager's ability to process queued actions from `offlineQueueStore`, handle simulated success/failure responses, and interact correctly with the store.
*   **`src/lib/fitbitActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the server actions for Fitbit integration:
        *   `refreshFitbitToken`: Mocking cookie retrieval and API calls for success/failure scenarios.
        *   `fetchFitbitData`: Mocking token validation, refresh logic, and API calls.
        *   `syncFitbitDataForDate`: Mocking underlying `fetchFitbitData` calls for various data points and handling success/partial/failure scenarios.
        *   `revokeFitbitToken`: Mocking cookie retrieval, API calls, and cookie deletion.
*   **`src/lib/notificationActions.test.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for the server action responsible for triggering push notifications.

### API Routes (Next.js Route Handlers)

*   **`src/app/api/notifications/subscribe/route.test.ts`**
    *   **Status:** ⚠️ Skipped
    *   **Reason:** Previously reported issues mocking `NextResponse.json()` within the Jest environment.
    *   **Description:** (Intended) Tests the API endpoint for subscribing a user to push notifications, verifying request handling and interaction with storage (currently placeholder).
*   **`src/app/api/notifications/unsubscribe/route.test.ts`**
    *   **Status:** ⚠️ Skipped
    *   **Reason:** Previously reported issues mocking `NextResponse.json()` within the Jest environment.
    *   **Description:** (Intended) Tests the API endpoint for unsubscribing a user, verifying request handling and interaction with storage.
*   **`src/app/api/fitbit/callback/route.test.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests the Fitbit OAuth callback handler for exchanging the authorization code, handling success/error states, and setting cookies.

### Components (React Testing Library)

*   **Status:** ➖ Missing
*   **Description:** No component-level tests have been implemented yet. These would typically involve rendering components and asserting their output or behavior based on props and user interactions.
    *   Examples: `<UserProfileForm />`, `<WorkoutDetailsModal />`, `<Dashboard />`, `<Planner />` components.

---

## End-to-End Tests (Cypress)

*   **Status:** ➖ Missing
*   **Description:** No E2E tests are currently implemented. These tests would simulate user flows through the entire application in a browser environment.
    *   Examples: Onboarding flow, logging a workout, connecting Fitbit, syncing data.

---

**Summary:**

*   Core utility functions, Zustand stores (metrics, offline queue, planner), offline sync manager, and Fitbit server actions have passing unit tests.
*   Tests for Notification API routes are currently skipped.
*   Tests for some stores (`userProfileStore`, `activityStore`), Notification Actions, Fitbit Callback API, and all Components/E2E flows are missing.

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific file
pnpm test <path/to/file.test.ts>

# Run E2E tests (requires setup)
# pnpm exec cypress open 
``` 