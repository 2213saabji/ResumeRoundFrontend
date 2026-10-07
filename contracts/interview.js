import { z } from 'zod';
import {
  COMPANY_TYPES,
  INTERVIEW_DURATIONS,
  INTERVIEW_MODES,
  LEVELS,
  SCORE_DIMENSIONS,
  TARGET_ROLES,
} from './enums';
import { ANSWER_MAX_CHARS } from './limits';

export const INTERVIEW_STATUSES = /** @type {const} */ ([
  'created',
  'in_progress',
  'ended',
  'abandoned',
]);

export const planItemSchema = z.object({
  kind: z.string(),
  topic: z.string(),
  technologies: z.array(z.string()).optional().default([]),
  projectName: z.string().nullable().optional(),
  startDifficulty: z.number(),
  timeBudgetSec: z.number(),
  isCoreDeepDive: z.boolean().optional(),
});

export const interviewSchema = z.object({
  id: z.string(),
  status: z.enum(INTERVIEW_STATUSES),
  mode: z.enum(INTERVIEW_MODES),
  role: z.enum(TARGET_ROLES),
  level: z.enum(LEVELS),
  companyType: z.enum(COMPANY_TYPES),
  durationSec: z.number(),
  plan: z.array(planItemSchema),
  state: z
    .object({
      phase: z.string().optional(),
      currentObjectiveIdx: z.number().optional(),
      difficulty: z.number().optional(),
      questionsAsked: z.number().optional(),
    })
    .loose()
    .optional(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const interviewResponseSchema = z.object({ interview: interviewSchema });

export const createInterviewInputSchema = z.object({
  role: z.enum(TARGET_ROLES, 'Pick a role'),
  level: z.enum(LEVELS, 'Pick a level'),
  companyType: z.enum(COMPANY_TYPES, 'Pick a company type'),
  durationMin: z.coerce
    .number()
    .refine((v) => INTERVIEW_DURATIONS.includes(/** @type {any} */ (v)), 'Pick a duration'),
  mode: z.enum(INTERVIEW_MODES),
});

export const turnSchema = z
  .object({
    seq: z.number(),
    objectiveIdx: z.number().optional(),
    questionText: z.string(),
    answerText: z.string().nullable().optional(),
    evaluation: z.unknown().nullable().optional(),
    decision: z.unknown().nullable().optional(),
    askedAt: z.string().nullable().optional(),
    answeredAt: z.string().nullable().optional(),
  })
  .loose();

export const turnsPageSchema = z.object({
  items: z.array(turnSchema),
  nextCursor: z.string().nullable(),
});

export const textAnswerInputSchema = z.object({
  answerText: z
    .string()
    .trim()
    .min(1, 'Type an answer first')
    .max(ANSWER_MAX_CHARS, `Keep answers under ${ANSWER_MAX_CHARS} characters`),
});

/**
 * POST /interviews/:id/join (MVP-4). The exact contract is still to be shared by the backend;
 * this accepts the documented fields and tolerates extras.
 */
export const joinResponseSchema = z
  .object({
    janusUrl: z.union([z.string(), z.array(z.string())]),
    roomId: z.union([z.number(), z.string()]),
    token: z.string().optional(),
    pin: z.string().optional(),
    textRoomId: z.union([z.number(), z.string()]).optional(),
    iceServers: z
      .array(
        z.object({
          urls: z.union([z.string(), z.array(z.string())]),
          username: z.string().optional(),
          credential: z.string().optional(),
        }),
      )
      .default([]),
  })
  .loose();

export const reportSchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  dimensionScores: z.record(z.string(), z.number()),
  overall: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  feedback: z.string(),
  recommendations: z.array(
    z.object({
      topic: z.string(),
      reason: z.string(),
      resources: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
    }),
  ),
  createdAt: z.string(),
});

export const reportResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('generating') }),
  z.object({ status: z.literal('ready'), report: reportSchema }),
]);

export const progressResponseSchema = z.object({
  skills: z.array(
    z.object({
      skill: z.string(),
      latest: z.number(),
      points: z.array(z.object({ score: z.number(), at: z.string(), interviewId: z.string() })),
    }),
  ),
});

export { SCORE_DIMENSIONS };
