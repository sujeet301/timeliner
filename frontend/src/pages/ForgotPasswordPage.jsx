// src/pages/ForgotPasswordPage.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import { Input } from '../components/common/FormFields';
import Button from '../components/common/Button';
import { authService } from '../services/authService';
import { forgotPasswordSchema } from '../utils/validationSchemas';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async ({ email }) => {
    setSubmitting(true);
    try {
      await authService.forgotPassword(email);
    } finally {
      setSubmitting(false);
      setSent(true); // shown regardless, matching the backend's non-enumerating response
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
            <MailCheck size={20} />
          </span>
          <p className="text-sm text-ink-muted">
            If an account exists for that email, we&apos;ve sent a link to reset your password.
          </p>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Back to log in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a reset link">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Email" id="email" type="email" error={errors.email?.message} {...register('email')} />
        <Button type="submit" className="w-full" loading={submitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-muted">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthLayout>
  );
}
