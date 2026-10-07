'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { loginInputSchema } from '@/contracts/auth';
import { authApi } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { postAuthRoute, useAuthActions } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { useGuestRedirect } from '../hooks/use-guest-redirect';
import { GoogleButton } from './google-button';
import { OrDivider } from './or-divider';

export function LoginForm() {
  const router = useRouter();
  const next = useGuestRedirect();
  const { signIn } = useAuthActions();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  function finish(body) {
    signIn(body);
    router.replace(postAuthRoute(body.user, next));
  }

  async function onSubmit(values) {
    try {
      finish(await authApi.login(values));
    } catch (err) {
      if (applyFieldErrors(err, setError)) return;
      const message =
        err instanceof ApiError && err.code === 'UNAUTHORIZED'
          ? 'Invalid email or password.'
          : errorMessage(err);
      setError('root', { message });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-fg-muted">Sign in to continue your interview practice.</p>
      </div>

      {env.googleClientId ? (
        <>
          <GoogleButton onSuccess={finish} text="signin_with" />
          <OrDivider />
        </>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {errors.root ? <Alert tone="danger">{errors.root.message}</Alert> : null}
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-fg-muted">
        New here?{' '}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
          className="font-medium text-accent hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
