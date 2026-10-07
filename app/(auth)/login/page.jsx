import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
