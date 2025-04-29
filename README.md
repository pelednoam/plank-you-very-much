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
*   **Testing:** Jest + React Testing Library (Setup complete, minimal tests) _(Spec also mentioned Cypress E2E - not yet implemented)_. 
*   **PWA:** **`@serwist/next`** (using standard `sw.js`, requires verification) _(Spec mentioned older `@ducanh2912/next-pwa`; `@serwist/next` is now installed, likely replacing it)_. 
*   **Other Libraries:** `uuid`, `lucide-react` (icons), `sonner` (toasts), `core-js` (polyfills) _(Chosen during implementation)_. 

## 3. Current Status (as of 2025-04-29)

### Implemented Features (Highlights & Deviations from Spec)

*   **Project Setup:** Next.js **App Router** structure, TypeScript, Tailwind, ESLint. _(Deviation: Spec proposed Pages Router structure)_.
*   **Directory Structure:** Aligned with App Router conventions.
*   **Data Types:** Core interfaces defined (`src/types/index.ts`).
    *   **Deviation:** `Workout` uses `completedAt?: string` instead of Spec's `completed?: boolean`.
    *   **Deviation:** `UserProfile` includes additional fields (`completedOnboarding`, `notificationPrefs`, `fitbitUserId`, `completedTutorials`) and uses lowercase enums for `activityLevel`.
    *   **Deviation:** Added `Planner` types (`WeeklyPlan`, etc.) and `FitbitTokenData` not in original Spec models.
*   **State Management (Zustand + IndexedDB):** Stores created and persistence configured.
*   **Routing & Layout:** Basic App Router layout and core pages implemented.
*   **UI Components (shadcn/ui):** Core components added. **Note:** Persistent import errors encountered (see README section 2).
*   **Onboarding Flow (`/onboard`):** Fully implemented as per Spec 4.1.
*   **Dashboard (`/`):** Implemented as per Spec 4.6, including charts and today's workouts. **Added:** Workout items link to details modal.
*   **Nutrition (`/nutrition`):** Meal logging and macro progress implemented (Spec 4.5). Targets now use goal parameters.
*   **Planner (`/planner`):**
    *   Monthly calendar view implemented.
    *   **Deviation:** Basic weekly plan generation exists, but **dynamic/adaptive generation (Spec 4.3, 8.4) is missing**.
    *   **Added:** Workout items link to details modal.
*   **Workout Logging:** **Added `WorkoutDetailsModal`** component for logging performance (duration, notes, rating, completion), integrated into Dashboard and Planner. _(Fulfills implicit logging need, but specific modal wasn't in Spec)_. 
*   **Goal Engine:** Fully implemented UI (Settings) and integration with calculations (Spec 4.2).
*   **Knowledge Base (`/knowledge`):** Implemented as per Spec 4.7.
*   **Settings (`/settings`):** Core sections implemented.
*   **Fitbit Integration (Partial):** OAuth UI and callback logic exist.
    *   **Deviation:** Server Actions use **placeholders simulating secure storage** instead of actual implementation (Spec 8A).
*   **Notifications (Partial):**
    *   Frontend subscription logic in Settings implemented.
    *   **Deviation:** Uses JavaScript service worker (`sw.js`) instead of Spec's proposed TypeScript (`serviceWorker.ts`).
    *   **Deviation:** Backend uses **placeholder API routes**; actual push service and triggers are missing (Spec 11).
*   **Testing:** Setup complete, minimal unit tests exist. Component and E2E tests are missing.
*   **Toast Notifications:** Implemented.

### Missing Features / Next Steps (Prioritized)

**High Priority (Core Functionality & Spec Alignment):**

*   **Fitbit Integration (Implement Secure Storage & Full Sync):** _(Address deviation from Spec 8A)_.
    *   Implement actual Secure Token Storage (replace placeholders).
    *   Implement actual Authentication (replace placeholder `getCurrentUserId`).
    *   Implement Complete Data Sync (sleep, HR, etc.).
    *   Ensure Token Revocation works with real storage.
*   **Notifications (Implement Backend & Triggers):** _(Address deviation from Spec 11 & 16)_.
    *   Implement Backend Push Service.
    *   Implement Notification Triggers.
    *   Verify Service Worker functionality with PWA build.
*   **Planner Enhancements (Dynamic Generation):** Implement adaptive logic as per Spec 4.3 & 8.4.
*   **Offline Sync (Decision & Implementation):** Decide if needed and implement queue/sync logic (Spec 15).

**Medium Priority (Completing Features & Polish):**

*   **Wyze Scale Integration:** Implement Health Connect/Kit bridge or CSV import (Spec 8F).
*   **NFC Triggers:** Connect scan action, implement QR fallback (Spec 8B, 8E).
*   **Media Library Integration:** Implement Meal Gallery & Exercise Video components (Spec 4.10, 4.11).
*   **Settings (Full):** Notification preference backend sync, refine data export.
*   **Testing:** Add Component and E2E tests (Spec 13).
*   **Styling & UX:** General polish, accessibility (Spec 12).
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
    # Run specific test file
    pnpm exec jest src/store/metricsStore.test.ts
    # Run all tests (assuming configured in package.json/jest.config)
    # pnpm test
    ```
    ```bash
    # Run E2E tests (requires Cypress setup)
    # pnpm exec cypress open
    ```

## 5. Contribution

Please refer to Section 19 of the [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md) for contribution guidelines. 