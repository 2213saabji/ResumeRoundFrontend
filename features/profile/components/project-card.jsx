'use client';

import { Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SCALE_SIGNALS_MAX, SKILL_TAGS_MAX } from '@/contracts/limits';
import { firstErrorMessage } from '../form-utils';
import { ChipInput } from './chip-input';

/**
 * One editable project from the resume.
 * @param {{ index: number, control: any, register: any, errors: any, onRemove: () => void }} props
 */
export function ProjectCard({ index, control, register, errors, onRemove }) {
  const e = errors?.projects?.[index];
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Field label="Project name" error={e?.name?.message} className="flex-1">
          <Input {...register(`projects.${index}.name`)} />
        </Field>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="mt-7 text-danger"
          aria-label={`Remove project ${index + 1}`}
        >
          Remove
        </Button>
      </div>
      <Field
        label="What it does and your part in it"
        optional
        error={e?.description?.message}
        hint="The interviewer uses this to ground its first questions."
      >
        <Textarea rows={3} {...register(`projects.${index}.description`)} />
      </Field>
      <Controller
        control={control}
        name={`projects.${index}.technologies`}
        render={({ field }) => (
          <ChipInput
            label="Technologies"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            maxItems={SKILL_TAGS_MAX}
            error={firstErrorMessage(e?.technologies)}
          />
        )}
      />
      <Controller
        control={control}
        name={`projects.${index}.scaleSignals`}
        render={({ field }) => (
          <ChipInput
            label="Scale signals"
            hint='Numbers that show scale, e.g. "2000 RPS", "5M users", "40 TB".'
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            maxItems={SCALE_SIGNALS_MAX}
            maxLength={200}
            error={firstErrorMessage(e?.scaleSignals)}
          />
        )}
      />
    </li>
  );
}
