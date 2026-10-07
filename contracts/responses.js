import { authResponseSchema, meResponseSchema } from './auth';
import {
  interviewResponseSchema,
  joinResponseSchema,
  progressResponseSchema,
  reportResponseSchema,
  turnsPageSchema,
} from './interview';
import { profileResponseSchema } from './profile';
import { resumeResponseSchema } from './resume';

/**
 * Response schemas by name. Loaded only in development and tests (see lib/api/contract.js),
 * so production bundles do not include them.
 */
export const responseSchemas = {
  auth: authResponseSchema,
  me: meResponseSchema,
  resume: resumeResponseSchema,
  profile: profileResponseSchema,
  interview: interviewResponseSchema,
  turnsPage: turnsPageSchema,
  join: joinResponseSchema,
  report: reportResponseSchema,
  progress: progressResponseSchema,
};
