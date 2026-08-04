import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { PricingComponent } from './pricing.component';
import { AuthService } from '../../core/services/auth.service';

describe('PricingComponent', () => {
  let fixture: ComponentFixture<PricingComponent>;
  let authMock: any;

  async function createComponent(plan: string) {
    authMock = {
      user: signal({ id: 'u1', email: 'a@b.c', displayName: 'A', role: 'operator', plan }),
      canUseFeature: vi.fn((f: string) => plan !== 'free'),
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
});
