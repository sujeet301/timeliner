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
│   ├── tasks/         # TaskCard, TaskForm, FilterBar, KanbanBoard, TaskDetailModal
│   ├── reminders/      # ReminderForm, RecurrenceBuilder, ReminderList
│   ├── calendar/        # CalendarView (month grid)
│   └── common/           # Button, FormFields, Modal, Badge, EmptyState, Skeletons,
│                          # ProtectedRoute, ThemeToggle
├── pages/               # One component per route
├── redux/                # authSlice, taskSlice, reminderSlice, uiSlice, store
├── services/              # apiClient (axios + interceptors), authService, taskService, reminderService
├── hooks/                  # useAuth, useTheme
└── utils/                   # constants, dateHelpers, validationSchemas (Zod), toastHelpers
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
| Loading skeletons / empty states | `components/common/Skeletons.jsx`, `EmptyState.jsx` |
| Toast confirmations | `react-toastify`, wired inside the Redux thunks in `redux/*Slice.js` |

## 7. What's deliberately out of scope

Consistent with Phase 1's scoping: Web Push notifications, PWA/offline
support, natural-language task entry, CSV/PDF export, and shared/
collaborative lists were left out as optional "great to have" extras rather
than core Phase 2 deliverables. The Reminder channel already reserves a
`'push'` value end to end if you want to add Web Push later.

## 8. A couple of small backend additions made along the way

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
