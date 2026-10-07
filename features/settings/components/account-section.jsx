'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { meApi } from '@/lib/api/endpoints';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { meKeys } from '@/lib/api/query-keys';

const schema = z.object({ name: z.string().trim().min(1, 'Enter your name').max(120) });

export function AccountSection({ user }) {
  const queryClient = useQueryClient();
  const { show } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: user.name ?? '' } });

  async function onSubmit(values) {
    try {
      const updated = await meApi.update(values);
      queryClient.setQueryData(meKeys.all, updated);
      reset({ name: updated.name ?? '' });
      show({ tone: 'success', title: 'Name updated' });
    } catch (err) {
      if (!applyFieldErrors(err, setError)) setError('name', { message: errorMessage(err) });
    }
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Account</h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 sm:max-w-md"
      >
        <Field
          label="Email"
          hint={user.authProvider === 'google' ? 'Signed in with Google' : undefined}
        >
          <Input value={user.email} readOnly disabled />
        </Field>
        <Field label="Name" error={errors.name?.message}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <div>
          <Button type="submit" variant="secondary" disabled={!isDirty} loading={isSubmitting}>
            Save name
          </Button>
        </div>
      </form>
    </Card>
  );
}
