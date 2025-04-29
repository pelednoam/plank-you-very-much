# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project implements the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project follows the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md).

## 2. Tech Stack

*   **Framework:** Next.js 14 (React 18) + TypeScript _(As specified)_.
*   **Styling:** Tailwind CSS + **shadcn/ui** _(Spec mentioned Tailwind; `shadcn/ui` was added for component library)_. 
*   **State Management:** Zustand (with IndexedDB persistence via `idb`) _(As specified)_.
*   **Forms:** React Hook Form + **Zod** _(Spec mentioned RHF; `Zod` was added for schema validation)_. 
*   **Charts:** Recharts _(As specified)_.
*   **Date Handling:** Day.js _(As specified)_.
*   **Data Persistence:** IndexedDB via `idb` library _(As specified)_.
*   **Markdown:** `gray-matter` (frontmatter), `react-markdown` + `remark-gfm` (rendering) _(Specific libraries chosen during implementation)_. 
*   **Integrations:** Fitbit Web API (OAuth 2.0 - partial), Google Health Connect / Apple HealthKit (pending), Web NFC API (pending) _(As specified)_. 
*   **Testing:** Jest + React Testing Library (Setup complete, core store tests implemented) _(Spec also mentioned Cypress E2E - not yet implemented)_. 
*   **PWA:** **`@serwist/next`** (using standard `sw.js`, requires verification) _(Spec mentioned older `@ducanh2912/next-pwa`; `@serwist/next` is now installed, likely replacing it)_. 
*   **Other Libraries:** `uuid`, `lucide-react` (icons), `sonner` (toasts), `core-js` (polyfills) _(Chosen during implementation)_. 

## 3. Current Status (as of 2025-04-29 - Includes Offline Sync)

### Implemented Features (Highlights & Deviations from Spec)

*   **Project Setup:** Next.js **App Router** structure, TypeScript, Tailwind, ESLint. _(Deviation: Spec proposed Pages Router structure)_.
*   **Directory Structure:** Aligned with App Router conventions.
*   **Data Types:** Core interfaces defined (`src/types/index.ts`).
    *   **Deviation:** `Workout` uses `completedAt?: string` and `performanceRating` (renamed from `rating`).
    *   **Deviation:** `UserProfile` includes additional fields and uses App Router specific enums/types.
    *   **Deviation:** Added `Planner` types, `FitbitTokenData`, etc.
*   **State Management (Zustand + IndexedDB):** Core stores (`userProfileStore`, `metricsStore`, `activityStore`, `offlineQueueStore`, `plannerStore`) created using `idbStorage` for persistence.
    *   **Offline Queue Store (`offlineQueueStore`)**: Implemented to queue actions (e.g., workout completion) when offline. Persists only `pendingActions` to IDB.
    *   **Planner Store (`plannerStore`)**: Handles plan generation and workout updates. Includes optimistic UI for `markWorkoutComplete` and queues action via `offlineQueueStore` if offline or simulated sync fails. Persists only `currentPlan` to IDB.
    *   **Deviation:** Required `partialize` option in `persist` middleware for stores using IDB to avoid `DataCloneError` with non-serializable functions.
*   **Offline Sync Manager:**
    *   Implemented in `src/lib/offlineSyncManager.ts`.
    *   Initialized on app load via `src/app/layout.tsx`.
    *   Processes actions from `offlineQueueStore` when online (simulated backend call).
    *   Handles basic success/failure (leaves failed actions in queue).
*   **Routing & Layout:** Basic App Router layout (`src/app/layout.tsx`) and core pages implemented.
*   **UI Components (shadcn/ui):** Core components added.
*   **Onboarding Flow (`/onboard`):** Fully implemented as per Spec 4.1.
*   **Dashboard (`/`):** Implemented as per Spec 4.6, including charts and today's workouts. **Added:** Workout items link to details modal.
*   **Nutrition (`/nutrition`):** Meal logging and macro progress implemented (Spec 4.5). Targets now use goal parameters (Spec 4.2 partially addressed).
*   **Planner (`/planner`):**
    *   Monthly calendar view implemented.
    *   Basic weekly plan generation (`generateWeeklyPlan`) exists.
    *   **Added:** Dynamic workout **duration adjustment** based on user fat loss goals (partially addresses Spec 4.3).
    *   **Deviation:** Full dynamic/adaptive generation (Spec 4.3, 8.4) based on feedback/progress is **missing**.
    *   **Added:** Workout items link to details modal.
*   **Workout Logging:** **Added `WorkoutDetailsModal`** component for logging performance (duration, notes, rating, completion), integrated into Dashboard and Planner. Supports offline queuing via `plannerStore`. _(Fulfills implicit logging need)_.
*   **Goal Engine:** Fully implemented UI (Settings) and integration with calculation functions (`calculateCalorieTarget`, `calculateProteinTarget`).
*   **Knowledge Base (`/knowledge`):** Implemented as per Spec 4.7.
*   **Settings (`/settings`):** Core sections implemented (Profile, Goals, Data Export). Integrations and Notifications UI exists.
*   **Fitbit Integration (Partial):**
    *   OAuth UI flow initiated from Settings.
    *   Callback handler (`/api/fitbit/callback/route.ts`) implemented to exchange code for tokens.
    *   **Improved Security:** Refresh tokens are stored in **secure, HTTP-only cookies**. Access tokens/expiry managed in client-side Zustand store (`userProfileStore`).
    *   Server Actions (`src/lib/fitbitActions.ts`) implemented for refreshing tokens (using cookie), fetching arbitrary data (`fetchFitbitData`), **syncing daily summary data (`syncFitbitDataForDate`)**, and revoking tokens. **All related tests are passing.**
    *   **Deviation:** Server Actions still use **placeholder `getCurrentUserId`** for app-level authentication.
    *   **Deviation:** Actual frontend integration to *trigger* `syncFitbitDataForDate` and *use* the resulting `FitbitDaily` data is **not implemented**.
    *   **Issue:** Linter errors previously noted in `fitbitActions.ts` related to `cookies()` have been resolved or were related to test setup.
*   **Notifications (Partial):**
    *   Frontend subscription UI/logic in Settings implemented (`NotificationSettings` component).
    *   Backend API routes for `/api/notifications/subscribe` and `/api/notifications/unsubscribe` exist.
    *   **Deviation:** Uses **placeholder in-memory storage** (`notificationSubscriptionStorage.ts`) instead of a real database.
    *   **Deviation:** Server action for triggering reminders (`notificationActions.ts`) exists but uses **placeholder logic** and **does not actually send pushes** (`web-push` not fully integrated).
    *   **Deviation:** Uses JavaScript service worker (`public/sw.js`) instead of Spec's proposed TypeScript. Requires verification with PWA build.
    *   **Issue:** API route tests (`subscribe/route.test.ts`, `unsubscribe/route.test.ts`) are **skipped** due to issues mocking `NextResponse.json()` in Jest.
*   **Testing:**
    *   Jest + RTL setup complete (`jest.config.ts`, `jest.setup.js` includes mocks for `crypto.randomUUID`, `navigator.onLine`, `fetch`, IDB).
    *   Unit tests implemented and **passing** for:
        *   `src/lib/calculationUtils.test.ts`
        *   `src/store/metricsStore.test.ts`
        *   `src/features/planner/utils/generatePlan.test.ts`
        *   `src/store/offlineQueueStore.test.ts`
        *   `src/store/plannerStore.test.ts` (covers optimistic updates, offline/failure queuing)
        *   `src/lib/offlineSyncManager.test.ts`
        *   **`src/lib/fitbitActions.test.ts` (covers `refreshFitbitToken`, `fetchFitbitData`, `syncFitbitDataForDate`, `revokeFitbitToken`)**
    *   **Skipped Tests:** `api/notifications/subscribe/route.test.ts`, `api/notifications/unsubscribe/route.test.ts`.
    *   **Missing:** Component tests, E2E tests (Cypress).
    *   **Added:** A new `tests.md` file tracks test status in more detail.
*   **Toast Notifications:** Implemented using `sonner`.
*   **Data Export:** Implemented in Settings using `exportUtils.ts`.

### Current Issues / Known Limitations

*   **Fitbit Integration:** Server Actions use a **placeholder `getCurrentUserId`**. Frontend logic to *trigger sync* and *utilize synced data* is missing.
*   **Notifications:** API route tests (`subscribe/route.test.ts`, `unsubscribe/route.test.ts`) are **skipped**. Service worker functionality needs PWA build verification. Backend uses placeholder storage and does not send pushes.
*   **Offline Sync Manager:** Uses simulated backend calls; requires real API integration. Lacks sophisticated error handling (e.g., retries, user feedback on permanent failure).
*   **Testing:** Component tests and E2E tests (Cypress) are **missing**. (See `tests.md` for details).
*   **Layout (`layout.tsx`):** Persistent linter errors regarding `BeforeInstallPromptEvent` type, despite global type definition in `src/types/global.d.ts`. The `@ts-ignore` directives are currently suppressing these.

### Missing Features / Next Steps (Prioritized)

**High Priority (Core Functionality & Spec Alignment):**

*   **Notifications (Implement Backend & Fixes):** _(Address deviations from Spec 11 & 16)_.
    *   Implement **real database storage** for subscriptions.
    *   Implement **actual backend push service** using `web-push`.
    *   Implement real notification triggers.
    *   **Fix skipped tests** for API routes & verify `sw.js`.
*   **Fitbit Integration (Frontend & Auth):** _(Address deviations from Spec 8A)_.
    *   Implement **frontend logic** to trigger `syncFitbitDataForDate` (e.g., on app load, periodically).
    *   Integrate the fetched `FitbitDaily` data into relevant stores/UI (e.g., update metrics, adjust calorie targets - Spec 17 v1.1).
    *   Replace placeholder `getCurrentUserId` with **actual authentication** mechanism.
*   **Offline Sync Manager (Real Backend & Error Handling):** Replace placeholder sync logic with actual API calls. Implement retry logic / user feedback for failures.
*   **Planner Enhancements (Full Adaptive Generation):** Implement adaptive logic based on user progress/feedback (Spec 4.3 & 8.4).

**Medium Priority (Completing Features & Polish):**

*   **Wyze Scale Integration:** Implement Health Connect/Kit bridge or CSV import (Spec 8F).
*   **NFC Triggers:** Implement Web NFC scanning, connect to workout logging, implement QR fallback (Spec 8B, 8E).
*   **Media Library Integration:** Implement Meal Gallery & Exercise Video components (Spec 4.10, 4.11).
*   **Settings (Full):** Implement backend sync for notification preferences, refine data export.
*   **Testing:** Add Component tests (RTL) and E2E tests (Cypress) (Spec 13).
*   **Styling & UX:** General polish, accessibility review (Spec 12).
*   **CI/CD:** Finalize workflow (Spec 14).

**Low Priority (v2.0 / Future):**

*   AI Plan Regeneration (Spec 17)
*   Native Wrappers (Optional) (Spec 8E)
*   Equipment Cues (Spec 4.4)
*   Social Features / Other Integrations (Spec 17)

## 4. Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd plank-you-very-much
    ```
2.  **Install dependencies:**
    ```bash
    pnpm install
    ```
3.  **Environment Variables:** _(Values below align with Spec 16 where applicable)_.
    Create a `.env.local` file in the root directory. Add:
    *   `NEXT_PUBLIC_APP_NAME="Plank You Very Much"`
    *   `NEXT_PUBLIC_FITBIT_CLIENT_ID="YOUR_FITBIT_CLIENT_ID"`
    *   `NEXT_PUBLIC_FITBIT_REDIRECT_URI="http://localhost:3000/settings"` (Update for deployment)
    *   `NEXT_PUBLIC_VAPID_PUBLIC_KEY="YOUR_GENERATED_VAPID_PUBLIC_KEY"`

    Create a `.env` file (or use environment variables in deployment) for **server-side** secrets. Add:
    *   `FITBIT_CLIENT_SECRET="YOUR_FITBIT_CLIENT_SECRET"`
    *   `VAPID_PRIVATE_KEY="YOUR_GENERATED_VAPID_PRIVATE_KEY"`

    **Never commit `.env`, `FITBIT_CLIENT_SECRET` or `VAPID_PRIVATE_KEY` to your repository.**
4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application should be available at `http://localhost:3000`.

5.  **Run Tests:**
    ```bash
    # Run all tests
    pnpm test
    # Run specific test file
    # pnpm exec jest src/store/metricsStore.test.ts
    ```
    ```bash
    # Run E2E tests (requires Cypress setup)
    # pnpm exec cypress open
    ```

## 5. Contribution

Please refer to Section 19 of the [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md) for contribution guidelines. 