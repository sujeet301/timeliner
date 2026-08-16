// src/pages/SettingsPage.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { ShieldCheck, ShieldAlert, Code2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { Input, Toggle } from '../components/common/FormFields';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, updateLeetcodeSettings, setUser } from '../redux/authSlice';
import { authService } from '../services/authService';
import { profileSchema } from '../utils/validationSchemas';

function SectionCard({ title, description, children }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);

  // Phone verification sub-flow
  const [phone, setPhone] = useState(user?.phone || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);

  // LeetCode daily-reminder sub-flow
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [leetcodeUsername, setLeetcodeUsername] = useState(user?.leetcode?.username || '');
  const [leetcodeEnabled, setLeetcodeEnabled] = useState(user?.leetcode?.enabled || false);
  const [leetcodeTime, setLeetcodeTime] = useState(user?.leetcode?.reminderTime || '20:00');
  const [leetcodeTimezone, setLeetcodeTimezone] = useState(
    user?.leetcode?.timezone && user.leetcode.timezone !== 'UTC' ? user.leetcode.timezone : browserTimezone
  );
  const [savingLeetcode, setSavingLeetcode] = useState(false);
  const [checkingNow, setCheckingNow] = useState(false);
  const [leetcodeStatus, setLeetcodeStatus] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });

  const onSaveProfile = async (values) => {
    setSavingProfile(true);
    try {
      await dispatch(updateProfile({ name: values.name })).unwrap();
    } catch {
      // toast already shown
    } finally {
      setSavingProfile(false);
    }
  };

  const requestOtp = async () => {
    if (!phone.trim()) {
      toast.error('Enter a phone number first');
      return;
    }
    setPhoneBusy(true);
    try {
      await authService.requestOtp(phone.trim());
      setOtpSent(true);
      toast.success('Verification code sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send code');
    } finally {
      setPhoneBusy(false);
    }
  };

  const verifyOtpCode = async () => {
    if (!otp.trim()) return;
    setPhoneBusy(true);
    try {
      await authService.verifyOtp(otp.trim());
      dispatch(setUser({ ...user, phone, phoneVerified: true }));
      setOtpSent(false);
      setOtp('');
      toast.success('Phone number verified');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect code');
    } finally {
      setPhoneBusy(false);
    }
  };

  const setNotificationPref = async (channel, value) => {
    try {
      const result = await dispatch(
        updateProfile({ notificationPrefs: { ...user.notificationPrefs, [channel]: value } })
      ).unwrap();
      dispatch(setUser(result));
    } catch {
      // toast already shown
    }
  };

  const saveLeetcodeSettings = async () => {
    setSavingLeetcode(true);
    try {
      await dispatch(
        updateLeetcodeSettings({
          username: leetcodeUsername.trim() || null,
          enabled: leetcodeEnabled,
          reminderTime: leetcodeTime,
          timezone: leetcodeTimezone,
        })
      ).unwrap();
    } catch {
      // toast already shown
    } finally {
      setSavingLeetcode(false);
    }
  };

  const checkLeetcodeNow = async () => {
    if (!leetcodeUsername.trim()) {
      toast.error('Enter a LeetCode username first');
      return;
    }
    setCheckingNow(true);
    setLeetcodeStatus(null);
    try {
      // Make sure the backend is checking against whatever's currently in
      // the form, not a stale saved username, before asking for status.
      await dispatch(
        updateLeetcodeSettings({ username: leetcodeUsername.trim(), timezone: leetcodeTimezone })
      ).unwrap();
      const { data } = await authService.getLeetcodeStatus();
      setLeetcodeStatus(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not check LeetCode status');
    } finally {
      setCheckingNow(false);
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-ink-muted">Manage your profile, contact info, and preferences.</p>
      </div>

      <SectionCard title="Profile">
        <form onSubmit={handleSubmit(onSaveProfile)} className="flex flex-col gap-4">
          <Input label="Name" id="name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" id="email" value={user?.email || ''} disabled className="opacity-60" />
          {user?.hasGoogleAuth && (
            <Badge tone="primary" className="w-fit">
              Linked to Google
            </Badge>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={savingProfile}>
              Save changes
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Phone number"
        description="Verifying a number lets you receive SMS reminders."
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <Input
              label="Phone"
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setOtpSent(false);
              }}
              className="flex-1"
            />
            <Button variant="secondary" onClick={requestOtp} loading={phoneBusy}>
              {otpSent ? 'Resend code' : 'Send code'}
            </Button>
          </div>

          {user?.phoneVerified && phone === user.phone ? (
            <Badge tone="success" className="w-fit">
              <ShieldCheck size={12} className="mr-1 inline" /> Verified
            </Badge>
          ) : (
            <Badge tone="warn" className="w-fit">
              <ShieldAlert size={12} className="mr-1 inline" /> Not verified
            </Badge>
          )}

          {otpSent && (
            <div className="flex items-end gap-2">
              <Input
                label="Verification code"
                id="otp"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-40"
              />
              <Button onClick={verifyOtpCode} loading={phoneBusy}>
                Verify
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Notifications" description="Choose how reminders reach you by default.">
        <div className="flex flex-col gap-3">
          <Toggle
            checked={user?.notificationPrefs?.email ?? true}
            onChange={(v) => setNotificationPref('email', v)}
            label="Email reminders"
          />
          <Toggle
            checked={user?.notificationPrefs?.sms ?? false}
            onChange={(v) => setNotificationPref('sms', v)}
            label="SMS reminders"
          />
          {!user?.phoneVerified && (
            <p className="text-xs text-ink-muted">Verify a phone number above to enable SMS reminders.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="LeetCode daily reminder"
        description="Nudges you by email/SMS if you haven't solved a problem yet today."
      >
        <div className="flex flex-col gap-4">
          <Toggle checked={leetcodeEnabled} onChange={setLeetcodeEnabled} label="Enable daily reminder" />

          <Input
            label="LeetCode username"
            id="leetcodeUsername"
            placeholder="e.g. johndoe123"
            value={leetcodeUsername}
            onChange={(e) => {
              setLeetcodeUsername(e.target.value);
              setLeetcodeStatus(null);
            }}
            hint="Must be a public LeetCode profile"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Remind me at"
              id="leetcodeTime"
              type="time"
              value={leetcodeTime}
              onChange={(e) => setLeetcodeTime(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="leetcodeTimezone" className="text-sm font-medium text-ink">
                Timezone
              </label>
              <div className="flex gap-1.5">
                <input
                  id="leetcodeTimezone"
                  value={leetcodeTimezone}
                  onChange={(e) => setLeetcodeTimezone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => setLeetcodeTimezone(browserTimezone)}
                className="self-start text-xs text-primary hover:underline"
              >
                Use my current timezone ({browserTimezone})
              </button>
            </div>
          </div>

          {!user?.notificationPrefs?.email && !(user?.notificationPrefs?.sms && user?.phoneVerified) && (
            <p className="text-xs text-warn">
              Turn on Email or verified SMS reminders above so this reminder has a way to reach you.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={checkLeetcodeNow} loading={checkingNow}>
              <Code2 size={14} /> Check now
            </Button>
            <Button onClick={saveLeetcodeSettings} loading={savingLeetcode}>
              Save
            </Button>
            {leetcodeStatus && (
              <Badge tone={leetcodeStatus.solvedToday ? 'success' : 'warn'}>
                {leetcodeStatus.solvedToday ? (
                  <>
                    <CheckCircle2 size={12} className="mr-1 inline" /> Already solved today
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} className="mr-1 inline" /> Nothing solved yet today
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Appearance">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink">Theme</span>
          <ThemeToggle />
        </div>
      </SectionCard>
    </div>
  );
}
