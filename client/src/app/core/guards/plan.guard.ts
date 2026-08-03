import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export type PlanFeature = 'templates' | 'webhooks';

export function planGuard(feature: PlanFeature) {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.parseUrl('/login');
    }

    if (auth.canUseFeature(feature)) {
      return true;
    }

    return router.parseUrl('/pricing');
  };
}
