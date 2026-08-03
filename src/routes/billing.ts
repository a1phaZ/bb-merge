import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, signToken } from '../middleware/auth';
import { getStorageProvider } from '../storage/factory';
import { getPayment, createPayment, isBillingConfigured } from '../yookassa';
import { PLAN_PRICES, applyPaymentSuccess, sanitizeUser } from '../billing';

const router = Router();

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'business']),
});

function baseReturnUrl(): string {
  return process.env.YOOKASSA_RETURN_URL || 'http://localhost:4200/account';
}

router.post('/checkout', authenticate, async (req: Request, res: Response) => {
  try {
    if (!isBillingConfigured()) {
      res.status(503).json({ error: 'Billing is not configured' });
      return;
    }
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { plan } = parsed.data;

    const storage = await getStorageProvider();
    const user = await storage.getUser(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (user.plan === plan && user.subscription?.status === 'active') {
      res.status(409).json({ error: 'Already subscribed to this plan' });
      return;
    }

    const payment = await createPayment({
      amount: PLAN_PRICES[plan],
      description: `Merge Request Manager ${plan} plan`,
      savePaymentMethod: true,
      metadata: { userId: user.id, plan },
      returnUrl: `${baseReturnUrl()}?billing=success&plan=${plan}`,
    });

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      res.status(500).json({ error: 'Could not start payment' });
      return;
    }
    res.json({ confirmationUrl, paymentId: payment.id });
  } catch {
    res.status(500).json({ error: 'Failed to start payment' });
  }
});

router.get('/confirm', authenticate, async (req: Request, res: Response) => {
  try {
    const paymentId = req.query.paymentId as string | undefined;
    if (!paymentId) {
      res.status(400).json({ error: 'paymentId is required' });
      return;
    }
    const payment = await getPayment(paymentId);
    if (payment.status !== 'succeeded') {
      res.status(400).json({ error: 'Payment has not succeeded yet', status: payment.status });
      return;
    }

    await applyPaymentSuccess(payment);

    const storage = await getStorageProvider();
    const user = await storage.getUser(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role, plan: user.plan });
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

router.post('/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const storage = await getStorageProvider();
    const user = await storage.getUser(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!user.subscription || user.subscription.status === 'canceled') {
      res.status(400).json({ error: 'No active subscription' });
      return;
    }
    user.subscription.status = 'canceled';
    user.subscription.canceledAt = new Date().toISOString();
    await storage.saveUser(user);
    res.json({ subscription: user.subscription });
  } catch {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const evt = req.body as {
      event?: string;
      object?: { id: string };
    };

    const paymentId = evt?.object?.id;
    if (!paymentId) {
      res.status(400).json({ error: 'Missing payment id' });
      return;
    }
    if (evt.event === 'payment.succeeded') {
      const payment = await getPayment(paymentId);
      if (payment.status === 'succeeded') {
        await applyPaymentSuccess(payment);
      }
    }
    res.json({});
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;