import { Request, Response, NextFunction } from 'express';
import { getPlanLimits } from '../plans';

export type PlanFeature = 'templates' | 'webhooks';

const FEATURE_MESSAGES: Record<PlanFeature, string> = {
  templates: 'Templates are available on Pro and higher plans.',
  webhooks: 'Webhook registration is available on Pro and higher plans.',
};

export function requireFeature(feature: PlanFeature) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (getPlanLimits(req.user.plan)[feature]) {
      next();
      return;
    }

    res.status(403).json({
      error: `Feature not available on ${req.user.plan} plan`,
      message: FEATURE_MESSAGES[feature],
      plan: req.user.plan,
    });
  };
}
