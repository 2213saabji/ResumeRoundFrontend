import { SKILL_BUCKETS } from '@/contracts/enums';

/** Form defaults from the API profile (nulls become editable empty values). */
export function profileToForm(profile, fallbackLevel) {
  return {
    experienceYears: profile.experienceYears ?? 0,
    seniority: profile.seniority ?? fallbackLevel ?? undefined,
    domain: profile.domain ?? '',
    skills: Object.fromEntries(SKILL_BUCKETS.map((b) => [b, profile.skills?.[b] ?? []])),
    projects: (profile.projects ?? []).map((p) => ({
      name: p.name ?? '',
      technologies: p.technologies ?? [],
      description: p.description ?? '',
      scaleSignals: p.scaleSignals ?? [],
    })),
  };
}

/**
 * PATCH body with only the top-level sections the user changed. Each section sent replaces the
 * stored one, so changed sections are sent in full (skills: all five lists).
 * @param {Record<string, any>} values parsed form values
 * @param {Record<string, any>} dirtyFields react-hook-form formState.dirtyFields
 */
export function buildProfilePatch(values, dirtyFields) {
  const patch = {};
  for (const key of ['experienceYears', 'seniority', 'domain', 'skills', 'projects']) {
    if (dirtyFields[key]) patch[key] = values[key];
  }
  return patch;
}

/** First error message found anywhere inside a nested RHF error object. */
export function firstErrorMessage(error) {
  if (!error) return undefined;
  if (typeof error.message === 'string' && error.message) return error.message;
  if (typeof error === 'object') {
    for (const value of Object.values(error)) {
      const m = value && typeof value === 'object' ? firstErrorMessage(value) : undefined;
      if (m) return m;
    }
  }
  return undefined;
}
