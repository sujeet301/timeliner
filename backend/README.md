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
│   ├── emailService.js      # Nodemailer wrapper
│   ├── smsService.js        # Twilio wrapper
│   └── schedulerService.js  # the reminder cron job (see below)
├── utils/
│   ├── recurrence.js        # pure date-math for repeat rules & offsets
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

## 4. The reminder scheduler — how it works

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

## 5. API overview

All routes are prefixed with `/api`. Protected routes require
`Authorization: Bearer <accessToken>`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Log in |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/refresh-token` | Rotate access/refresh tokens |
| GET | `/auth/me` | Current user |
| PUT | `/auth/profile` | Update name and/or notification preferences |
| POST | `/auth/forgot-password` | Email a reset link |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/request-otp` | Send phone verification OTP |
| POST | `/auth/verify-otp` | Confirm phone OTP |
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

## 6. Security measures in place

- Passwords hashed with bcrypt (cost factor 12), never stored/returned in plaintext.
- `helmet` for standard security headers, `cors` restricted to `CLIENT_ORIGIN`.
- `express-rate-limit` — a strict limiter on auth routes, a looser one on the rest of `/api`.
- `express-validator` on every route that accepts a body/params.
- `express-mongo-sanitize` strips `$`/`.` keys from input to prevent NoSQL injection.
- All secrets read from `.env`, never hard-coded; the app fails fast at boot if critical ones are missing.
- Centralized error handler normalizes Mongoose cast/validation/duplicate-key errors into clean 400/409 responses and never leaks stack traces outside development.

## 7. What's deliberately out of scope for Phase 1

Per the brief, these "great to have" items are frontend-heavy or clearly
optional extras and were left for a later pass so Phase 1 stays focused and
production-quality rather than broad and shallow:

- Web Push notifications (the `Reminder.channel` enum already reserves a
  `'push'` value and `schedulerService.js` has a clearly marked spot to wire
  in `web-push` when you're ready).
- Calendar/Kanban views, dashboard charts, CSV/PDF export, natural-language
  task entry, PWA/offline support, shared/collaborative lists — all frontend
  (Phase 2) concerns, though the API already supports what they'd need
  (search/filter/sort/pagination, tags, priority, subtasks, soft delete).

Let me know if you'd like any of these pulled into Phase 1 before we move on
to Phase 2 (frontend).
