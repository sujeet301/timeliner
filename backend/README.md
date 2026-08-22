# Task Reminder — Backend (Phase 1)

Node.js + Express + MongoDB backend for a full-stack Todo / Task Reminder app.
Handles auth, task CRUD, and a background scheduler that sends email/SMS
reminders on a fully configurable schedule (one-time or recurring).

## 1. Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in real values, see below
npm run dev             # starts with nodemon on http://localhost:5000
# or: npm start
```

Requires Node 18+ and a running MongoDB instance (local or Atlas).

### Environment variables

See `.env.example` for the full list with comments. The app **will refuse to
start** if `MONGO_URI`, `JWT_ACCESS_SECRET`, or `JWT_REFRESH_SECRET` are
missing — everything else has a sane default or degrades gracefully:

- If SMTP credentials aren't set, `emailService` logs emails to the console
  instead of sending them (handy for local dev).
- If Twilio credentials aren't set, `smsService` does the same for SMS.

This means you can run the whole app, including the scheduler, with **zero**
external provider setup — you'll just see reminders printed to the console
instead of actually delivered.

## 2. Project structure

```
backend/
├── config/          # env loading + DB connection
├── models/          # Mongoose schemas: User, Task, Reminder
├── controllers/      # request handlers
├── routes/           # Express routers + express-validator rules
├── middleware/        # auth guard, validation, centralized error handling
├── services/
│   ├── emailService.js             # Nodemailer wrapper
│   ├── smsService.js               # Twilio wrapper
│   ├── schedulerService.js         # the task-reminder cron job
│   ├── leetcodeService.js          # LeetCode public GraphQL API wrapper
│   └── leetcodeReminderService.js  # the LeetCode daily-check cron job
├── utils/
│   ├── recurrence.js        # pure date-math for repeat rules & offsets
│   ├── timezone.js          # timezone-aware day/time helpers (LeetCode reminder)
│   ├── generateTokens.js    # JWT access/refresh helpers
│   └── ApiError.js
└── server.js
```

## 3. Auth model

- **Access token**: short-lived JWT (default 15m), returned in the JSON body
  and sent by the client as `Authorization: Bearer <token>`.
- **Refresh token**: longer-lived JWT (default 7d), set as an **httpOnly,
  sameSite=strict** cookie scoped to `/api/auth` — never exposed to
  JavaScript in the browser. A hash of the current valid refresh token is
  also stored on the `User` document so `logout` and token rotation can
  actually revoke it, not just rely on the JWT expiring naturally.
- `POST /api/auth/refresh-token` reads that cookie and issues a new pair
  (this endpoint isn't in the original spec's list but is required to make
  the described short-lived-access/long-lived-refresh flow actually work end
  to end — the frontend should call it from an Axios response interceptor
  whenever a request comes back `401`).

### Google Sign-In

`POST /api/auth/google` accepts `{ credential }` — the signed ID token JWT
that Google Identity Services' "Sign in with Google" button hands back on
the frontend. The backend verifies it against Google's public keys and its
own `GOOGLE_CLIENT_ID` via `google-auth-library` (`controllers/authController.js#googleLogin`)
— it never trusts a name/email/picture the client claims on its own, only
what Google's signature vouches for. From there:

- No existing user with that Google ID or email → a new account is created,
  pre-verified (`isVerified: true`, since Google already confirmed the
  email) and with no password.
- An existing email/password account with a matching email → it's linked
  (`googleId` set on the existing document) rather than creating a
  duplicate account. That user can then sign in with either method.

`User.password` is only required when `googleId` is absent (see the schema's
conditional `required`), and `comparePassword` safely returns `false` rather
than throwing for a Google-only account with no password hash to compare
against.

If `GOOGLE_CLIENT_ID` isn't set, the endpoint responds `501 Not configured`
instead of the whole server refusing to boot — Google sign-in is optional.

## 4. Deploying frontend and backend on separate domains

If your frontend and backend are deployed as two separate services (e.g.
two Render/Vercel/Netlify apps, each with their own domain) — as opposed to
one serving the other from the same origin — there are two things that
**must** both be correct, or login will appear to work but the refresh
token will silently never function (session dies after the access token's
15-minute lifetime, or on any page reload):

1. **`CLIENT_ORIGIN`** on the backend must exactly match the frontend's
   deployed origin (scheme + host, no trailing slash) — e.g.
   `CLIENT_ORIGIN=https://your-frontend.onrender.com`. It accepts a
   comma-separated list if you have more than one (prod + a preview URL).
   A mismatch here causes the browser to block the request entirely with a
   CORS error, before your app code ever sees it.
2. **The refresh-token cookie's `SameSite`/`Secure` attributes**
   (`utils/generateTokens.js`) are set based on `NODE_ENV`:
   `SameSite=None; Secure` in production, `SameSite=Lax` (no `Secure`) in
   development. This matters because a cookie set with `SameSite=Strict`
   or `Lax` is **never sent back on a cross-site request** — the browser
   will happily store it, but silently drop it from every future request to
   a different origin. That looks exactly like "the refresh token doesn't
   exist": login still succeeds (the access token comes back in the JSON
   body, independent of cookies), so the app feels like it's working right
   up until the access token expires or the page reloads, at which point
   `POST /auth/refresh-token` 401s forever. `SameSite=None` requires
   `Secure`, which in turn requires HTTPS — true automatically on Render's
   `*.onrender.com` domains, so this "just works" as long as `NODE_ENV=production`
   is set on the deployed backend (most PaaS providers set this
   automatically, but it's worth double-checking).

If you ever see `POST /api/auth/refresh-token` returning 401 in the browser
console right after a successful login, check these two things first.

## 5. The reminder scheduler — how it works

This is the core piece of the assignment, so it's worth spelling out.

**`services/schedulerService.js`** starts a `node-cron` job (interval set by
`REMINDER_CRON_EXPRESSION`, default every minute). Each tick:

1. **Finds due reminders**: `Reminder.find({ status: 'pending', nextTriggerAt: { $lte: now } })`.
   A compound index on `{ status, nextTriggerAt }` keeps this cheap.
2. **Sends** each one through its configured channel(s) (`email`, `sms`, or
   `both`) via `emailService` / `smsService`. Channels are attempted
   independently, so `both` still sends the email half even if the SMS half
   fails (e.g. bad phone number).
3. **Reschedules or resolves**:
   - Send succeeded, `repeat.type === 'none'` → `status = 'sent'`.
   - Send succeeded, recurring → `utils/recurrence.js#computeNextTrigger`
     works out the next `nextTriggerAt` (handling daily/weekly/monthly/custom
     intervals, specific weekdays, and month-end clamping). If the rule has
     an `endDate` and the next occurrence would be past it, the reminder is
     resolved to `sent` instead of being rescheduled again.
   - Send failed → `attempts` is incremented; once it hits
     `REMINDER_MAX_ATTEMPTS` the reminder is marked `failed` and stops
     retrying, otherwise it's left `pending` at the same `nextTriggerAt` so
     the next cron tick retries it automatically.

**Multiple offsets per task** (e.g. "1 day before" + "1 hour before") are
just two separate `Reminder` documents pointing at the same `task`, each with
its own `offset: { amount, unit }`. When a reminder is created with an
`offset` instead of an explicit `scheduledTime`, `utils/recurrence.js#applyOffset`
subtracts that offset from the task's `dueDate` to compute the initial
`scheduledTime` / `nextTriggerAt`.

**Snoozing** (`PATCH /api/reminders/:id/snooze`) simply moves `nextTriggerAt`
forward (by `minutes` or to an explicit `until` time) and resets `status` to
`pending` — the scheduler picks it up again automatically next tick.

> **Scaling note**: this uses a single-process `node-cron` job, which is the
> right amount of complexity for this project size. If you ever run multiple
> backend instances behind a load balancer, swap this for
> [Agenda.js](https://github.com/agenda/agenda) (MongoDB-backed job queue,
> mentioned as an alternative in the spec) so only one instance claims each
> job.

## 6. The LeetCode daily reminder — how it works

A separate, smaller cron job (`services/leetcodeReminderService.js`, interval
set by `LEETCODE_REMINDER_CRON_EXPRESSION`, default every 15 minutes — a
once-a-day nudge doesn't need per-minute precision like task reminders do).
Each tick, for every user with `leetcode.enabled: true` and a
`leetcode.username` set:

1. **Skip if already handled today** — `leetcode.lastReminderSentDate` is
   compared against today's date *in that user's own timezone*
   (`utils/timezone.js`, built on `date-fns-tz`), so the job can safely run
   every 15 minutes without re-checking or re-notifying someone who's
   already been handled.
2. **Skip if it's not yet their reminder time** — compares the current
   wall-clock time in their timezone against `leetcode.reminderTime`
   (`"HH:mm"`, 24h).
3. **Otherwise, ask `services/leetcodeService.js`** whether the user has any
   *accepted* submission on LeetCode since local midnight today. This calls
   LeetCode's public (unauthenticated) GraphQL endpoint — the same one
   LeetCode's own site uses for a profile's "Recent AC" list — so it works
   for any public username with no API key.
   - **Solved something today** → mark today as handled. No notification;
     nothing else happens until tomorrow.
   - **Solved nothing yet** → send a nudge through `emailService`/`smsService`
     (the exact same delivery functions the task-reminder scheduler uses),
     respecting the user's `notificationPrefs`, then mark today as handled
     either way so a delivery failure doesn't retry every 15 minutes.
   - **The LeetCode API call itself fails** (bad username, network hiccup,
     LeetCode changing their unofficial schema) → treated as "couldn't
     verify" and simply retried next tick. It deliberately does **not** mark
     the day as handled and does **not** send a false-negative reminder.

`GET /api/auth/leetcode-status` is a read-only "check now" the Settings page
uses so a user can confirm their username is correct and see today's status
immediately, without waiting for the next tick — it never sends a
notification or touches `lastReminderSentDate`.

> This feature relies on an **unofficial** LeetCode API and a public
> profile. It isn't something LeetCode documents or guarantees, so treat it
> as best-effort — if LeetCode changes that endpoint, `leetcodeService.js`
> is the one place that would need updating.

## 7. API overview

All routes are prefixed with `/api`. Protected routes require
`Authorization: Bearer <accessToken>`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Log in |
| POST | `/auth/google` | Sign in / register with a Google ID token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/refresh-token` | Rotate access/refresh tokens |
| GET | `/auth/me` | Current user |
| PUT | `/auth/profile` | Update name and/or notification preferences |
| POST | `/auth/forgot-password` | Email a reset link |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/request-otp` | Send phone verification OTP |
| POST | `/auth/verify-otp` | Confirm phone OTP |
| PUT | `/auth/leetcode-settings` | Configure the daily LeetCode reminder |
| GET | `/auth/leetcode-status` | "Check now" — has the user solved anything today? |
| GET | `/tasks` | List tasks — `?search=&status=&priority=&category=&tag=&sortBy=&order=&page=&limit=` |
| GET | `/tasks/trash` | List soft-deleted tasks |
| POST | `/tasks` | Create task |
| GET | `/tasks/:id` | Get one task |
| PUT | `/tasks/:id` | Update task |
| PATCH | `/tasks/:id/status` | Update status only |
| PATCH | `/tasks/:id/subtasks/:subtaskId` | Toggle/edit a subtask |
| DELETE | `/tasks/:id` | Soft delete (moves to trash) |
| PATCH | `/tasks/:id/restore` | Restore from trash |
| DELETE | `/tasks/:id/permanent` | Permanently delete |
| GET | `/tasks/:id/reminders` | List reminders for a task |
| POST | `/tasks/:id/reminders` | Create a reminder (offset- or time-based) |
| PUT | `/reminders/:id` | Update a reminder |
| DELETE | `/reminders/:id` | Cancel a reminder |
| PATCH | `/reminders/:id/snooze` | Snooze — `{ minutes }` or `{ until }` |

Import `postman_collection.json` into Postman for ready-to-run requests
against every endpoint (it uses `{{baseUrl}}` and `{{accessToken}}`
variables — the collection's test scripts on Signup/Login auto-populate
`accessToken` for you).

### Changes made while building the Phase 2 frontend

A few small, additive gaps surfaced once the UI needed to actually drive
every feature end to end. All are backwards compatible:

- **`PUT /api/tasks/:id` now also accepts `subtasks`** (a full array
  replace), so the frontend can add/remove checklist items, not just toggle
  an existing one via `PATCH /:id/subtasks/:subtaskId`.
- **`Task.completedAt`** is now set automatically whenever `status` becomes
  `'completed'` (and cleared if moved back), giving the Analytics page real
  completion timestamps instead of approximating from `updatedAt`.
- **`PUT /api/auth/profile`** was added so the Settings page can update
  `name` and `notificationPrefs`. Phone number changes intentionally still
  only happen through `request-otp` / `verify-otp`, so a number is never
  trusted for SMS reminders without verification — and requesting an OTP for
  a *different* number now correctly resets `phoneVerified` to `false` until
  the new number is confirmed.

### Google Sign-In and LeetCode reminder (post-Phase-2 additions)

Neither of these was in the original brief — they were added afterward on
request. Both are fully additive and don't change any existing behavior:

- **`POST /api/auth/google`**, `User.googleId`, and a conditionally-required
  `User.password` (see "Google Sign-In" above).
- **`PUT /api/auth/leetcode-settings`**, **`GET /api/auth/leetcode-status`**,
  the `User.leetcode` subdocument, and the new
  `services/leetcodeService.js` / `services/leetcodeReminderService.js` /
  `utils/timezone.js` (see "The LeetCode daily reminder" above).
- New dependencies: `google-auth-library`, `date-fns-tz`.
- New env vars: `GOOGLE_CLIENT_ID`, `LEETCODE_REMINDER_CRON_EXPRESSION`.

## 8. Security measures in place

- Passwords hashed with bcrypt (cost factor 12), never stored/returned in plaintext.
- `helmet` for standard security headers, `cors` restricted to `CLIENT_ORIGIN`.
- `express-rate-limit` — a strict limiter on auth routes, a looser one on the rest of `/api`.
- `express-validator` on every route that accepts a body/params.
- `express-mongo-sanitize` strips `$`/`.` keys from input to prevent NoSQL injection.
- All secrets read from `.env`, never hard-coded; the app fails fast at boot if critical ones are missing.
- Centralized error handler normalizes Mongoose cast/validation/duplicate-key errors into clean 400/409 responses and never leaks stack traces outside development.
- Google credentials are verified server-side against Google's public keys and a fixed `audience` (our `GOOGLE_CLIENT_ID`) — a forged or mismatched-audience token is rejected before any account is touched.

## 9. What's deliberately out of scope for Phase 1

Per the brief, these "great to have" items are frontend-heavy or clearly
optional extras and were left for a later pass so Phase 1 stays focused and
production-quality rather than broad and shallow:

- Web Push notifications (the `Reminder.channel` enum already reserves a
  `'push'` value and `schedulerService.js` has a clearly marked spot to wire
  in `web-push` when you're ready).
- Calendar/Kanban views, dashboard charts, natural-language task entry,
  PWA/offline support, shared/collaborative lists — all frontend (Phase 2)
  concerns; Calendar, Kanban, and dashboard charts were in fact built in
  Phase 2 (see `frontend/README.md`), and the API already supports what the
  remaining ones would need (search/filter/sort/pagination, tags, priority,
  subtasks, soft delete).

CSV/PDF export, PWA support, and Web Push were started but paused mid-build
in favor of Google Sign-In and the LeetCode reminder above — happy to pick
those back up next.
