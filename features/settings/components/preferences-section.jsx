'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { TargetJobFields } from '@/components/forms/target-job-fields';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { onboardingInputSchema } from '@/contracts/auth';
import { meApi } from '@/lib/api/endpoints';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { meKeys } from '@/lib/api/query-keys';

/** Default target role, level and company type for new interviews. */
export function PreferencesSection({ user }) {
  const queryClient = useQueryClient();
  const { show } = useToast();
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(onboardingInputSchema),
    defaultValues: {
      targetRole: user.targetRole,
      level: user.level,
      companyType: user.companyType,
    },
  });
  const [targetRole, level, companyType] = useWatch({
    control,
    name: ['targetRole', 'level', 'companyType'],
  });

  async function onSubmit(values) {
    try {
      const updated = await meApi.update(values);
      queryClient.setQueryData(meKeys.all, updated);
      reset({
        targetRole: updated.targetRole,
        level: updated.level,
        companyType: updated.companyType,
      });
      show({ tone: 'success', title: 'Preferences saved' });
    } catch (err) {
      if (!applyFieldErrors(err, setError)) setError('root', { message: errorMessage(err) });
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Interview preferences</h2>
      <p className="mb-6 text-sm text-fg-muted">
        Defaults for new interviews. You can still change them per interview.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        {errors.root ? <Alert tone="danger">{errors.root.message}</Alert> : null}
        <TargetJobFields
          register={register}
          errors={errors}
          values={{ role: targetRole, level, companyType }}
        />
        <div>
          <Button type="submit" variant="secondary" disabled={!isDirty} loading={isSubmitting}>
            Save preferences
          </Button>
        </div>
      </form>
    </Card>
  );
}
