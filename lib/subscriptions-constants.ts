export const getCurrentBillingPeriodStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
};

// Subscription plan limits
export const PLAN_LIMITS = {
  free: {
    maxBooks: 1,
    maxSessionsPerMonth: 5,
    maxSessionDurationMinutes: 5,
    hasSessionHistory: false,
  },
  standard: {
    maxBooks: 10,
    maxSessionsPerMonth: 100,
    maxSessionDurationMinutes: 15,
    hasSessionHistory: true,
  },
  pro: {
    maxBooks: 100,
    maxSessionsPerMonth: -1, // unlimited
    maxSessionDurationMinutes: 60,
    hasSessionHistory: true,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
export type PlanLimits = (typeof PLAN_LIMITS)[PlanType];
