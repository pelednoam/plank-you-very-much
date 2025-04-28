# Plank You Very Much

![Plank You Very Much Logo](/public/logo.png)

_AI-Assisted Personal Trainer – "Climb higher, dive stronger, live leaner."_

---

## 1. Purpose & Vision

This project implements the **Plank You Very Much** web application, an AI-assisted personal trainer designed to help users (initially Shay, 45 yo) lower body fat while preserving back health and supporting activities like climbing and swimming. The goal is to provide adaptive weekly plans, habit nudges, progress dashboards, and seamless integration with daily routines and equipment.

This project follows the specifications outlined in [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md).

## 2. Tech Stack

*   **Framework:** Next.js 15 (React 19) + TypeScript
*   **Styling:** Tailwind CSS 4
*   **State Management:** Zustand 5 (with IndexedDB persistence via `idb`)
*   **Forms:** React Hook Form 7 + Zod (for validation)
*   **Charts:** Recharts
*   **Date Handling:** Day.js
*   **Data Persistence:** IndexedDB via `idb` library
*   **Testing:** Jest + React Testing Library (Unit/Component), Cypress (E2E)
*   **PWA:** `@ducanh2912/next-pwa` (or similar)
*   **Other Libraries:** `uuid`, `@dnd-kit/*`, `lucide-react`

## 3. Current Status (as of 2025-04-28 - Updated)

### Implemented Features (v1.0 Foundation + Recent Progress)

*   **Project Setup:** Initialized using Next.js App Router (`create-next-app` with `--src-dir`, `--ts`, `--tailwind`, `--eslint`).
*   **Dependencies:** Core dependencies installed (see `package.json` and Section 18 of Spec).
*   **Directory Structure:** Aligned with spec (Section 6), adapted for Next.js App Router conventions (`src/app`, `src/components`, `src/features`, `src/lib`, `src/store`, `src/types`, `cypress/`, `media/`). Redundant `peakform/` and `MealLogger.tsx` removed.
*   **Data Types:** Core TypeScript interfaces defined in `src/types/index.ts` based on Section 7.
*   **State Management:**
    *   Zustand stores created for `UserProfile`, `Planner` (Workouts), `Metrics`, `Nutrition` (Meals), and `MediaAssets`.
    *   Persistence configured for all core stores using `idbStorage` adapter, saving state to IndexedDB.
*   **Routing & Layout:**
    *   Basic application layout defined in `src/app/layout.tsx`.
    *   Shared `<Header />` and `<Sidebar />` components created (`src/components/layout/`).
    *   Reusable `<Modal />` component created (`src/components/ui/`).
    *   Pages created for all main routes (`/`, `/onboard`, `/planner`, `/nutrition`, `/knowledge`, `/settings`).
*   **UI Components:** Basic reusable components created in `src/components/ui/` (`<Button />`, `<Input />`, `<Label />`, `<Select />`, `<SelectOption />`).
*   **Onboarding Feature:**
    *   Multi-step form (`src/features/onboarding/components/OnboardingForm.tsx`) implemented using React Hook Form and Zod.
    *   Captures basic profile info, goals, and preferences.
    *   Saves data to `useUserProfileStore` and marks onboarding complete.
    *   `/onboard` page redirects to `/` if onboarding is already complete.
    *   Sidebar link for onboarding is conditionally rendered.
*   **Dashboard Implementation (Connected):**
    *   Dashboard components (`<MetricCards />`, `<ProgressChart />`, `<TodayWorkout />`) created in `src/components/dashboard/`.
    *   `<MetricCards />` connected to `useMetricsStore` and `useUserProfileStore` to display dynamic, persisted data, **including calculated BMR, TDEE, Calorie Target, and Protein Target**.
    *   Integrated into the main dashboard page (`src/app/page.tsx`).
*   **Planner UI (Interactive):**
    *   `<WeeklyCalendarView />` component created (`src/features/planner/components/`) displaying days and workouts from the store.
    *   Integrated into the planner page (`src/app/planner/page.tsx`).
    *   `<WorkoutModal />` component created (`src/features/planner/components/WorkoutModal.tsx`) using core UI components for adding/editing workouts, integrated with `WeeklyCalendarView`.
    *   Drag-and-drop functionality implemented in `WeeklyCalendarView` using `@dnd-kit` for rescheduling workouts.
    *   Basic weekly plan generation utility (`src/lib/plannerUtils.ts`) created based on spec rules (Algo 4).
    *   Plan generation action added to `plannerStore` and triggered by a button in `WeeklyCalendarView`.
*   **Core Algorithms (Integrated):**
    *   Utility functions created in `src/lib/calculationUtils.ts` for BMR (Harris-Benedict), TDEE (placeholder multiplier), Calorie Target (fixed deficit), and Protein Target (LBM-based) as per Spec Section 8, Algos 1-3.
    *   **Calculations integrated into the Dashboard's `<MetricCards />` and Nutrition's `<MacroProgress />` components.**
*   **Nutrition Implementation (Basic):**
    *   Nutrition page (`src/app/nutrition/page.tsx`) created.
    *   `<MealLogForm />` component implemented for logging meal macros (`src/features/nutrition/components/`).
    *   `<MacroProgress />` component implemented to display daily totals vs calculated targets (`src/features/nutrition/components/`).
    *   `<MealList />` component implemented to display and delete logged meals for the day (`src/features/nutrition/components/`).
*   **Settings Implementation (Basic):**
    *   Settings page (`src/app/settings/page.tsx`) created.
    *   `<UserProfileForm />` component implemented for editing core profile data (`src/features/settings/components/`).
    *   Placeholder sections added for Notifications, Data Export, and Integrations.

### Missing Features / Next Steps (Prioritized)

*   **Planner Implementation (Refinements):**
    *   **Enhance Plan Generation:** Improve workout distribution logic (e.g., avoid back-to-back intensity), consider user busy blocks (requires placeholder/integration), add STRENGTH workouts based on profile. (Spec Section 8 Algo 4 enhancements).
*   **Core Algorithms (Refinement):**
    *   Refine TDEE calculation using a dynamic activity multiplier (e.g., from user settings or Fitbit data). Implement Activity Level setting in `UserProfileForm`.
*   **Settings Implementation (Full):**
    *   Implement UI/logic for Notification Preferences (Spec Section 11).
    *   Implement Data Export functionality (Spec Section 4.9).
    *   Implement Integration triggers (Fitbit Connect Button - Spec Section 8A, NFC Help Link - Spec Section 8D).
*   **Knowledge Base Implementation:** Build UI (`/knowledge`) to display `KnowledgeCard` components (Spec Section 4.7).
*   **Media Library Integration:** Populate `useMediaStore` with actual assets (or load from config), implement `ExerciseVideo`/`MealGallery` components, link from Workouts/Meals (Spec Section 4.10, 4.11, 7 `MediaAsset`).
*   **Notifications:** Implement basic Web Push notifications via Service Worker (Spec Section 4.8, 11). Implement Equipment Cues (standing desk prompts, balance board timer - Spec Section 4.4).
*   **PWA Setup:** Configure `@ducanh2912/next-pwa` (or similar) for service worker, offline caching, install prompt (Spec Section 15).
*   **Fitbit Integration (v1.1):** Implement OAuth flow, callback handler (API Route/Server Action), data sync logic (Spec Section 8A).
*   **NFC Triggers (v1.1+):** Implement Web NFC scanning, routing logic (Spec Section 8B). Requires `NfcTag` store. Implement QR code fallback for iOS (Spec Section 8E).
*   **Guided Tutorials (v1.1+):** Implement Tutorial components & content (Spec Section 8D). Requires Tutorial progress store.
*   **Testing:** Write comprehensive unit, component, and E2E tests (Spec Section 13).
*   **CI/CD:** Finalize GitHub Actions workflow (Spec Section 14).
*   **Styling & UX Refinements:** Apply consistent styling, improve accessibility (Spec Section 12).

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
    Create a `.env.local` file in the root directory and add necessary variables (see Section 16 of the spec, e.g., `NEXT_PUBLIC_APP_NAME`). For Fitbit integration, you'll need `NEXT_PUBLIC_FITBIT_CLIENT_ID`, `NEXT_PUBLIC_FITBIT_REDIRECT_URI`, and `FITBIT_CLIENT_SECRET`.
4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application should be available at `http://localhost:3000`.

5.  **Run Tests (Setup Required):**
    *   **Jest (Unit/Component):** `pnpm test` (Requires Jest configuration: `jest.config.js`, `jest.setup.js`)
    *   **Cypress (E2E):** `pnpm exec cypress open` (Requires initial Cypress setup)

## 5. Contribution

Please refer to Section 19 of the [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md) for contribution guidelines. 