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
| Notifications | Web Push + service worker | Reminders |
| Testing | Jest + React Testing Library; Cypress E2E | Quality |
| CI/CD | GitHub Actions → Vercel | Auto deploy previews |

## 6  Project Structure (proposed)
```
/peakform
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
  tags: string[];  // e.g., ['core','plank'] or ['breakfast','lactose-free']
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
| Workout | 30 min prior | “PeakForm: Core session starts soon.” |

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
VITE_APP_NAME=PeakForm
VITE_PUSH_PUBLIC_KEY=…
```

## 17  Roadmap v1 → v2
| Version | Must‑haves | Nice‑to‑haves |
|---|---|---|
| **v1** | Onboard, planner, metrics chart, local storage, basic notifications | Export CSV, dark mode |
| **v2** | Account sync (Supabase), AI plan re‑generation (OpenAI API), coach chat | Wearable integration, social challenges |

## 18  Setup Scripts
```bash
pnpm create vite@latest peakform --template react-ts
cd peakform
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

