# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project implements the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project aims to follow the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md).

## 2. Tech Stack (Current)

*   **Framework:** Next.js 14 (React 18) + TypeScript _(As specified, using **App Router**)_
*   **Styling:** Tailwind CSS + **shadcn/ui** _(Spec mentioned Tailwind; `shadcn/ui` added)_
*   **State Management:** Zustand (with IndexedDB persistence via `idb-keyval`) _(As specified)_
*   **Forms:** React Hook Form + **Zod** _(Spec mentioned RHF; `Zod` added)_
*   **Charts:** Recharts _(As specified)_
*   **Date Handling:** Day.js _(As specified)_
*   **Data Persistence:** IndexedDB via `idb-keyval` library _(As specified, library differs slightly)_
*   **Markdown:** `gray-matter`, `react-markdown` + `remark-gfm` _(Implementation choices)_
*   **Integrations:** Fitbit Web API (OAuth 2.0), Google Health Connect / Apple HealthKit (Pending), Web NFC API (Pending) _(As specified)_
*   **Testing:** Jest + React Testing Library _(As specified; **Cypress E2E pending**)_
*   **PWA:** `@serwist/next` _(Implementation choice)_
*   **Other Libraries:** `uuid`, `lucide-react` (icons), `sonner` (toasts), `core-js` (polyfills) _(Implementation choices)_

## 3. Current Status (as of YYYY-MM-DD - Update Date)

### Implemented Features (Highlights & Deviations from Spec)

*   **Project Setup:** Next.js **App Router** structure, TypeScript, Tailwind, ESLint.
    *   **Deviation:** Spec proposed Pages Router structure (Section 6).
*   **Data Types:** Core interfaces defined (`src/types/index.ts`).
    *   **Deviation:** Some specific fields differ from Spec Section 7 (e.g., `Workout` has `completedAt`, `performanceRating`). `UserProfile` and other store-specific types added.
*   **State Management (Zustand + IndexedDB):** Core stores (`userProfileStore`, `metricsStore`, `activityStore`, `offlineQueueStore`, `plannerStore`) created using `idbStorage` from `zustand/middleware`.
    *   **Offline Queue Store (`offlineQueueStore`):** Implemented for offline action queuing.
    *   **Planner Store (`plannerStore`):** Handles plan generation and workout updates with optimistic UI and offline queuing.
    *   **Deviation:** Uses `idb-keyval` via Zustand middleware, not raw `idb` (Spec Section 5). Requires `partialize` for non-serializable data.
*   **Offline Sync Manager:** Basic manager (`src/lib/offlineSyncManager.ts`) processes `offlineQueueStore` when online (simulated backend).
*   **Routing & Layout:** Basic App Router layout (`src/app/layout.tsx`) and core pages implemented (matching Spec Section 9).
*   **UI Components (shadcn/ui):** Core components added.
*   **Onboarding Flow (`/onboard`):** Implemented (Spec Feature 4.1).
*   **Dashboard (`/`):** Implemented with charts and today's workouts (Spec Feature 4.6). Workout items link to details modal.
*   **Nutrition (`/nutrition`):** Meal logging and macro progress implemented (Spec Feature 4.5). Targets use goal parameters (Spec Feature 4.2 partially addressed).
*   **Planner (`/planner`):** Monthly calendar view, basic weekly plan generation (`generateWeeklyPlan`). Workout items link to details modal.
    *   **Added:** Workout duration adjustment based on goals (partially addresses Spec Feature 4.3).
    *   **Deviation:** Full dynamic/adaptive plan generation is **missing** (Spec Feature 4.3, Algorithm 8.4).
*   **Workout Logging:** Added `WorkoutDetailsModal` for logging performance (duration, notes, rating, completion), with offline queuing. _(Fulfills implicit logging need)_.
*   **Goal Engine:** UI in Settings and calculation functions (`calculateCalorieTarget`, `calculateProteinTarget`) implemented (Spec Feature 4.2).
*   **Knowledge Base (`/knowledge`):** Implemented (Spec Feature 4.7).
*   **Settings (`/settings`):** Profile, Goals, Data Export sections implemented (Spec Feature 4.9). Integrations and Notifications UI exists.
*   **Fitbit Integration (Partial):** _(Spec Feature 4.12, Section 8A)_
    *   OAuth UI flow initiated from Settings.
    *   Callback handler (`/api/fitbit/callback/route.ts`) exchanges code for tokens.
    *   **Improved Security:** Refresh tokens stored in secure, HTTP-only cookies (Deviation from Spec 8A.3 suggesting DB storage). Access tokens/expiry managed client-side (Zustand).
    *   Server Actions (`src/lib/fitbitActions.ts`) for refreshing tokens, fetching data (`fetchFitbitData`), **syncing daily summary (`syncFitbitDataForDate`)**, and revoking tokens. **All tests pass.**
    *   **Deviation:** Server Actions use **placeholder `getCurrentUserId`**.
    *   **Missing:** Frontend logic to *trigger* `syncFitbitDataForDate` and *use* synced data.
*   **Notifications (Partial):** _(Spec Feature 4.8, Section 11)_
    *   Frontend subscription UI/logic in Settings.
    *   Backend API routes (`/api/notifications/subscribe`, `/unsubscribe`) exist.
    *   **Deviation:** Uses **placeholder in-memory storage** (`notificationSubscriptionStorage.ts`).
    *   **Deviation:** Server action (`notificationActions.ts`) uses **placeholder logic** and **does not send pushes**.
    *   **Deviation:** Uses JavaScript service worker (`public/sw.js`) instead of Spec's proposed TypeScript (Section 6).
*   **Testing:** Jest + RTL setup. Unit tests for core utils, stores, offline sync, and Fitbit actions implemented and passing. (See `tests.md`).
*   **Toast Notifications:** Implemented using `sonner`.
*   **Data Export:** Implemented in Settings (Spec Feature 4.9).

### Current Issues / Known Limitations

*   **Fitbit Integration:** Requires **real authentication** (replace `getCurrentUserId`). Frontend sync trigger and data usage logic are **missing**.
*   **Notifications:** Backend needs **real storage and push implementation**. API route tests are **skipped**. Service worker functionality needs verification.
*   **Offline Sync Manager:** Uses **simulated backend calls**. Lacks robust error handling/retries.
*   **Planner:** Lacks **fully adaptive plan generation** based on progress/feedback.
*   **Testing:** Component tests and E2E tests (Cypress) are **missing**. (See `tests.md`).
*   **Layout (`layout.tsx`):** Potential lingering type issues with `BeforeInstallPromptEvent` (check if `@ts-ignore` is still present).

### Missing Features / Next Steps (Prioritized from Spec)

**High Priority:**

*   **Fitbit Integration (Complete):** Implement real authentication, frontend sync trigger, and data utilization (Spec 4.12, 8A, 17.v1.1).
*   **Notifications (Complete):** Implement real backend storage, push logic, fix tests, verify SW (Spec 4.8, 11).
*   **Planner Enhancements:** Implement fully adaptive plan generation (Spec 4.3, 8.4).
*   **Offline Sync Manager:** Integrate with real backend, add error handling.

**Medium Priority:**

*   **Wyze Scale Integration:** Health Connect/Kit bridge or CSV import (Spec 4.13, 8F).
*   **NFC Triggers:** Implement Web NFC scanning, QR fallback, logging integration (Spec 4.14, 8B, 8E).
*   **Media Library:** Implement Exercise Video/Meal Gallery components & integration (Spec 4.10, 4.11).
*   **Testing:** Add Component tests (RTL) and E2E tests (Cypress) (Spec 13).
*   **Guided Tutorials:** Implement NFC tutorial modal/flow (Spec 4.14, 8D).

**Low Priority:**

*   Equipment Cues (Spec 4.4)
*   AI Plan Regeneration (Spec 17.v2.0)
*   Native Wrappers (Optional) (Spec 8E)
*   CI/CD Finalization (Spec 14)
*   Accessibility & UX Polish (Spec 12)

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
3.  **Environment Variables:**
    Create a `.env.local` file in the root directory for **client-side** variables:
    ```
    NEXT_PUBLIC_APP_NAME="Plank You Very Much"
    NEXT_PUBLIC_FITBIT_CLIENT_ID="YOUR_FITBIT_CLIENT_ID"
    # Ensure this matches the registered callback URL in Fitbit Dev settings AND your callback API route
    NEXT_PUBLIC_FITBIT_REDIRECT_URI="http://localhost:3000/api/fitbit/callback"
    NEXT_PUBLIC_VAPID_PUBLIC_KEY="YOUR_GENERATED_VAPID_PUBLIC_KEY"
    ```
    Create a `.env` file (or use environment variables in deployment) for **server-side** secrets:
    ```
    FITBIT_CLIENT_SECRET="YOUR_FITBIT_CLIENT_SECRET"
    VAPID_PRIVATE_KEY="YOUR_GENERATED_VAPID_PRIVATE_KEY"
    ```
    **Note:** Ensure `NEXT_PUBLIC_FITBIT_REDIRECT_URI` points to your API callback route (`/api/fitbit/callback`), not the settings page directly, as the API route handles the code exchange. The settings page (`/settings`) will handle *displaying* connection status after the redirect from the API route.

    **Never commit `.env`, `FITBIT_CLIENT_SECRET` or `VAPID_PRIVATE_KEY` to your repository.**
4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application should be available at `http://localhost:3000`.

5.  **Run Tests:** (See `tests.md` for details)
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