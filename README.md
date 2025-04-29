# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project implements the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project follows the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md).

## 2. Tech Stack

*   **Framework:** Next.js 14 (React 18) + TypeScript
*   **Styling:** Tailwind CSS + shadcn/ui
*   **State Management:** Zustand (with IndexedDB persistence via `idb`)
*   **Forms:** React Hook Form + Zod (for validation)
*   **Charts:** Recharts
*   **Date Handling:** Day.js
*   **Data Persistence:** IndexedDB via `idb` library
*   **Markdown:**
    *   Parsing: `gray-matter` (for frontmatter)
    *   Rendering: `react-markdown` + `remark-gfm`
*   **Integrations:** Fitbit Web API (OAuth 2.0), Google Health Connect / Apple HealthKit, Web NFC API
*   **Testing:** Jest + React Testing Library (Unit/Component), Cypress (E2E)
*   **PWA:** `@ducanh2912/next-pwa` (Service worker setup needs refinement)
*   **Other Libraries:** `uuid`, `lucide-react` (icons), `sonner` (toasts), `core-js` (polyfills)

## 3. Current Status (as of 2025-04-29)

### Implemented Features

*   **Project Setup:** Next.js App Router, TypeScript, Tailwind, ESLint. Core dependencies installed.
*   **Directory Structure:** Aligned with spec, adapted for Next.js App Router.
*   **Data Types:** Core TypeScript interfaces defined (`src/types/index.ts`).
*   **State Management (Zustand + IndexedDB):**
    *   Stores created for `UserProfile`, `Metrics`, `Workout`, `Meal` (replacing `Planner`, `Nutrition`). `Activity` store also present. Offline queue store exists but needs integration.
    *   IndexedDB persistence configured using `createIdbStorage` and `partialize` for `Metrics`, `Workout`, `Meal` stores.
*   **Routing & Layout:** Basic App Router layout (`layout.tsx`), shared components (`<Header />`, `<Sidebar />`). Pages created for `/`, `/nutrition`, `/planner`, `/knowledge`, `/settings`.
*   **UI Components (shadcn/ui):** Initialized. `Card`, `Button`, `Input`, `Label`, `Checkbox`, `Badge`, `Progress` added and used.
*   **Dashboard (`/`):**
    *   Displays dynamic metric cards (`MetricCards.tsx`) using `useMetricsStore`.
    *   Shows weight/body fat trend chart (`ProgressChart.tsx`) using `useMetricsStore` and `Recharts`.
    *   Displays today's workouts (`TodayWorkout.tsx`) using `useWorkoutStore` with completion toggle.
*   **Nutrition (`/nutrition`):**
    *   Meal logging form (`MealLogForm.tsx`) with validation (React Hook Form + Zod) saving to `useMealStore`.
    *   Macro progress display (`MacroProgress.tsx`) showing consumed vs calculated targets (targets need refinement).
    *   Daily meal list (`MealList.tsx`) with delete placeholder.
*   **Planner (`/planner`):**
    *   Basic monthly calendar view (`CalendarView.tsx`) displaying workouts from `useWorkoutStore`.
    *   Month navigation implemented.
*   **Knowledge Base (`/knowledge`):**
    *   Content loaded from markdown files (`content/knowledge/*.md`) using `gray-matter` via `loadKnowledgeCards` utility.
    *   Server Component (`page.tsx`) passes data to Client Component (`KnowledgeClientPage.tsx`).
    *   Client component handles search/filtering and renders cards using `react-markdown`.
*   **Core Algorithms:** BMR, TDEE, Calorie/Protein target calculation utilities exist (`calculationUtils.ts`).
*   **Settings (`/settings`):** Basic page structure. User profile form, data export buttons (JSON), Fitbit connect button/flow (partial), Wyze CSV import button exist. Notification settings UI present.
*   **Fitbit Integration (Partial - Needs Secure Storage & Full Sync):**
    *   OAuth flow implemented (Connect button, callback).
    *   Server Actions for token handling (`fitbitActions.ts`) **using placeholder storage**.
    *   Settings UI for connect, manual sync (profile & basic activity), disconnect.
    *   Synced activity data saved to `activityStore`.
*   **Testing:**
    *   Jest + RTL setup configured with `jsdom` environment.
    *   `fake-indexeddb` and `core-js` polyfills added to `jest.setup.js`.
    *   Unit tests for `useMetricsStore` (`importMetrics`) created and passing.
*   **Toast Notifications:** Implemented (`sonner`) and used in various components.

### Missing Features / Next Steps (Prioritized)

**High Priority (Core Functionality & Spec Alignment):**

*   **Onboarding Flow:** Implement the multi-step onboarding form (`/onboard`) to collect initial user data (height, weight, goals, etc.) and save to `UserProfileStore`. (Spec Section 4.1)
*   **Goal Engine:**
    *   Implement UI for setting fat-loss/fitness targets and timelines. (Spec Section 4.2)
    *   Refine target calculations in `MacroProgress` (and potentially `calculationUtils`) based on user goals.
*   **Planner Enhancements:**
    *   **Workout Details/Logging:** Implement the `WorkoutDetails` modal/panel to show details when clicking calendar items, allow logging (sets/reps/RPE etc.), and potentially trigger from `TodayWorkout` start button.
    *   **Plan Generation/Adaptation:** Implement logic to auto-generate/adapt weekly plans based on goals, progress, and flags (e.g., back issues). (Spec Section 4.3, 8.4)
*   **Fitbit Integration (Finalize):**
    *   **Secure Token Storage:** Implement secure, user-associated server-side storage for Fitbit tokens (replace placeholder). (Spec Section 8A)
    *   **Complete Data Sync:** Implement fetching and storing of all required Fitbit data (sleep, HR) likely via a background job/server action. (Spec Section 7, 8A.4)
    *   **Token Revocation:** Implement secure token removal upon disconnect.
*   **Notifications (Full Implementation):**
    *   **Service Worker:** Resolve TypeScript/build issues or finalize JS implementation (`src/app/sw.js`).
    *   **Backend Push Service:** Implement secure backend for subscriptions and sending messages (VAPID). (Spec Section 11, 16)
    *   **Frontend Subscription Logic:** Connect UI toggles in Settings to backend subscription.
    *   **Notification Triggers:** Implement logic for specific notifications (workout reminders, inactivity cues). (Spec Section 11)
*   **Offline Sync (If Required):** Re-evaluate need for offline queue based on Supabase/backend choice. If needed: Implement server sync, robust error handling, and optimistic UI updates. (Spec Section 15)

**Medium Priority (Completing Features & Polish):**

*   **Wyze Scale Integration (via Health Connect / HealthKit):**
    *   Investigate and implement native modules/plugins or bridge for health data access. (Spec Section 8F)
    *   Implement permissions and data reading, mapping to `BodyMetrics`.
    *   Finalize CSV import logic in `CsvImportButton`. (Spec Section 8F.3)
*   **NFC Triggers (Finalize):**
    *   **Implement Scan Action:** Connect scan success (`useNfcReader`) to starting/logging a workout (e.g., opening `WorkoutDetails`). (Spec Section 8B)
    *   **iOS Fallback (QR Code):** Implement QR code generation and scanner UI. (Spec Section 8E)
*   **Media Library Integration:**
    *   **Meal Gallery:** Implement swipeable carousel (`MealGallery`) component on Nutrition page. (Spec Section 4.11)
    *   **Exercise Media:** Integrate `ExerciseVideo` component, load actual assets. (Spec Section 4.10)
*   **Settings Implementation (Full):**
    *   Implement persistence/functionality for granular Notification Preferences. (Spec Section 11)
    *   Refine Data Export (ensure comprehensive format/data). (Spec Section 4.9)
*   **Testing:**
    *   Write unit tests for other stores and utils.
    *   Add component tests (RTL).
    *   Set up and write E2E tests (Cypress). (Spec Section 13)
*   **Styling & UX Refinements:**
    *   Apply consistent styling, improve accessibility (WCAG), add PWA icons, loading/empty states. (Spec Section 12)
*   **CI/CD:**
    *   Finalize GitHub Actions workflow for linting, testing, building, deploying. (Spec Section 14)

**Low Priority (v2.0 / Future):**

*   **AI Plan Regeneration (v2.0):** (Spec Section 17)
*   **Native Wrappers (Optional):** (Spec Section 8E)
*   **Equipment Cues:** (Spec Section 4.4)
*   **Social Features / Other Integrations:** (Spec Section 17)

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
    Create a `.env.local` file in the root directory for **client-side** variables. Add `NEXT_PUBLIC_APP_NAME`. For Fitbit integration, add `NEXT_PUBLIC_FITBIT_CLIENT_ID` and `NEXT_PUBLIC_FITBIT_REDIRECT_URI`. For push notifications, add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (generate using `npx web-push generate-vapid-keys`).
    Create a `.env` file (or use environment variables in your deployment environment) for **server-side** secrets. Add `FITBIT_CLIENT_SECRET`. For push notifications, add `VAPID_PRIVATE_KEY` (from the command above).
    **Never commit `FITBIT_CLIENT_SECRET` or `VAPID_PRIVATE_KEY` to your repository.**
4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application should be available at `http://localhost:3000`.

5.  **Run Tests:**
    ```bash
    # Run specific test file
    npx jest src/store/metricsStore.test.ts 
    # Run all tests (if configured in package.json or jest.config.js)
    # pnpm test 
    ```
    ```bash
    # Run E2E tests (requires initial Cypress setup)
    # pnpm exec cypress open 
    ```

## 5. Contribution

Please refer to Section 19 of the [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md) for contribution guidelines. 