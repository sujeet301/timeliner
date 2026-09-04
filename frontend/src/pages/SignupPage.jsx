// src/pages/SignupPage.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import AuthLayout from '../components/layout/AuthLayout';
import { Input } from '../components/common/FormFields';
import Button from '../components/common/Button';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import OrDivider from '../components/auth/OrDivider';
import { signup } from '../redux/authSlice';
import { signupSchema } from '../utils/validationSchemas';

export default function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, accessToken } = useSelector((s) => s.auth);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(signupSchema) });

  useEffect(() => {
    if (accessToken) navigate('/', { replace: true });
  }, [accessToken, navigate]);

  const onSubmit = (values) => {
    const payload = { ...values };
    if (!payload.phone) delete payload.phone;
    dispatch(signup(payload));
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start staying on top of things">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Name" id="name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input label="Email" id="email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone (optional)" id="phone" type="tel" hint="Needed later if you want SMS reminders" error={errors.phone?.message} {...register('phone')} />
        <Input label="Password" id="password" type="password" autoComplete="new-password" hint="At least 8 characters" error={errors.password?.message} {...register('password')} />
        {error && <p className="text-sm text-urgent">{error}</p>}
        <Button type="submit" className="w-full" loading={status === 'loading'}>Create account</Button>
      </form>

      <OrDivider />
      <GoogleSignInButton />

      <p className="mt-5 text-center text-sm text-ink-muted">
        Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
