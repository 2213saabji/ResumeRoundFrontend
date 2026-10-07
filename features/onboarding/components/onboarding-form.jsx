'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { TargetJobFields } from '@/components/forms/target-job-fields';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { onboardingInputSchema } from '@/contracts/auth';
import { meApi } from '@/lib/api/endpoints';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { meKeys } from '@/lib/api/query-keys';
import { useCurrentUser } from '@/lib/auth/session';

export function OnboardingForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(onboardingInputSchema),
    defaultValues: {
      targetRole: user?.targetRole ?? undefined,
      level: user?.level ?? undefined,
      companyType: user?.companyType ?? undefined,
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
      router.replace('/resume');
    } catch (err) {
      if (!applyFieldErrors(err, setError)) setError('root', { message: errorMessage(err) });
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Step 1 of 3"
        title={
          user?.name
            ? `Hi ${user.name}, what are you preparing for?`
            : 'What are you preparing for?'
        }
        description="Your interview plan, question difficulty and scoring all follow these choices. You can change them later in Settings."
      />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
          {errors.root ? <Alert tone="danger">{errors.root.message}</Alert> : null}
          <TargetJobFields
            register={register}
            errors={errors}
            values={{ role: targetRole, level, companyType }}
          />
          <div className="flex justify-end border-t border-border pt-6">
            <Button type="submit" size="lg" loading={isSubmitting}>
              Continue to resume upload
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
