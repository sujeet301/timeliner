// src/pages/LeetCodePage.jsx
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { Flame, CheckCircle2, AlertCircle, Code2, ExternalLink, BellOff } from 'lucide-react';
import { Input, Toggle } from '../components/common/FormFields';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { LineSkeleton } from '../components/common/Skeletons';
import ReminderTimesEditor from '../components/leetcode/ReminderTimesEditor';
import ActiveDaysPicker from '../components/leetcode/ActiveDaysPicker';
import StatsSummary from '../components/leetcode/StatsSummary';
import DailyChallengeCard from '../components/leetcode/DailyChallengeCard';
import RecentSolvesList from '../components/leetcode/RecentSolvesList';
import { useAuth } from '../hooks/useAuth';
import { updateLeetcodeSettings } from '../redux/authSlice';
import { authService } from '../services/authService';

export default function LeetCodePage() {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [username, setUsername] = useState(user?.leetcode?.username || '');
  const [enabled, setEnabled] = useState(user?.leetcode?.enabled || false);
  const [times, setTimes] = useState(user?.leetcode?.reminderTimes?.length ? user.leetcode.reminderTimes : ['20:00']);
  const [activeDays, setActiveDays] = useState(user?.leetcode?.activeDays || []);
  const [timezone, setTimezone] = useState(
    user?.leetcode?.timezone && user.leetcode.timezone !== 'UTC' ? user.leetcode.timezone : browserTimezone
  );

  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);

  const hasReachableChannel = Boolean(user?.notificationPrefs?.email) || Boolean(user?.notificationPrefs?.sms && user?.phoneVerified);

  const checkNow = async (opts = {}) => {
    const usernameToCheck = username.trim();
    if (!usernameToCheck) return;
    setChecking(true);
    setStatusError(null);
    try {
      if (!opts.skipSave) {
        await dispatch(updateLeetcodeSettings({ username: usernameToCheck, timezone })).unwrap();
      }
      const { data } = await authService.getLeetcodeStatus();
      setStatus(data.data);
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Could not check LeetCode status');
      setStatus(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (user?.leetcode?.username) checkNow({ skipSave: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await dispatch(
        updateLeetcodeSettings({
          username: username.trim() || null,
          enabled,
          reminderTimes: times,
          activeDays,
          timezone,
        })
      ).unwrap();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  const handleCheckClick = () => {
    if (!username.trim()) { toast.error('Enter a LeetCode username first'); return; }
    checkNow();
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <Flame className="text-flame" size={24} />
          LeetCode reminder
        </h1>
        <p className="text-sm text-ink-muted">A daily nudge if you haven&apos;t solved anything yet — don&apos;t break the streak.</p>
      </div>

      {/* Status hero */}
      <div className={`rounded-card border p-6 shadow-card ${status?.solvedToday ? 'border-success/30 bg-success-soft' : status ? 'border-flame/30 bg-flame-soft' : 'border-border bg-surface'}`}>
        {checking && !status ? (
          <div className="flex flex-col gap-2">
            <LineSkeleton className="h-6 w-2/3" />
            <LineSkeleton className="h-4 w-1/2" />
          </div>
        ) : !user?.leetcode?.username && !username ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-flame-soft text-flame"><Code2 size={22} /></span>
            <p className="font-display text-base font-semibold text-ink">Add your LeetCode username</p>
            <p className="max-w-xs text-sm text-ink-muted">Set it up below and I&apos;ll keep an eye on whether you&apos;ve solved anything today.</p>
          </div>
        ) : statusError ? (
          <div className="flex items-center gap-3">
            <AlertCircle className="shrink-0 text-urgent" size={22} />
            <div>
              <p className="font-medium text-ink">Couldn&apos;t check LeetCode</p>
              <p className="text-sm text-ink-muted">{statusError}</p>
            </div>
          </div>
        ) : status ? (
          <div className="flex items-center gap-4">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${status.solvedToday ? 'bg-success-soft text-success' : 'bg-flame-soft text-flame'}`}>
              {status.solvedToday ? <CheckCircle2 size={28} /> : <Flame size={28} />}
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-ink">{status.solvedToday ? "You've solved one today \ud83c\udf89" : 'Nothing solved yet today'}</p>
              <p className="text-sm text-ink-muted">
                {status.solvedToday
                  ? "You're all set — no reminder needed."
                  : enabled
                    ? `I'll remind you at ${times[0]} (${timezone}) if that's still the case.`
                    : 'Turn the reminder on below to get nudged automatically.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2 text-ink-muted">
            <BellOff size={20} />
            <p className="text-sm">Click &ldquo;Check now&rdquo; to see today&apos;s status.</p>
          </div>
        )}
      </div>

      {/* Stats + Daily Challenge + Recent solves — only once we have a successful check */}
      {status && (
        <>
          <StatsSummary currentStreak={status.currentStreak} longestStreak={status.longestStreak} solvedByDifficulty={status.solvedByDifficulty} />
          <DailyChallengeCard challenge={status.dailyChallenge} />
          {status.recentSolves?.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-2 font-display text-sm font-semibold text-ink">Recent solves</h2>
              <RecentSolvesList solves={status.recentSolves} />
            </div>
          )}
        </>
      )}

      {/* Settings */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <h2 className="font-display text-base font-semibold text-ink">Settings</h2>
        <div className="mt-4 flex flex-col gap-4">
          <Toggle checked={enabled} onChange={setEnabled} label="Enable daily reminder" />

          <Input
            label="LeetCode username"
            id="leetcodeUsername"
            placeholder="e.g. johndoe123"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setStatus(null); setStatusError(null); }}
            hint="Must be a public LeetCode profile"
          />

          <ReminderTimesEditor times={times} onChange={setTimes} />
          <ActiveDaysPicker activeDays={activeDays} onChange={setActiveDays} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="leetcodeTimezone" className="text-sm font-medium text-ink">Timezone</label>
            <input
              id="leetcodeTimezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="button" onClick={() => setTimezone(browserTimezone)} className="self-start break-words text-left text-xs text-primary hover:underline">
              Use my current timezone ({browserTimezone})
            </button>
          </div>

          {!hasReachableChannel && (
            <p className="text-xs text-warn">Turn on Email or verified SMS reminders in Settings so this reminder has a way to reach you.</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button variant="secondary" onClick={handleCheckClick} loading={checking}>
              <Code2 size={14} /> Check now
            </Button>
            <Button onClick={saveSettings} loading={saving}>Save</Button>
            {username.trim() && (
              <a href={`https://leetcode.com/${username.trim()}/`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted hover:text-primary">
                View profile <ExternalLink size={12} />
              </a>
            )}
          </div>

          {status && (
            <Badge tone={status.solvedToday ? 'success' : 'flame'} className="w-fit">
              {status.solvedToday ? 'Solved today' : 'Not solved yet'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
