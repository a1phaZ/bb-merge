import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getStorageProvider } from '../storage/factory';
import { User } from '../storage/interfaces';
import { authenticate, signToken } from '../middleware/auth';
import { getPlanLimits } from '../plans';
import { sanitizeUser } from '../billing';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Display name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email, password, displayName } = parsed.data;
    const storage = await getStorageProvider();
    const existing = await storage.getUserByEmail(email);

    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: uuid(),
      email,
      passwordHash,
      displayName,
      role: 'operator',
      plan: 'free',
      authProvider: 'local',
      createdAt: new Date().toISOString(),
    };

    await storage.saveUser(user);
    const token = signToken({ userId: user.id, email: user.email, role: user.role, plan: user.plan });

    res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email, password } = parsed.data;
    const storage = await getStorageProvider();
    const user = await storage.getUserByEmail(email);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    await storage.saveUser({ ...user, lastLoginAt: new Date().toISOString() });
    const token = signToken({ userId: user.id, email: user.email, role: user.role, plan: user.plan });

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const storage = await getStorageProvider();
    const user = await storage.getUser(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(sanitizeUser(user));
  } catch {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.get('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const storage = await getStorageProvider();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const mrCount = await storage.getUsageCount(req.user!.userId, 'create_mr', startOfMonth);
    const providers = await storage.getProviders();

    const limits = getPlanLimits(req.user!.plan);
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const finite = (v: number): number | null => (Number.isFinite(v) ? v : null);

    res.json({
      plan: req.user!.plan,
      providers: { current: providers.length, limit: finite(limits.providers) },
      mr: { current: mrCount, limit: finite(limits.mrPerMonth) },
      limits: {
        providers: finite(limits.providers),
        mrPerMonth: finite(limits.mrPerMonth),
        historyDays: finite(limits.historyDays),
        templates: limits.templates,
        webhooks: limits.webhooks,
      },
      resetDate,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

export default router;
