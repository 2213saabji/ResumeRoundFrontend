import { z } from 'zod';
import { LEVELS } from './enums';
import { PROJECTS_MAX, SCALE_SIGNALS_MAX, SKILL_TAGS_MAX, SKILL_TAG_MAX } from './limits';

// Mirrors backend src/modules/profiles/schemas.ts (updateProfileSchema).

const tag = z
  .string()
  .trim()
  .min(1)
  .max(SKILL_TAG_MAX, `Keep tags under ${SKILL_TAG_MAX} characters`);
const tags = z.array(tag).max(SKILL_TAGS_MAX, `At most ${SKILL_TAGS_MAX} items`);

export const skillsSchema = z.object({
  languages: tags,
  frameworks: tags,
  databases: tags,
  cloud: tags,
  architecture: tags,
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(200),
  technologies: tags,
  description: z.string().trim().max(2000, 'Keep the description under 2000 characters'),
  scaleSignals: z
    .array(z.string().trim().min(1).max(200))
    .max(SCALE_SIGNALS_MAX, `At most ${SCALE_SIGNALS_MAX} items`),
});

export const profileSchema = z.object({
  id: z.string(),
  resumeId: z.string().nullable().optional(),
  experienceYears: z.number().nullable(),
  seniority: z.enum(LEVELS).nullable(),
  domain: z.string().nullable(),
  skills: skillsSchema,
  projects: z.array(projectSchema),
  editedByUser: z.boolean(),
  updatedAt: z.string().optional(),
});

export const profileResponseSchema = z.object({ profile: profileSchema });

/** Form schema for the review screen; the PATCH body is derived from it. */
export const profileFormSchema = z.object({
  experienceYears: z.coerce
    .number({ error: 'Enter a number' })
    .min(0, 'Must be 0 or more')
    .max(50, 'Must be 50 or less'),
  seniority: z.enum(LEVELS, 'Pick a seniority'),
  domain: z
    .string()
    .trim()
    .max(100, 'Keep it under 100 characters')
    .transform((v) => v || null)
    .nullable(),
  skills: skillsSchema,
  projects: z.array(projectSchema).max(PROJECTS_MAX, `At most ${PROJECTS_MAX} projects`),
});
