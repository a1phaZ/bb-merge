export type Plan = 'free' | 'pro' | 'business' | 'self-hosted';

export interface PlanLimits {
  providers: number;
  mrPerMonth: number;
  historyDays: number;
  templates: boolean;
  webhooks: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  'free': { providers: 1, mrPerMonth: 3, historyDays: 7, templates: false, webhooks: false },
  'pro': { providers: 5, mrPerMonth: 100, historyDays: 90, templates: true, webhooks: true },
  'business': { providers: Infinity, mrPerMonth: 1000, historyDays: Infinity, templates: true, webhooks: true },
  'self-hosted': { providers: Infinity, mrPerMonth: Infinity, historyDays: Infinity, templates: true, webhooks: true },
};

export const PLAN_ORDER: Plan[] = ['free', 'pro', 'business', 'self-hosted'];

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as Plan] || PLAN_LIMITS['free'];
}
