'use client';

import { RadioCardGroup } from '@/components/ui/radio-card-group';
import { COMPANY_TYPES, LABELS, LEVELS, TARGET_ROLES } from '@/contracts/enums';

const ROLE_HINTS = {
  backend: 'APIs, databases, distributed systems',
  frontend: 'Rendering, performance, browser APIs',
  fullstack: 'End to end: UI, API and data',
};

const LEVEL_HINTS = {
  sde1: '0-2 years',
  sde2: '2-5 years',
  senior: '5+ years',
  staff: 'Architecture and org-wide impact',
};

const COMPANY_HINTS = {
  startup: 'Breadth, shipping fast, ownership',
  product: 'Depth on product systems',
  faang_style: 'Publicly reported big-tech patterns',
  service: 'Fundamentals and delivery',
};

/**
 * Target role, level and company type as radio cards. Field names: targetRole (or `roleName`),
 * level, companyType.
 *
 * @param {{
 *   register: import('react-hook-form').UseFormRegister<any>,
 *   errors: Record<string, any>,
 *   values: { role?: string, level?: string, companyType?: string },
 *   roleName?: string,
 * }} props
 */
export function TargetJobFields({ register, errors, values, roleName = 'targetRole' }) {
  return (
    <div className="flex flex-col gap-8">
      <RadioCardGroup
        legend="Target role"
        columns={3}
        inputProps={register(roleName)}
        value={values.role}
        error={errors[roleName]?.message}
        options={TARGET_ROLES.map((v) => ({
          value: v,
          label: LABELS.targetRole[v],
          description: ROLE_HINTS[v],
        }))}
      />
      <RadioCardGroup
        legend="Level"
        columns={4}
        inputProps={register('level')}
        value={values.level}
        error={errors.level?.message}
        options={LEVELS.map((v) => ({
          value: v,
          label: LABELS.level[v],
          description: LEVEL_HINTS[v],
        }))}
      />
      <RadioCardGroup
        legend="Company type"
        columns={4}
        inputProps={register('companyType')}
        value={values.companyType}
        error={errors.companyType?.message}
        options={COMPANY_TYPES.map((v) => ({
          value: v,
          label: LABELS.companyType[v],
          description: COMPANY_HINTS[v],
        }))}
      />
    </div>
  );
}
