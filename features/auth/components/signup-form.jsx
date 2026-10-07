'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { registerInputSchema } from '@/contracts/auth';
import { authApi } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { postAuthRoute, useAuthActions } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { useGuestRedirect } from '../hooks/use-guest-redirect';
import { GoogleButton } from './google-button';
import { OrDivider } from './or-divider';

export function SignupForm() {
  const router = useRouter();
  const next = useGuestRedirect();
  const { signIn } = useAuthActions();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerInputSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  function finish(body) {
    signIn(body);
    router.replace(postAuthRoute(body.user, next));
  }

  async function onSubmit(values) {
    try {
      finish(await authApi.register(values));
    } catch (err) {
      if (applyFieldErrors(err, setError)) return;
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        setError('email', {
          message: 'An account with this email already exists. Sign in instead.',
        });
        return;
      }
      setError('root', { message: errorMessage(err) });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-fg-muted">
          Practice interviews built from your own resume and projects.
        </p>
      </div>

      {env.googleClientId ? (
        <>
          <GoogleButton onSuccess={finish} text="signup_with" />
          <OrDivider />
        </>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {errors.root ? <Alert tone="danger">{errors.root.message}</Alert> : null}
        <Field label="Name" optional error={errors.name?.message}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label="Password" hint="At least 8 characters." error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-medium text-accent hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
