import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PricingComponent } from './pricing.component';
import { AuthService } from '../../core/services/auth.service';

describe('PricingComponent', () => {
  let fixture: ComponentFixture<PricingComponent>;
  let authMock: any;

  async function createComponent(plan: string, extra: Record<string, any> = {}) {
    authMock = {
      user: signal({ id: 'u1', email: 'a@b.c', displayName: 'A', role: 'operator', plan }),
      canUseFeature: vi.fn((f: string) => plan !== 'free'),
      startCheckout: vi.fn(),
      ...extra,
    };
    await TestBed.configureTestingModule({
      imports: [PricingComponent],
      providers: [
        provideTranslateService(),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
  }

  function card(planKey: string): HTMLElement {
    const cards = fixture.nativeElement.querySelectorAll('.plan-card');
    return Array.from(cards).find((c: HTMLElement) => c.textContent.includes(planKey)) as HTMLElement;
  }

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders all four plans', async () => {
    await createComponent('free');
    const cards = fixture.nativeElement.querySelectorAll('.plan-card');
    expect(cards.length).toBe(4);
  });

  it('marks the current plan', async () => {
    await createComponent('free');
    const freeCard = fixture.nativeElement.querySelector('.plan-card.current');
    expect(freeCard).toBeTruthy();
    expect(fixture.componentInstance.isCurrent('free')).toBe(true);
    expect(fixture.componentInstance.isCurrent('pro')).toBe(false);
  });

  it('renders feature values for each plan', async () => {
    await createComponent('pro');
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('∞');
    expect(el.textContent).toContain('100');
  });

  it('renders prices and periods', async () => {
    await createComponent('pro');
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('$9');
    expect(el.textContent).toContain('$299');
    expect(el.textContent).toContain('$0');
  });

  it('starts checkout when upgrading to a paid plan', async () => {
    const startCheckout = vi.fn().mockReturnValue(of({
      confirmationUrl: 'https://yoomoney.ru/checkout/pay_1',
      paymentId: 'pay_1',
    }));
    await createComponent('free', { startCheckout });

    const btn = card('plan.pro').querySelector('button')!;
    expect(btn.disabled).toBe(false);
    btn.click();
    await fixture.whenStable();

    expect(startCheckout).toHaveBeenCalledWith('pro');
    expect(sessionStorage.getItem('mr_payment_id')).toBe('pay_1');
  });

  it('keeps self-hosted plan locked', async () => {
    await createComponent('free');
    const btn = card('plan.selfHosted').querySelector('button')!;
    expect(btn.disabled).toBe(true);
  });

  it('keeps the current plan button disabled', async () => {
    await createComponent('free');
    const btn = card('plan.free').querySelector('button')!;
    expect(btn.disabled).toBe(true);
  });

  it('shows an error when checkout fails', async () => {
    await createComponent('free', { startCheckout: vi.fn(() => throwError(() => new Error('boom'))) });

    card('plan.pro').querySelector('button')!.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('pricing.checkoutError');
  });
});
