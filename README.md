# Plank You Very Much

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

## 3. Current Status (as of YYYY-MM-DD)

### Implemented Features (v1.0 Foundation)

*   **Project Setup:** Initialized using Next.js App Router (`create-next-app` with `--src-dir`, `--ts`, `--tailwind`, `--eslint`).
*   **Dependencies:** Core dependencies installed (see `package.json` and Section 18 of Spec).
*   **Directory Structure:** Aligned with spec (Section 6), adapted for Next.js App Router conventions (`src/app`, `src/components`, `src/features`, `src/lib`, `src/store`, `src/types`, `cypress/`, `media/`).
*   **Data Types:** Core TypeScript interfaces defined in `src/types/index.ts` based on Section 7.
*   **State Management:**
    *   Zustand stores created for `UserProfile`, `Planner` (Workouts), `Metrics`, `Nutrition` (Meals), and `MediaAssets`.
    *   Persistence configured for all core stores using `idbStorage` adapter, saving state to IndexedDB.
*   **Routing & Layout:**
    *   Basic application layout defined in `src/app/layout.tsx`.
    *   Shared `<Header />` and `<Sidebar />` components created (`src/components/layout/`).
    *   Placeholder pages created for all main routes (`/`, `/onboard`, `/planner`, `/nutrition`, `/knowledge`, `/settings`).
*   **Onboarding Feature:**
    *   Multi-step form (`src/features/onboarding/components/OnboardingForm.tsx`) implemented using React Hook Form and Zod.
    *   Captures basic profile info, goals, and preferences.
    *   Saves data to `useUserProfileStore` and marks onboarding complete.
    *   `/onboard` page redirects to `/` if onboarding is already complete.
    *   Sidebar link for onboarding is conditionally rendered.
*   **Dashboard Placeholders:**
    *   Placeholder components (`<MetricCards />`, `<ProgressChart />`, `<TodayWorkout />`) created in `src/components/dashboard/`.
    *   Integrated into the main dashboard page (`src/app/page.tsx`).

### Missing Features / Next Steps

*   **Dashboard Implementation:** Connect dashboard components to display data from `useMetricsStore` & `usePlannerStore`.
*   **Planner Implementation:** Build calendar UI (`/planner`), integrate `@dnd-kit`, implement workout modal and weekly plan generation logic (Spec Section 8, Algo 4).
*   **Nutrition Implementation:** Build UI (`/nutrition`) for meal logging and macro progress display.
*   **Knowledge Base Implementation:** Build UI (`/knowledge`) to display `KnowledgeCard` components.
*   **Settings Implementation:** Build UI (`/settings`) for profile editing, reminders, data export, and integration triggers (Fitbit/NFC).
*   **Core Algorithms:** Implement BMR/TDEE/Macro calculations (Spec Section 8, Algo 1-3) using `UserProfile` data.
*   **Media Library Integration:** Populate `useMediaStore` with actual assets (or load from config), implement `ExerciseVideo`/`MealGallery` components, link from Workouts/Meals.
*   **Notifications:** Implement basic Web Push notifications (Spec Section 4.8, 11).
*   **PWA Setup:** Configure `@ducanh2912/next-pwa` for service worker, offline caching, install prompt (Spec Section 15).
*   **Fitbit Integration (v1.1):** Implement OAuth flow, callback handler (API Route/Server Action), data sync logic (Spec Section 8A).
*   **NFC Triggers (v1.1+):** Implement Web NFC scanning, routing logic (Spec Section 8B). Requires `NfcTag` store.
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