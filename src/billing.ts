import { getStorageProvider } from './storage/factory';
import { User } from './storage/interfaces';
import { YooPayment, createPayment, isBillingConfigured } from './yookassa';

export const PLAN_PRICES: Record<string, number> = {
  pro: 990,
  business: 2990,
};

export const MAX_RETRY_COUNT = 3;

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    plan: user.plan,
    createdAt: user.createdAt,
    subscription: user.subscription || null,
  };
}

export async function applyPaymentSuccess(payment: YooPayment): Promise<void> {
  const userId = payment.metadata?.userId;
  const plan = payment.metadata?.plan;
  if (!userId || !plan || !(plan in PLAN_PRICES)) return;

  const storage = await getStorageProvider();
  const user = await storage.getUser(userId);
  if (!user) return;
  if (user.subscription?.lastPaymentId === payment.id) return;

  const periodStart = payment.paid_at ? new Date(payment.paid_at) : new Date();
  user.plan = plan as 'pro' | 'business';
  user.subscription = {
    plan: plan as 'pro' | 'business',
    status: 'active',
    provider: 'yookassa',
    paymentMethodId: payment.payment_method?.id || user.subscription?.paymentMethodId,
    currentPeriodEnd: addMonths(periodStart, 1).toISOString(),
    lastPaymentId: payment.id,
    retryCount: 0,
  };
  await storage.saveUser(user);
}

export async function downgradeToFree(user: User): Promise<User> {
  const storage = await getStorageProvider();
  const fresh = (await storage.getUser(user.id)) || user;
  fresh.plan = 'free';
  if (fresh.subscription) {
    fresh.subscription.status = 'canceled';
    fresh.subscription.canceledAt = fresh.subscription.canceledAt || new Date().toISOString();
  }
  await storage.saveUser(fresh);
  return fresh;
}

export async function runBillingCycle(): Promise<number> {
  if (!isBillingConfigured()) return 0;

  const storage = await getStorageProvider();
  const users = await storage.getUsers();
  let processed = 0;

  for (const user of users) {
    const sub = user.subscription;
    if (!sub || sub.status === 'canceled') continue;
    if (new Date(sub.currentPeriodEnd).getTime() > Date.now()) continue;

    if (!sub.paymentMethodId) {
      await downgradeToFree(user);
      processed++;
      continue;
    }

    try {
      const payment = await createPayment({
        amount: PLAN_PRICES[sub.plan],
        description: `Merge Request Manager ${sub.plan} plan (auto-renewal)`,
        paymentMethodId: sub.paymentMethodId,
        metadata: { userId: user.id, plan: sub.plan },
      });
      if (payment.status === 'succeeded') {
        await applyPaymentSuccess(payment);
      } else {
        const fresh = (await storage.getUser(user.id)) || user;
        if (fresh.subscription) {
          fresh.subscription.status = 'past_due';
          fresh.subscription.retryCount = (fresh.subscription.retryCount || 0) + 1;
          await storage.saveUser(fresh);
        }
      }
    } catch {
      if ((sub.retryCount || 0) + 1 >= MAX_RETRY_COUNT) {
        await downgradeToFree(user);
      } else {
        sub.status = 'past_due';
        sub.retryCount = (sub.retryCount || 0) + 1;
        await storage.saveUser(user);
      }
    }
    processed++;
  }

  return processed;
}