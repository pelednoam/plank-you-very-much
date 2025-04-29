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
*   **Markdown Rendering:** `unified`, `remark-parse`, `remark-html`
*   **Testing:** Jest + React Testing Library (Unit/Component), Cypress (E2E)
*   **PWA:** `@ducanh2912/next-pwa`
*   **Other Libraries:** `uuid`, `@dnd-kit/*`, `lucide-react`

## 3. Current Status (as of 2025-04-28 - Iteration 3)

### Implemented Features

*   **Project Setup:** Initialized using Next.js App Router (`create-next-app` with `--src-dir`, `--ts`, `--tailwind`, `--eslint`). Core dependencies installed.
*   **Directory Structure:** Aligned with spec (Section 6), adapted for Next.js App Router conventions.
*   **Data Types:** Core TypeScript interfaces defined (`src/types/index.ts`).
*   **State Management:** Zustand stores created and configured with IndexedDB persistence for `UserProfile`, `Planner`, `Metrics`, `Nutrition`, and `MediaAssets`.
*   **Routing & Layout:** Basic layout (`layout.tsx`), shared components (`<Header />`, `<Sidebar />`, `<Modal />`), pages created for all main routes.
*   **UI Components:** Basic reusable components created (`<Button />`, `<Input />`, `<Label />`, `<Select />`, `<SelectOption />`).
*   **Onboarding:** Multi-step form implemented, saves to store, handles completion state.
*   **Dashboard:** Displays dynamic metrics from stores, including calculated BMR, TDEE, Calorie Target, and Protein Target.
*   **Planner:** Interactive weekly calendar view with drag-and-drop rescheduling. Add/Edit workout modal implemented. **Enhanced weekly plan generation** logic considering back issues and workout distribution.
*   **Core Algorithms:** BMR, TDEE, Calorie/Protein targets implemented and integrated into UI. **TDEE calculation now uses dynamic activity level** from user profile.
*   **Nutrition:** Meal logging form, macro progress bars (vs calculated targets), and daily meal list with delete functionality.
*   **Settings:** User profile editing form (including activity level), basic notification permission request UI, **data export functionality** (workouts, nutrition to JSON), placeholders for integrations.
*   **PWA:** Basic setup configured using `@ducanh2912/next-pwa` and `manifest.json`.
*   **Fitbit Integration (Initial):** Connect button implemented (redirects for OAuth), API callback route created (exchanges code for token), client-side handling of redirect parameters added to Settings page.
*   **Knowledge Base:** Basic page created, displays hardcoded `KnowledgeCard` components.
*   **Media Library (Initial):** `useMediaStore` created, `MealMediaDisplay` component implemented and integrated into `MealList` to show thumbnails. `ExerciseVideo` component created.
*   **Guided Tutorials (Initial):** `TutorialModal` component created (renders markdown), NFC Tools tutorial data added, tutorial completion tracked in `userProfileStore`, trigger added to Settings page.
*   **Testing:** Basic Jest + React Testing Library setup configured, sample unit test created.

### Missing Features / Next Steps (Prioritized)

*   **Fitbit Integration (Full - v1.1 Target):**
    *   Secure token storage (access & refresh tokens).
    *   Implement token refresh logic.
    *   Implement data synchronization logic (fetch daily activity/sleep from Fitbit API).
    *   Implement disconnect functionality (revoke token, clear state).
*   **Notifications (Full):**
    *   Implement Service Worker `push` event handler to display notifications.
    *   Implement backend mechanism for storing push subscriptions and sending messages (requires VAPID keys).
    *   Implement specific notification triggers (workout reminders, hydration, posture cues - Spec Section 4.4, 11).
*   **NFC Triggers (v1.1+):**
    *   Implement Web NFC scanning logic (Android/Chrome - Spec Section 8B).
    *   Implement routing based on scanned tag URI.
    *   Create `NfcTag` store/management UI.
    *   Implement QR code generation/fallback for iOS (Spec Section 8E).
*   **Media Library Integration (Full):**
    *   Load actual media assets (videos, gifs, images) - requires adding assets to `/media/`.
    *   Integrate `ExerciseVideo` into workout displays/modal.
    *   Implement media selection UI within `WorkoutModal` and `MealLogForm`.
    *   Implement `MealGallery` component (Spec Section 4.11).
*   **Settings Implementation (Full):** Implement UI/logic for granular Notification Preferences (Spec Section 11).
*   **Testing:** Write comprehensive unit, component, and E2E tests for all major features (Spec Section 13).
*   **Styling & UX Refinements:** Apply consistent styling, improve accessibility (WCAG), add PWA icons, implement better loading/empty states, add toast notifications (Spec Section 12).
*   **CI/CD:** Finalize GitHub Actions workflow for automated testing and deployment (Spec Section 14).
*   **Knowledge Base (Full):** Implement dynamic data loading, filtering/search functionality.
*   **AI Plan Regeneration (v2.0):** Integrate with OpenAI API (or similar) for dynamic plan adjustments based on progress/feedback (Spec Section 17).

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
    Create a `.env.local` file in the root directory. Add `NEXT_PUBLIC_APP_NAME`. For Fitbit integration, add `NEXT_PUBLIC_FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`, `NEXT_PUBLIC_FITBIT_REDIRECT_URI`. For push notifications (later), add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application should be available at `http://localhost:3000`.

5.  **Run Tests:**
    ```bash
    pnpm test
    ```
    (Requires Jest setup - completed)
    ```bash
    pnpm exec cypress open
    ```
    (Requires initial Cypress setup)

## 5. Contribution

Please refer to Section 19 of the [`Technical-Specification-and-Implementation-Guide.md`](./Technical-Specification-and-Implementation-Guide.md) for contribution guidelines. 