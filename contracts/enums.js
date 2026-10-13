/**
 * Shared domain vocabulary. Mirrors backend src/common/domain.ts; keep the two in sync.
 */

export const TARGET_ROLES = /** @type {const} */ (['backend', 'frontend', 'fullstack']);
export const LEVELS = /** @type {const} */ (['sde1', 'sde2', 'senior', 'staff']);
export const COMPANY_TYPES = /** @type {const} */ ([
  'startup',
  'product',
  'faang_style',
  'service',
]);
export const INTERVIEW_DURATIONS = /** @type {const} */ ([5, 15, 30, 45]);
export const INTERVIEW_MODES = /** @type {const} */ (['voice', 'text']);

export const SCORE_DIMENSIONS = /** @type {const} */ ([
  'technical_knowledge',
  'problem_solving',
  'system_design',
  'communication',
  'depth',
  'production_thinking',
]);

export const PLAN_KINDS = /** @type {const} */ ([
  'warmup',
  'project_deep_dive',
  'fundamentals',
  'system_design',
  'scaling_scenario',
  'production_debugging',
  'behavioral',
]);

export const SKILL_BUCKETS = /** @type {const} */ ([
  'languages',
  'frameworks',
  'databases',
  'cloud',
  'architecture',
]);

/** UI labels for enum values. */
export const LABELS = {
  targetRole: { backend: 'Backend', frontend: 'Frontend', fullstack: 'Full Stack' },
  level: { sde1: 'SDE-1', sde2: 'SDE-2', senior: 'Senior', staff: 'Staff' },
  companyType: {
    startup: 'Startup',
    product: 'Product company',
    faang_style: 'FAANG-style',
    service: 'Service company',
  },
  mode: { voice: 'Voice call', text: 'Text only' },
  planKind: {
    warmup: 'Warm-up',
    project_deep_dive: 'Project deep dive',
    fundamentals: 'Fundamentals',
    system_design: 'System design',
    scaling_scenario: 'Scaling scenario',
    production_debugging: 'Production debugging',
    behavioral: 'Behavioral',
  },
  dimension: {
    technical_knowledge: 'Technical knowledge',
    problem_solving: 'Problem solving',
    system_design: 'System design',
    communication: 'Communication',
    depth: 'Depth',
    production_thinking: 'Production thinking',
  },
  skillBucket: {
    languages: 'Languages',
    frameworks: 'Frameworks',
    databases: 'Databases',
    cloud: 'Cloud & DevOps',
    architecture: 'Architecture',
  },
};

/**
 * @param {keyof typeof LABELS} group
 * @param {string | null | undefined} value
 */
export function labelFor(group, value) {
  if (value == null) return '';
  return LABELS[group]?.[value] ?? value;
}
