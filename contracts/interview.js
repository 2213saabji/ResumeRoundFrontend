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
    objectiveKind: z.string().optional(),
    isFollowUp: z.boolean().optional(),
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

/** Progress object returned by start, answers and GET /interviews/:id (section 7.4). */
export const interviewProgressSchema = z.object({
  objectiveIdx: z.number(),
  objectiveCount: z.number(),
  objectiveKind: z.string(),
  questionsAsked: z.number(),
  elapsedSec: z.number(),
  remainingSec: z.number(),
});

/** The open question. */
export const currentTurnSchema = z.object({
  seq: z.number(),
  objectiveIdx: z.number(),
  objectiveKind: z.string(),
  questionText: z.string(),
  isFollowUp: z.boolean(),
  askedAt: z.string(),
});

/** POST /interviews/:id/start */
export const startResponseSchema = z.object({
  interview: interviewSchema,
  progress: interviewProgressSchema,
  currentTurn: currentTurnSchema.nullable(),
});

/**
 * GET /interviews/:id. progress and currentTurn sit next to interview (same shape as start);
 * they are null before start / after the end, and absent on servers without the text loop.
 */
export const interviewSessionResponseSchema = z.object({
  interview: interviewSchema,
  progress: interviewProgressSchema.nullable().optional(),
  currentTurn: currentTurnSchema.nullable().optional(),
});

/** POST /interviews/:id/answers; currentTurn null + closingMessage when the interview ended. */
export const answerResponseSchema = z.object({
  interview: interviewSchema.partial().extend({ status: z.enum(INTERVIEW_STATUSES) }),
  progress: interviewProgressSchema,
  currentTurn: currentTurnSchema.nullable(),
  closingMessage: z.string().nullable(),
});

export const textAnswerInputSchema = z.object({
  seq: z.number().int().positive(),
  answerText: z
    .string()
    .trim()
    .min(1, 'Type an answer first')
    .max(ANSWER_MAX_CHARS, `Keep answers under ${ANSWER_MAX_CHARS} characters`),
});

/**
 * POST /interviews/:id/join (MVP-4, guide section 7.6). captionRoom is still marked "proposed"
 * by the backend; extras are tolerated. Every field is a per-session secret: never log it.
 */
export const joinResponseSchema = z
  .object({
    wsUrl: z.string(),
    token: z.string(),
    room: z.union([z.number(), z.string()]),
    pin: z.string().optional(),
    captionRoom: z.union([z.number(), z.string()]).optional(),
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

/** Only dimensions the interview gave evidence for are present; a missing one is not a 0. */
export const reportSchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  dimensionScores: z.record(z.string(), z.number()),
  overall: z.number(),
  questionsAnswered: z.number().optional(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  feedback: z.string(),
  recommendations: z.array(
    z.object({
      topic: z.string(),
      reason: z.string(),
      // url is always null for now (model-generated links are often invented).
      resources: z.array(z.object({ title: z.string(), url: z.string().nullable() })).default([]),
    }),
  ),
  createdAt: z.string(),
});

/**
 * GET /interviews/:id/report. Branch on status, not the HTTP code: ready, insufficient_answers
 * and failed are all 200 and final; generating is 202.
 */
export const reportResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('generating') }),
  z.object({ status: z.literal('ready'), report: reportSchema }),
  z.object({ status: z.literal('insufficient_answers'), message: z.string() }),
  z.object({ status: z.literal('failed'), message: z.string() }),
]);

/** Oldest first, ready for charts. */
const trendPointSchema = z.object({ score: z.number(), at: z.string(), interviewId: z.string() });

export const progressResponseSchema = z.object({
  /** One point per interview that has a report. */
  overall: z.array(trendPointSchema).default([]),
  dimensions: z
    .array(
      z.object({ dimension: z.string(), latest: z.number(), points: z.array(trendPointSchema) }),
    )
    .default([]),
  skills: z.array(
    z.object({ skill: z.string(), latest: z.number(), points: z.array(trendPointSchema) }),
  ),
});

export { SCORE_DIMENSIONS };
