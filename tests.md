# Test Status

This document tracks the status of automated tests in the Plank You Very Much project.

**Legend:**

*   ✅ **Passing:** All tests in the suite currently pass.
*   ⚠️ **Skipped:** Some or all tests in the suite are skipped (e.g., due to known issues, incomplete features, or environment problems).
*   ❌ **Failing:** Some or all tests in the suite are currently failing.
*   ➖ **Missing:** Tests for this area have not yet been implemented.
*   🔄 **Updated:** Test has been updated to cover new functionality but still needs verification.

---

## Unit Tests (Jest + React Testing Library)

These tests verify individual functions, components, or modules in isolation.

### Core Utilities (`src/lib`)

*   **`src/lib/calculationUtils.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests BMR, TDEE, Calorie Target (inc. Fitbit sync priority), LBM, Protein Target calculations.
*   **`src/lib/offlineSyncManager.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the offline sync manager's ability to process queued actions.
*   **`src/lib/fitbitActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests Fitbit server actions (refresh, fetch, sync, revoke).
*   **`src/lib/notificationActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests notification sending logic using mocked KV and web-push.
*   **`src/lib/auth.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for `getCurrentUserId` function.

### Zustand Stores (`src/store`)

*   **`src/store/activityStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/updating/retrieving daily activity data.
*   **`src/store/metricsStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/updating/retrieving body metrics.
*   **`src/store/offlineQueueStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests offline queue action management.
*   **`src/store/nutritionStore.test.ts`** 
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/deleting meals with offline handling.
*   **`src/store/plannerStore.test.ts`**
    *   **Status:** 🔄 Updated
    *   **Description:** Tests plan generation, workout completion, offline handling. Needs update verification for multi-plan storage and adaptive logic.
*   **`src/store/userProfileStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests profile updates, goal setting, Fitbit connection, fitness data updates.

### Features (`src/features`)

*   **`src/features/planner/utils/generatePlan.test.ts`**
    *   **Status:** 🔄 Updated
    *   **Description:** Tests basic plan generation logic. Needs expansion to cover adaptive logic based on previous week completion rates.

### API Routes (`src/app/api`)

*   **`src/app/api/fitbit/callback/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests Fitbit OAuth callback handler.
*   **`src/app/api/notifications/subscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for subscribing a user (uses mocked KV, auth).
*   **`src/app/api/notifications/unsubscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for unsubscribing a user (uses mocked KV, auth).
*   **`src/app/api/auth/[...nextauth]/route.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for the NextAuth.js catch-all route handler.

### Components (`src/components`, `src/features/*/components`)

*   **Status:** ➖ Missing
*   **Description:** No component-level tests implemented yet.
    *   Examples: `<UserProfileForm />`, `<WorkoutDetailsModal />`, `<Dashboard />`, `<Planner />`, `<AuthButtons />`, `<SignInButton />`, `<SignOutButton />`.

### Auth Components (`src/components/auth`)

*   **`src/components/auth/SignInButton.tsx`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for sign-in button functionality.
*   **`src/components/auth/SignOutButton.tsx`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for sign-out button functionality.
*   **`src/components/auth/AuthButtons.tsx`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for conditional rendering based on session state.

### Auth Middleware

*   **`src/middleware.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for route protection middleware implementation.

---

## End-to-End Tests (Cypress)

*   **Status:** ➖ Missing
*   **Description:** No E2E tests implemented yet.
    *   Examples: Onboarding, Login flows, Log workout, Connect Fitbit.

---

**Summary:**

*   Most core utilities, stores, and API routes (Fitbit, **Notifications**) have passing unit tests.
*   Tests for authentication components (`SignInButton`, `SignOutButton`, `AuthButtons`), `src/lib/auth.ts`, the NextAuth API route, all other Components, and E2E flows are missing.
*   The `plannerStore.test.ts` and `generatePlan.test.ts` tests need updates to cover the new adaptive logic functionality.

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific file
pnpm test <path/to/file.test.ts>

# Run E2E tests (requires setup)
# pnpm exec cypress open 
``` 