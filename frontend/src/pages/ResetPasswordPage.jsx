// src/pages/ResetPasswordPage.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import AuthLayout from '../components/layout/AuthLayout';
import { Input } from '../components/common/FormFields';
import Button from '../components/common/Button';
import { authService } from '../services/authService';
import { resetPasswordSchema } from '../utils/validationSchemas';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async ({ password }) => {
    setSubmitting(true);
    try {
      await authService.resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'That reset link is invalid or has expired');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <p className="text-center text-sm text-ink-muted">
          This password reset link is missing its token. Please request a new one.
        </p>
        <Link to="/forgot-password" className="mt-4 block text-center text-sm font-medium text-primary hover:underline">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 size={20} />
          </span>
          <p className="text-sm text-ink-muted">Your password has been reset. Please log in again.</p>
          <Button onClick={() => navigate('/login')} className="mt-2 w-full">
            Go to login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="New password"
          id="password"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          id="confirmPassword"
          type="password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
