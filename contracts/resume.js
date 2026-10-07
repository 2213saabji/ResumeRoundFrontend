import { z } from 'zod';

export const RESUME_STATUSES = /** @type {const} */ (['uploaded', 'parsing', 'ready', 'failed']);

export const resumeSchema = z.object({
  id: z.string(),
  status: z.enum(RESUME_STATUSES),
  originalName: z.string().nullable().optional(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  profileId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  parsedAt: z.string().nullable(),
});

export const resumeResponseSchema = z.object({ resume: resumeSchema });
