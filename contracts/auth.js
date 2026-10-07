import { z } from 'zod';
import { COMPANY_TYPES, LEVELS, TARGET_ROLES } from './enums';

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  role: z.string(),
  authProvider: z.string(),
  targetRole: z.enum(TARGET_ROLES).nullable(),
  level: z.enum(LEVELS).nullable(),
  companyType: z.enum(COMPANY_TYPES).nullable(),
  onboarded: z.boolean(),
  createdAt: z.string(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  expiresIn: z.number(),
});

export const meResponseSchema = z.object({ user: userSchema });

// Request schemas mirror backend src/modules/auth/schemas.ts and users/schemas.ts.

export const loginInputSchema = z.object({
  email: z.email('Enter a valid email address').max(254),
  password: z.string().min(1, 'Enter your password').max(128),
});

export const registerInputSchema = z.object({
  name: z
    .string()
    .trim()
    .max(120)
    .transform((v) => v || undefined)
    .optional(),
  email: z.email('Enter a valid email address').max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const onboardingInputSchema = z.object({
  targetRole: z.enum(TARGET_ROLES, 'Pick a target role'),
  level: z.enum(LEVELS, 'Pick your level'),
  companyType: z.enum(COMPANY_TYPES, 'Pick a company type'),
});

export const updateMeInputSchema = onboardingInputSchema
  .extend({ name: z.string().trim().min(1).max(120) })
  .partial();
