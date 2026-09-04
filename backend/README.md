# Task Reminder — Backend

Node.js + Express + MongoDB backend: auth (email/password + Google), task
CRUD, task reminders (email/SMS, recurring), and a LeetCode daily-practice
reminder.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in real values — see comments in the file
npm run dev             # http://localhost:5000
```

Works with zero external provider setup: if SMTP/Twilio/Google credentials
aren't set, those features degrade gracefully (emails/SMS log to the
console; Google sign-in shows "not configured").

## Deploying frontend and backend on separate domains

Set `CLIENT_ORIGIN` to your exact deployed frontend origin (comma-separate
multiple), and make sure `NODE_ENV=production` is set — the refresh-token
cookie uses `SameSite=None; Secure` in production (required for cross-origin
cookies) and `SameSite=Lax` in dev. See `utils/generateTokens.js`.

## The LeetCode daily reminder

`services/leetcodeReminderService.js` runs every `LEETCODE_REMINDER_CRON_EXPRESSION`
(default 15 min) and, for each user with `leetcode.enabled`:

1. Resets today's dedup bookkeeping (`handledTimesToday`) if the calendar day
   (in the user's timezone) has changed since `lastHandledDate`.
2. Skips entirely if `leetcode.activeDays` is set and today isn't in it.
3. Finds which of `leetcode.reminderTimes` (an array — supports multiple
   nudges per day) are currently due and not yet handled today.
4. If any are due, checks once (via LeetCode's public GraphQL API,
   `services/leetcodeService.js`) whether the user has solved anything since
   local midnight. Not solved → emails/texts a nudge that includes today's
   LeetCode Daily Challenge (`fetchDailyChallenge`, cached 1h). Either way,
   all due slots are marked handled so they don't refire today.

`GET /api/auth/leetcode-status` (used by the "Check now" button on
`LeetCodePage.jsx`) returns solved-today status, current/longest streak
(computed from LeetCode's `submissionCalendar` via `utils/leetcodeStats.js`),
solved-by-difficulty counts, the 5 most recent solves, and today's Daily
Challenge — the streak/stats/challenge/recent-solves parts degrade
gracefully to null/empty if their individual API calls fail, while the core
solved-today check is required to succeed.

`PUT /api/auth/leetcode-settings` updates `username`, `enabled`,
`reminderTimes` (array of `"HH:mm"`), `activeDays` (array of 0=Sun..6=Sat,
empty = every day), and `timezone`.

## API overview

Auth: `POST /auth/signup`, `/login`, `/google`, `/logout`, `/refresh-token`,
`GET /me`, `PUT /profile`, `POST /forgot-password`, `/reset-password`,
`/request-otp`, `/verify-otp`, `PUT /leetcode-settings`, `GET /leetcode-status`.

Tasks: full CRUD under `/tasks` (search/filter/sort/pagination, subtasks,
soft delete/trash/restore) plus nested `/tasks/:id/reminders`.

Reminders: `PUT /reminders/:id`, `DELETE /reminders/:id`,
`PATCH /reminders/:id/snooze`.

## Notes

This is an unofficial-API integration (LeetCode doesn't publish/guarantee
this GraphQL endpoint), so `services/leetcodeService.js` is the one place
that would need updating if LeetCode changes their schema.
