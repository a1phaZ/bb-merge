import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { config } from './config';

export interface YooAmount {
  value: string;
  currency: string;
}

export interface YooPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: YooAmount;
  payment_method?: { id: string; type: string; saved?: boolean };
  confirmation?: { type: string; confirmation_url: string };
  metadata?: Record<string, string>;
  paid_at?: string;
}

export interface CreatePaymentInput {
  amount: number;
  description: string;
  savePaymentMethod?: boolean;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
}

const API_URL = 'https://api.yookassa.ru/v3';

function credentials(): { username: string; password: string } | null {
  if (!config.YOOKASSA_SHOP_ID || !config.YOOKASSA_SECRET_KEY) return null;
  return { username: config.YOOKASSA_SHOP_ID, password: config.YOOKASSA_SECRET_KEY };
}

export function isBillingConfigured(): boolean {
  return Boolean(config.YOOKASSA_SHOP_ID && config.YOOKASSA_SECRET_KEY);
}

function defaultReturnUrl(): string {
  return config.YOOKASSA_RETURN_URL || 'http://localhost:4200/account';
}

export async function createPayment(input: CreatePaymentInput): Promise<YooPayment> {
  const auth = credentials();
  if (!auth) throw new Error('YooKassa is not configured');

  const body: Record<string, unknown> = {
    amount: { value: input.amount.toFixed(2), currency: 'RUB' },
    description: input.description,
    capture: true,
  };

  if (input.metadata) body.metadata = input.metadata;
  if (input.savePaymentMethod) body.save_payment_method = true;
  if (input.paymentMethodId) body.payment_method_id = input.paymentMethodId;
  if (!input.paymentMethodId) {
    body.confirmation = {
      type: 'redirect',
      return_url: input.returnUrl || defaultReturnUrl(),
    };
  }

  const res = await axios.post(`${API_URL}/payments`, body, {
    auth,
    headers: { 'Idempotence-Key': uuid() },
    timeout: 15_000,
  });
  return res.data as YooPayment;
}

export async function getPayment(paymentId: string): Promise<YooPayment> {
  const auth = credentials();
  if (!auth) throw new Error('YooKassa is not configured');

  const res = await axios.get(`${API_URL}/payments/${paymentId}`, {
    auth,
    timeout: 15_000,
  });
  return res.data as YooPayment;
}
