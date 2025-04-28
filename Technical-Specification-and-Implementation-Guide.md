# Plank You Very Much – Technical Specification & Implementation Guide

**Version:** 0.9   **Date:** 2025‑04‑27   **Author:** ChatGPT (initial draft for Shay)

---

## 1  Purpose & Vision
Design a React (+ TypeScript) web app that acts as an AI‑assisted personal trainer helping Shay (45 yo) lower body‑fat from 14 %→11 % while preserving back health and enabling climbing & swimming. The app should provide adaptive weekly plans, habit nudges, progress dashboards and integrate seamlessly with Shay’s daily routine and available equipment.

## 2  App Name & Tagline
**Plank You Very Much** – “Climb higher, dive stronger, live leaner.”

_(Alternatives:_ **AquaCrux**, **LeanPeak**, **CoreClimber**.)

## 3  Target Users
- **Primary:** Shay (busy scientist, moderate tech savvy, back issues, lactose sensitive).
- **Secondary:** Similar adults 35‑55 seeking fat‑loss + muscle gain with sport‑specific focuses.

## 4  High‑Level Features
1. **On‑boarding assessment** (height, weight‑scale metrics, injury flags).
2. **Goal engine** – set fat‑loss target & timeline; auto‑computes daily kcal/protein.
3. **Dynamic week planner** – blends climbing, swimming, core, recovery; auto‑adapts.
4. **Equipment cues** – standing‑desk prompts, balance‑board meeting timer, stealth core mini‑games.
5. **Nutrition tracker** – simple log, macro progress rings, lactose flag reminders.
6. **Progress dash** – trend charts for weight, BF %, workouts done vs. planned.
7. **Knowledge cards** – short tips on back‑safe form, mobility, meal ideas.
8. **Notifications** – browser/PWA push for workout, hydration, posture.
9. **Data export** – CSV/JSON of logs for physician/coach.
10. **Exercise Media Library** – embedded GIF/short‑video demos for every movement with voice‑over cues.
11. **Meal Gallery** – swipeable images & quick‑prep video snippets showing lactose‑free meal options with macro overlay.
12. **Wearable Sync (Fitbit)** – pulls daily steps, HR, sleep & calorie burn via Fitbit Web API to refine plan and progress.

## 5  Tech Stack & Tooling
| Layer | Choice | Rationale |
|---|---|---|
| App | **React 18 + TypeScript** | Robust SPA ecosystem |
| Styling | **Tailwind CSS** | Utility‑first, quick theming |
| Charts | **Recharts** | Lightweight SVG charts |
| State | **Zustand** | Minimal, scalable store |
| Forms | **React‑Hook‑Form** | Type‑safe validation |
| Date | **Day.js** | Small footprint |
| Persistence | **IndexedDB via idb** | Offline PWA support |
| Notifications | Web Push + service worker |
| Integrations | **Fitbit Web API (OAuth 2.0)** | Sync activity / sleep data | | Reminders |
| Testing | Jest + React Testing Library; Cypress E2E | Quality |
| CI/CD | GitHub Actions → Vercel | Auto deploy previews |

## 6  Project Structure (proposed)
```
/plankyou
  ├─ public/
  ├─ media/            # exercise & meal images / videos
  ├─ src/
  │   ├─ assets/
  │   ├─ components/
  │   ├─ features/
  │   │   ├─ onboarding/
  │   │   ├─ planner/
  │   │   ├─ nutrition/
  │   │   ├─ progress/
  │   │   ├─ knowledge/
  │   │   └─ media/     # ExerciseVideo, MealGallery components
  │   ├─ hooks/
  │   ├─ lib/
  │   ├─ store/
  │   ├─ pages/
  │   ├─ router/
  │   ├─ serviceWorker.ts
  │   └─ index.tsx
  ├─ tests/
  └─ .github/workflows/
```

## 7  Data Models (TypeScript)
```ts
export interface BodyMetrics {
  date: string;  // ISO
  weightKg: number;
  bodyFatPct: number;
  muscleMassKg: number;
  visceralRating: number;
}

export interface Workout {
  id: string;
  type: 'CLIMB' | 'SWIM' | 'CORE' | 'STRENGTH' | 'REST';
  plannedAt: string;
  durationMin: number;
  completed?: boolean;
  mediaIds?: string[]; // attach demo videos
}

export interface Meal {
  id: string;
  timestamp: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  lactoseFree: boolean;
  mediaIds?: string[]; // link to image/video recipe
}

export interface MediaAsset {
  id: string;
  type: 'IMAGE' | 'GIF' | 'VIDEO';
  url: string;
  thumbnail?: string;
  description?: string;
  tags: string[];
}

export interface FitbitDaily {
  date: string; // yyyy‑MM‑dd
  steps: number;
  restingHeartRate?: number;
  caloriesOut: number;
  sleepMinutes?: number;
}
```

## 8  Core Algorithms
1. **BMR (Harris‑Benedict)** → TDEE multiplier.
2. **Calorie deficit** = TDEE – 300.
3. **Protein target** = 1.6 g × LBM.
4. **Weekly planner** algorithm:
   - Required: ≥2 climb, ≥2 swim, ≥2 core, ≤1 rest.
   - Auto‑place sessions respecting user busy blocks (calendar API placeholder).
   - If back‑pain flag high → reduce climb intensity, add mobility session.

## 8A  Fitbit Integration – Technical Flow
To ingest Fitbit data you’ll implement the **OAuth 2.0 authorization code** grant and daily‑sync micro‑service.

1. **Register the app** at <https://dev.fitbit.com> → Manage Apps.
   • Callback: `${VITE_FITBIT_REDIRECT_URI}` (e.g., `https://plankyou.app/oauth/fitbit/callback`).
   • Save `client_id`, generate `client_secret` (store only in serverless function).
2. **Frontend flow (`/connect-fitbit`)**
   ```ts
   const FITBIT_AUTH_URL =
     `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${env.VITE_FITBIT_CLIENT_ID}&scope=activity%20heartrate%20sleep%20nutrition&redirect_uri=${encodeURIComponent(env.VITE_FITBIT_REDIRECT_URI)}`;
   window.location.href = FITBIT_AUTH_URL;
   ```
3. **Callback handler (edge function)**
   ```ts
   POST https://api.fitbit.com/oauth2/token
   grant_type=authorization_code&code=XXX&client_id=...&redirect_uri=...
   ```
   Store `access_token` (8 h) & `refresh_token` (30 d) encrypted in DB.
4. **Daily job** pulls `/activities/date/{date}.json`, `/sleep/date/{date}.json`, etc., transforms to `FitbitDaily` model, updates store, auto‑tunes calorie targets.
5. **Token refresh** with `refresh_token`; handle 401 by revoking & prompting reconnect.

_Libraries:_ `simple-oauth2` (server), `useSWR` (client).

_Security:_ keep `client_secret` server‑side; consider PKCE.

---

## 9  Routing Map
```
/           → Dashboard
/onboard    → Multi‑step form
/planner    → Weekly view (drag‑&‑drop)
/nutrition  → Meal log & suggestions
/knowledge  → Tip cards library
/settings   → Profile, reminders, data export
```

## 10  Component Tree (excerpt)
- `<App>`
  - `<Header />`
  - `<Sidebar />`
  - `<Routes>`
    - `<Dashboard />`
      - `<MetricCards />`
      - `<ProgressChart />`
      - `<TodayWorkout />`
    - `<Planner />`
      - `<Calendar />`
      - `<WorkoutModal />`
    - …

## 11  Notifications & Reminders
| Trigger | Default Time | Message example |
|---|---|---|
| Stand‑up cue | 45 min inactivity | “Time to stand and stretch.” |
| Balance board | 10 min before long meeting | “Hop on the board for posture points.” |
| Workout | 30 min prior | “Plank You Very Much: Core session starts soon.” |

Service worker schedules push via `NotificationAPI`; fallback to email.

## 12  Accessibility & UX
- WCAG 2.2 AA colors, keyboard‑navigable.
- Font scaling with `rem`.
- Alt text & ARIA labels.

## 13  Testing Strategy
- **Unit:** util functions & stores (Jest).
- **Component:** edge/empty states.
- **E2E:** critical flows – onboard → plan generation → mark workout done.
- **Lighthouse CI** performance & a11y budget.

## 14  CI/CD Pipeline
1. Lint & type‑check.
2. Run Jest + Cypress (headless).
3. Build → Preview → Deploy on `main`.
4. Deploy previews for PRs.

## 15  PWA & Offline
- `workbox` for precaching shell.
- IndexedDB sync queue when offline.
- Install prompt after 3 visits.

## 16  Environment Config
```
VITE_APP_NAME=PlankYouVeryMuch
VITE_PUSH_PUBLIC_KEY=…
VITE_FITBIT_CLIENT_ID=…
VITE_FITBIT_REDIRECT_URI=https://app.example.com/oauth/fitbit/callback
```

## 17  Roadmap v1 → v2
| Version | Must‑haves | Nice‑to‑haves |
|---|---|---|
| **v1.0** | Onboard, planner, metrics chart, local storage, basic notifications | Dark mode |
| **v1.1** | **Fitbit integration**, auto‑adjust calorie targets | Apple Health bridge |
| **v2.0** | Supabase sync, AI plan re‑generation (OpenAI API), coach chat | Social challenges, Garmin support | |

## 18  Setup Scripts
```bash
pnpm create vite@latest plankyou --template react-ts
cd plankyou
pnpm add tailwindcss zustand react-hook-form recharts dayjs idb
pnpm dlx tailwindcss init -p
```

## 19  Contribution Guide (for future agent)
1. Fork → branch naming `feat/<scope>`.
2. Keep PRs <300 LOC, include tests.
3. Run `pnpm format` before commit.
4. Describe decision context in PR body.

## 20  Success Metrics
- Weekly adherence rate ≥ 80 %.
- BF % drops 0.3‑0.5 pp / wk.
- Self‑reported back‑pain severity ↓ 1 point in 8 wks.

---
_End of spec. Iterate via issues on GitHub._

