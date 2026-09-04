// src/pages/SettingsPage.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Flame, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { Input, Toggle } from '../components/common/FormFields';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, setUser } from '../redux/authSlice';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);

  const [phone, setPhone] = useState(user?.phone || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
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
    if (!phone.trim()) { toast.error('Enter a phone number first'); return; }
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
      const result = await dispatch(updateProfile({ notificationPrefs: { ...user.notificationPrefs, [channel]: value } })).unwrap();
      dispatch(setUser(result));
    } catch {
      // toast already shown
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
          {user?.hasGoogleAuth && <Badge tone="primary" className="w-fit">Linked to Google</Badge>}
          <div className="flex justify-end">
            <Button type="submit" loading={savingProfile}>Save changes</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Phone number" description="Verifying a number lets you receive SMS reminders.">
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <Input label="Phone" id="phone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setOtpSent(false); }} className="flex-1" />
            <Button variant="secondary" onClick={requestOtp} loading={phoneBusy}>{otpSent ? 'Resend code' : 'Send code'}</Button>
          </div>

          {user?.phoneVerified && phone === user.phone ? (
            <Badge tone="success" className="w-fit"><ShieldCheck size={12} className="mr-1 inline" /> Verified</Badge>
          ) : (
            <Badge tone="warn" className="w-fit"><ShieldAlert size={12} className="mr-1 inline" /> Not verified</Badge>
          )}

          {otpSent && (
            <div className="flex flex-wrap items-end gap-2">
              <Input label="Verification code" id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="w-28 sm:w-40" />
              <Button onClick={verifyOtpCode} loading={phoneBusy}>Verify</Button>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Notifications" description="Choose how reminders reach you by default.">
        <div className="flex flex-col gap-3">
          <Toggle checked={user?.notificationPrefs?.email ?? true} onChange={(v) => setNotificationPref('email', v)} label="Email reminders" />
          <Toggle checked={user?.notificationPrefs?.sms ?? false} onChange={(v) => setNotificationPref('sms', v)} label="SMS reminders" />
          {!user?.phoneVerified && <p className="text-xs text-ink-muted">Verify a phone number above to enable SMS reminders.</p>}
        </div>
      </SectionCard>

      <button
        onClick={() => navigate('/leetcode')}
        className="flex w-full items-center justify-between gap-3 rounded-card border border-border bg-gradient-to-r from-flame-soft to-surface p-4 text-left shadow-card transition-shadow hover:shadow-popover sm:p-5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flame-soft text-flame">
            <Flame size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-semibold text-ink">LeetCode daily reminder</h2>
            <p className="truncate text-sm text-ink-muted">
              {user?.leetcode?.enabled ? `On \u00b7 reminds you at ${user.leetcode.reminderTimes?.[0] || '20:00'}` : 'Off \u00b7 set a username and turn it on'}
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink-muted" />
      </button>

      <SectionCard title="Appearance">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink">Theme</span>
          <ThemeToggle />
        </div>
      </SectionCard>
    </div>
  );
}
