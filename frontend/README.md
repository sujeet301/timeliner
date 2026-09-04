# Timeliner — Frontend

React (Vite) frontend for the Task Reminder API.

## Setup

```bash
cd frontend
npm install
cp .env.example .env    # point VITE_API_BASE_URL at your backend
npm run dev              # http://localhost:5173
```

## Stack

React 18 + Vite · React Router 6 · Redux Toolkit · Axios · Tailwind CSS ·
React Hook Form + Zod · date-fns · react-toastify · Recharts · lucide-react

## Design

A "timetable / transit line map" palette — bold, distinct hues (indigo
primary, vivid semantic colors, a warm `flame` accent for streaks) rather
than a single muted accent. `utils/categoryColors.js` hashes each
category/tag name to a consistent color. Dark/light via a `.dark` class on
`<html>` swapping CSS variables in `index.css`.

## Auth

Access token lives only in Redux (never localStorage); the refresh token is
an httpOnly cookie the app never touches directly. `services/apiClient.js`
attaches the token and silently retries once through `/auth/refresh-token`
on a 401. Google Sign-In (`components/auth/GoogleSignInButton.jsx`) uses
real Google Identity Services and measures its own container width via
`ResizeObserver` (no hardcoded pixel width, so it doesn't overflow on
mobile).

## LeetCode reminder

`pages/LeetCodePage.jsx` — reachable from the flame icon in the navbar's
account dropdown, or the card at the bottom of Settings. Composes:

- `components/leetcode/StatsSummary.jsx` — current/longest streak, solved
  counts by difficulty
- `components/leetcode/DailyChallengeCard.jsx` — today's LeetCode Daily
  Challenge with a direct link
- `components/leetcode/RecentSolvesList.jsx` — last 5 accepted submissions
- `components/leetcode/ReminderTimesEditor.jsx` — add/remove multiple daily
  reminder times
- `components/leetcode/ActiveDaysPicker.jsx` — restrict checks to specific
  weekdays (empty = every day)

"Check now" hits `GET /auth/leetcode-status` for an immediate read of all of
the above without waiting for the backend's periodic check.

## Mobile

Tested down to ~320px: two-column grids stack under `sm:`, flex children
that hold text have `min-w-0` (a common Flexbox trap — without it, long
text overflows its container instead of wrapping), and a custom `xs: 400px`
Tailwind breakpoint collapses button labels to icon-only on the narrowest
phones. `overflow-x: hidden` on `html`/`body` is a defensive backstop.
