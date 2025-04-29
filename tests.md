# Plank You Very Much - Test Inventory

This document provides an overview of the automated tests in the project.

## Test Categories & Status

### Unit Tests - Core Utils

These tests cover utility functions used across the application.

| File                               | Status  | Description                                                                          |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `src/lib/calculationUtils.test.ts` | Passing | Tests BMR, TDEE, calorie, and protein target calculation functions.                  |
| `src/lib/exportUtils.test.ts`      | Passing | Tests functions for exporting user data (metrics, activities) to JSON/CSV.         |
| `src/lib/offlineSyncManager.test.ts`| Passing | Tests the manager responsible for processing queued offline actions.                  |

### Unit Tests - Stores (Zustand)

These tests cover the application's state management stores.

| File                            | Status  | Description                                                                                          |
| ------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `src/store/activityStore.test.ts` | Passing | Tests adding, updating activity logs (workouts, meals).                                              |
| `src/store/metricsStore.test.ts`  | Passing | Tests adding and retrieving body metrics.                                                            |
| `src/store/offlineQueueStore.test.ts`| Passing | Tests adding actions to the offline queue and processing them.                                        |
| `src/store/plannerStore.test.ts`  | Passing | Tests plan generation, workout completion (including optimistic UI and offline queue integration). |
| `src/store/userProfileStore.test.ts`| Passing | Tests updating user profile information, goals, and Fitbit token data.                            |

### Unit Tests - Features

These tests cover specific feature logic, often utilities within a feature directory.

| File                                            | Status  | Description                                                  |
| ----------------------------------------------- | ------- | ------------------------------------------------------------ |
| `src/features/planner/utils/generatePlan.test.ts` | Passing | Tests the basic weekly workout plan generation logic.      |

### Unit Tests - Server Actions

These tests cover Next.js Server Actions used for backend operations.

| File                            | Status  | Description                                                                                                                                                           |
| ------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/fitbitActions.test.ts`   | Passing | Tests `refreshFitbitToken`, `fetchFitbitData`, `syncFitbitDataForDate`, and `revokeFitbitToken`. Covers token handling, data fetching, daily sync logic, and error cases. |
| `src/lib/notificationActions.test.ts` | Passing | Tests the server action for *triggering* reminder notifications (currently uses placeholder logic).                                                              |

### API Route Tests (Next.js)

These tests cover API routes used primarily for external integrations or specific backend tasks.

| File                                              | Status   | Description                                                              | Notes                                         |
| ------------------------------------------------- | -------- | ------------------------------------------------------------------------ | --------------------------------------------- |
| `/api/fitbit/callback/route.test.ts`              | Passing  | Tests the Fitbit OAuth callback handler for token exchange.              |                                               |
| `/api/notifications/subscribe/route.test.ts`    | **Skipped** | Tests the endpoint for saving push notification subscriptions.           | Issues mocking `NextResponse.json()` in Jest. |
| `/api/notifications/unsubscribe/route.test.ts`  | **Skipped** | Tests the endpoint for removing push notification subscriptions.         | Issues mocking `NextResponse.json()` in Jest. |

### Component Tests (React Testing Library)

These tests focus on rendering individual UI components and verifying their behavior in isolation.

| File        | Status             | Description                 |
| ----------- | ------------------ | --------------------------- |
| *(various)* | **Not Implemented** | Tests for individual components. |

### End-to-End (E2E) Tests (Cypress)

These tests simulate user flows through the entire application in a browser environment.

| File        | Status             | Description                                                                        |
| ----------- | ------------------ | ---------------------------------------------------------------------------------- |
| *(various)* | **Not Implemented** | Tests for critical user journeys like onboarding, planning, logging, viewing progress. |

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific file
pnpm test <path/to/file.test.ts>

# Run E2E tests (requires setup)
# pnpm exec cypress open 
``` 