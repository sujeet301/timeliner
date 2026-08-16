// src/pages/LoginPage.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import AuthLayout from '../components/layout/AuthLayout';
import { Input } from '../components/common/FormFields';
import Button from '../components/common/Button';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import OrDivider from '../components/auth/OrDivider';
import { login } from '../redux/authSlice';
import { loginSchema } from '../utils/validationSchemas';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, accessToken } = useSelector((s) => s.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (accessToken) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  }, [accessToken, navigate, location]);

  const onSubmit = (values) => dispatch(login(values));

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to Timeliner">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Email" id="email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {error && <p className="text-sm text-urgent">{error}</p>}
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={status === 'loading'}>
          Log in
        </Button>
      </form>

      <OrDivider />
      <GoogleSignInButton />

      <p className="mt-5 text-center text-sm text-ink-muted">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
