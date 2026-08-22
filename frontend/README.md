# Timeliner — Frontend (Phase 2)

React (Vite) frontend for the Task Reminder app, wired to the Phase 1
Express/MongoDB API.

## 1. Setup

```bash
cd frontend
npm install
cp .env.example .env    # point VITE_API_BASE_URL at your running backend
npm run dev              # http://localhost:5173
```

Requires the Phase 1 backend running (default `http://localhost:5000/api`)
with `CLIENT_ORIGIN` in its `.env` set to `http://localhost:5173` so CORS and
the refresh-token cookie work.

`npm run build` produces a production build in `dist/`; `npm run preview`
serves it locally. Both were run against this codebase before delivery to
confirm it compiles and serves cleanly.

## 2. Stack

React 18 + Vite · React Router 6 · Redux Toolkit · Axios · Tailwind CSS ·
React Hook Form + Zod · date-fns · react-toastify · Recharts · lucide-react

## 3. Project structure

```
src/
├── components/
│   ├── layout/       # Navbar, Sidebar, AppLayout, AuthLayout
│   ├── auth/          # GoogleSignInButton, OrDivider
│   ├── tasks/           # TaskCard, TaskForm, FilterBar, KanbanBoard, TaskDetailModal
│   ├── reminders/         # ReminderForm, RecurrenceBuilder, ReminderList
│   ├── calendar/            # CalendarView (month grid)
│   └── common/                # Button, FormFields, Modal, Badge, EmptyState, Skeletons,
│                               # ProtectedRoute, ThemeToggle
├── pages/               # One component per route (incl. LeetCodePage)
├── redux/                # authSlice, taskSlice, reminderSlice, uiSlice, store
├── services/              # apiClient (axios + interceptors), authService, taskService, reminderService
├── hooks/                  # useAuth, useTheme
└── utils/                   # constants, dateHelpers, validationSchemas (Zod),
                              # toastHelpers, categoryColors
```

## 4. Auth flow (matches the backend exactly)

- Access token lives **only in Redux state** (never localStorage), attached
  to every request by `services/apiClient.js`'s request interceptor.
- The refresh token is an **httpOnly cookie** set by the backend — this app
  never reads or stores it directly (`withCredentials: true` on the Axios
  instance is what makes the browser send it automatically).
- On a `401`, the response interceptor calls `POST /auth/refresh-token`
  once, retries the original request with the new token, and queues any
  other requests that failed at the same moment so they don't each trigger
  their own refresh. If the refresh itself fails, Redux state is cleared and
  `ProtectedRoute` redirects to `/login`.
- `App.jsx` dispatches `restoreSession()` once on load so refreshing the
  page doesn't log you out as long as the refresh cookie is still valid.

### Google Sign-In

`components/auth/GoogleSignInButton.jsx` loads Google Identity Services
(`accounts.google.com/gsi/client`) and renders **Google's own button** —
this app never builds a custom "Sign in with Google" widget or talks to
Google's API directly. On success, GIS hands back a signed `credential` (an
ID token), which is dispatched via the `googleLogin` thunk to
`POST /auth/google`; the backend verifies it and returns the same
`{ user, accessToken }` shape as normal login, so everything downstream
(Redux state, `ProtectedRoute`, the refresh flow) treats it identically to a
password login.

If `VITE_GOOGLE_CLIENT_ID` isn't set, the button renders a disabled
placeholder instead of throwing — the app is fully usable with just
email/password in that case.

## 5. Design direction

The app leans into a **timetable / departure-board** reading of a task
planner: due dates and countdowns are set in monospace (IBM Plex Mono) the
way a schedule board sets its numerals, headings use a technical grotesk
(Space Grotesk), and body copy stays in a plain humanist sans (Inter). The
signature functional element is the countdown chip on each task — "2h left",
"Overdue · 3d" — color-coded the same way a departure board flags on-time vs.
final-call vs. delayed, implemented in `utils/dateHelpers.js#getUrgency`.

Color tokens (`src/index.css`) are CSS variables swapped by a `.dark` class
on `<html>`, so every Tailwind utility (`bg-surface`, `text-ink-muted`,
`border-border`, etc.) works in both themes without duplicated classes.
Theme preference is toggled via `ThemeToggle` (also in Settings), applied by
`hooks/useTheme.js`, and persisted to `localStorage` (safe here — this is a
real app running in the user's own browser, not an embedded artifact).

The palette itself leans into that transit-map idea with bold, distinct
hues rather than a single muted accent: an indigo `primary`, plus semantic
`urgent`/`warn`/`success`, plus a warm `flame` accent reserved for
streak/highlight moments (the LeetCode reminder, gradient buttons, the
brand mark). `utils/categoryColors.js` deterministically maps each
category/tag name to one of eight colors (hashed, so the same name always
gets the same color) — the same "color as identity" idea applied to a
user's own categories, the way different lines get their own color on a
transit map. Priority also gets a quick-scan left border stripe on each
`TaskCard`.

## 6. Where each spec requirement lives

| Requirement | Where |
|---|---|
| Login/Signup/Forgot/Reset password | `pages/LoginPage`, `SignupPage`, `ForgotPasswordPage`, `ResetPasswordPage` |
| Protected routes + token refresh | `components/common/ProtectedRoute.jsx`, `services/apiClient.js` |
| Task list with search/filter/sort | `pages/DashboardPage.jsx` + `components/tasks/FilterBar.jsx` |
| Task detail/edit with subtasks | `components/tasks/TaskDetailModal.jsx` + `TaskForm.jsx` |
| Reminder builder (offset/absolute, channel, recurrence) | `components/reminders/ReminderForm.jsx` + `RecurrenceBuilder.jsx` |
| Snooze / cancel reminder | `components/reminders/ReminderList.jsx` |
| Calendar view | `pages/CalendarPage.jsx` + `components/calendar/CalendarView.jsx` |
| Kanban board, drag-and-drop | `components/tasks/KanbanBoard.jsx` (native HTML5 DnD, no extra dependency) |
| Analytics dashboard | `pages/AnalyticsPage.jsx` (completion rate, streak, weekly chart via Recharts) |
| Soft delete / trash / undo | `pages/TrashPage.jsx` + `utils/toastHelpers.jsx`'s undo toast |
| Dark/light theme | `hooks/useTheme.js`, `components/common/ThemeToggle.jsx` |
| Profile & settings, phone OTP, notification prefs | `pages/SettingsPage.jsx` |
| Google Sign-In | `components/auth/GoogleSignInButton.jsx`, `redux/authSlice.js#googleLogin` |
| LeetCode daily reminder | `pages/LeetCodePage.jsx` (own page, linked from the navbar's right-side account menu and from a card in Settings) |
| Loading skeletons / empty states | `components/common/Skeletons.jsx`, `EmptyState.jsx` |
| Toast confirmations | `react-toastify`, wired inside the Redux thunks in `redux/*Slice.js` |

## 7. Google Sign-In and LeetCode reminder (post-Phase-2 additions)

Two features added after the original Phase 2 build, on request — neither
was in the original spec:

- **Google Sign-In** — see the "Google Sign-In" subsection under Auth flow
  above. Requires `VITE_GOOGLE_CLIENT_ID` in `.env` (see `.env.example`);
  degrades to a disabled placeholder button if unset.
- **LeetCode daily reminder** — now its own page, `pages/LeetCodePage.jsx`,
  reachable from the flame icon in the navbar's right-side account dropdown
  (next to "Profile & settings") and from a card at the bottom of Settings.
  It shows a live status hero (checks `GET /auth/leetcode-status` on load if
  a username is already saved) above the same username/enable/time/timezone
  settings that used to live inline in Settings — pulled out into their own
  page since the feature has real content of its own (a status you check
  in on), not just a preference to set once.

### A more colorful visual pass

The palette moved from a muted single-accent look to the bolder,
higher-saturation "transit map" system described in the Design direction
section above — indigo primary, vivid semantic colors, and the new `flame`
accent. Buttons, the navbar logo, and the auth pages picked up gradient/
color treatments (`.gradient-brand` in `index.css`, decorative blurred
blobs in `AuthLayout.jsx`), `TaskCard` got a priority-colored left border
and hashed per-category/tag chip colors (`utils/categoryColors.js`), the
sidebar's active item got a colored accent border, and the Analytics stat
cards/chart bar now each carry their own color instead of repeating the
same one.

## 8. What's deliberately out of scope

Consistent with Phase 1's scoping: Web Push notifications, PWA/offline
support, natural-language task entry, CSV/PDF export, and shared/
collaborative lists were left out as optional "great to have" extras rather
than core Phase 2 deliverables. The Reminder channel already reserves a
`'push'` value end to end if you want to add Web Push later.

## 9. A couple of small backend additions made along the way

While wiring this UI up to the Phase 1 API, three small gaps became
apparent and were closed in the backend (all documented in
`backend/README.md`'s changelog section too):

1. `PUT /api/tasks/:id` now accepts `subtasks` as a full array replace, so
   the checklist editor in `TaskForm.jsx` can add/remove items, not just
   toggle one via the existing single-subtask `PATCH` endpoint.
2. `Task.completedAt` is now set/cleared automatically with status changes,
   so `AnalyticsPage.jsx` has a real timestamp to chart instead of guessing
   from `updatedAt`.
3. `PUT /api/auth/profile` was added for `SettingsPage.jsx` to update name
   and notification preferences (phone changes still require OTP
   verification, unchanged).
