# Test Status

This document tracks the status of automated tests in the Plank You Very Much project.

**Legend:**

*   ✅ **Passing:** All tests in the suite currently pass.
*   ⚠️ **Skipped/Blocked:** Some or all tests in the suite are skipped or blocked (e.g., due to known issues, incomplete features, or environment problems).
*   ❌ **Failing:** Some or all tests in the suite are currently failing.
*   ➖ **Missing:** Tests for this area have not yet been implemented.
*   ✎ **Todo:** Test suite passes but contains specific `it.todo` items for future enhancements.

---

## Unit Tests (Jest + React Testing Library)

These tests verify individual functions, components, or modules in isolation.

### Core Utilities (`src/lib`)

*   **`src/lib/calculationUtils.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests BMR, TDEE, Calorie Target (inc. Fitbit sync priority), LBM, Protein Target calculations.
*   **`src/lib/offlineSyncManager.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the offline sync manager's queue processing, retry logic, and handling of different action types using mocked server actions.
*   **`src/lib/fitbitActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests Fitbit server actions (token refresh, data fetching/syncing, token revocation) using mocked API calls and KV store access.
*   **`src/lib/notificationActions.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the notification *sending* logic (`triggerWorkoutReminders`, `sendNotification`) using mocked KV, web-push, and placeholder workout data. Verifies subscription handling and error conditions. *Does not test the accuracy of workout data fetching for reminders (uses placeholder `getUpcomingWorkoutsForUser`).*
*   **`src/lib/auth.authorize.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the Credentials provider `authorize` function logic (KV lookups, password hashing, user existence checks) using mocks.
*   **`src/lib/auth.ts` (`getCurrentUserId`)**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for the `getCurrentUserId` utility function (important for securing server actions).

### Zustand Stores (`src/store`)

*   **`src/store/activityStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/updating/retrieving daily activity data and hydration flag logic.
*   **`src/store/metricsStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/updating/retrieving body metrics, import logic, and hydration flag logic.
*   **`src/store/offlineQueueStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding, removing, retrieving, and updating metadata for actions in the offline queue.
*   **`src/store/nutritionStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests adding/deleting meals, including offline queue integration.
*   **`src/store/plannerStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests plan generation trigger, adaptive logic inputs, multi-plan storage, marking workouts complete (inc. offline handling), and store initialization.
*   **`src/store/userProfileStore.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests profile setting/updating, onboarding completion, goal setting, Fitbit connection management, fitness data updates (inc. recalculations), tutorial completion, and hydration flag logic.

### Features (`src/features`)

*   **`src/features/planner/utils/generatePlan.test.ts`**
    *   **Status:** ✅ Passing / ✎ 1 Todo
    *   **Description:** Tests the core `generateWeeklyPlan` utility, including template selection, duration adaptations, availability placeholder logic, and enforcement of minimum durations. Includes a `todo` for future back pain level testing.

### API Routes (`src/app/api`)

*   **`src/app/api/fitbit/callback/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the Fitbit OAuth callback handler (token exchange, user profile fetching, secure token storage in KV) using mocks.
*   **`src/app/api/notifications/subscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for saving a push subscription to Vercel KV (uses mocked KV, auth).
*   **`src/app/api/notifications/unsubscribe/route.test.ts`**
    *   **Status:** ✅ Passing
    *   **Description:** Tests the API endpoint for deleting a push subscription from Vercel KV (uses mocked KV, auth).
*   **`src/app/api/auth/[...nextauth]/route.ts`**
    *   **Status:** ➖ Missing
    *   **Description:** Tests for the NextAuth.js catch-all route handler (covers sign-in, sign-out, session management, etc.).

### Components (`src/components`, `src/features/*/components`)

*   **Overall Status:** ➖ Partial / ✅ Passing (Some Implemented)
*   **Description:** Component testing is unblocked via module mocks. Several key components now have tests, but many are still missing.
    *   **`src/features/settings/components/GoalSettingsForm.test.tsx`:** ✅ Passing - Tests form rendering, input changes, validation, and submission.
    *   **`src/features/settings/components/UserProfileForm.test.tsx`:** ✅ Passing - Tests rendering, input changes, validation, submission, and disabled state.
    *   **`src/features/settings/components/PreferenceToggles.test.tsx`:** ✅ Passing - Tests rendering, toggling preferences, handling null states, and toasts.
    *   **`src/features/settings/components/NotificationSettings.test.tsx`:** ✅ Passing - Tests rendering based on API states, button interactions, and preference toggles. (Mocks Notification/ServiceWorker APIs).
    *   **`src/components/auth/AuthButtons.test.tsx`:** ✅ Passing - Tests conditional rendering based on authentication session state.
    *   **Key Missing Examples:** `<WorkoutDetailsModal />`, `<Dashboard />`, `<MetricCards />`, `<Planner />`, `<NutritionLog />`, `<IntegrationSettings />`, `<CsvImportButton />`, `<ExerciseVideo />`, `<Timer />`, `<SignInButton />`, `<SignOutButton />`...

### Auth Middleware (`src/middleware.ts`)

*   **Status:** ➖ Missing
*   **Description:** Tests for the NextAuth.js middleware logic, verifying route protection rules based on the `config.matcher` and authentication status.

---

## End-to-End Tests (Cypress)

*   **Overall Status:** ❌ Failing / ➖ Partial (Setup Complete, 1 spec failing)
*   **Description:** Cypress is set up with `start-server-and-test`. Initial specs exist, but the settings page test is consistently failing due to rendering issues in the test environment.
*   **`settings.cy.ts`:** ❌ **Failing**
    *   **Issue:** Tests time out waiting for elements (`h1`, `h3`, etc.) to appear. A React hydration error (#185) occurs but is suppressed via `Cypress.on('uncaught:exception')`. The underlying cause seems to be a failure of the page to render correctly in the Cypress/production environment.
    *   **Contains:** Basic navigation and rendering checks for headings of different sections.
*   **`smoke.cy.ts`:** ✅ **Passing**
    *   **Contains:** Simple test to load the home page.
*   **`auth.cy.ts`:** ➖ Missing
*   **`dashboard.cy.ts`:** ➖ Missing
*   **`planner.cy.ts`:** ➖ Missing
*   **`onboarding.cy.ts`:** ➖ Missing

---

## Running Tests

```bash
# Run all Jest unit/component tests
pnpm test

# Run a specific Jest test file
pnpm test src/store/plannerStore.test.ts

# Run Jest in watch mode
pnpm test --watch

# Run E2E tests (headless)
pnpm run test:e2e

# Run E2E tests interactively (for debugging)
pnpm exec cypress open
```